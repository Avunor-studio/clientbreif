-- Each workspace gets one trial. Only the operator can approve a new pilot term.
create table private.workspace_plans (
  org_id text primary key,
  plan text not null default 'trial' check (plan in ('trial','pilot')),
  term_start timestamptz not null default now(),
  term_end timestamptz not null default now() + interval '14 days',
  requested_at timestamptz,
  check (term_end > term_start)
);

-- Preserve the usage ledger through recording/meeting deletion.
create table private.recording_usage (
  run_id uuid primary key,
  org_id text not null references private.workspace_plans(org_id),
  term_start timestamptz not null,
  seconds integer not null check (seconds > 0),
  settled boolean not null default false
);
create index recording_usage_period on private.recording_usage(org_id,term_start);
alter table private.workspace_plans enable row level security;
alter table private.recording_usage enable row level security;
revoke all on private.workspace_plans, private.recording_usage from public, anon, authenticated;
grant select, insert, update on private.workspace_plans to service_role;
grant select, insert, update, delete on private.recording_usage to service_role;

create function public.recording_allowance(p_org text, p_seconds integer default 0)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  plan_row private.workspace_plans;
  used integer;
  held integer;
  capacity integer;
  remaining integer;
begin
  if nullif(trim(p_org),'') is null or p_seconds is null or p_seconds < 0 then
    raise exception 'Invalid workspace or recording duration';
  end if;
  insert into private.workspace_plans(org_id) values(p_org) on conflict do nothing;
  select * into strict plan_row from private.workspace_plans where org_id=p_org for update;
  capacity := case when plan_row.plan='pilot' then 36000 else 3600 end;
  select coalesce(sum(seconds) filter (where settled),0), coalesce(sum(seconds) filter (where not settled),0)
    into used,held from private.recording_usage where org_id=p_org and term_start=plan_row.term_start;
  remaining := case when now() >= plan_row.term_end then 0 else greatest(0,capacity-used-held) end;
  if p_seconds > remaining then
    raise sqlstate 'PT402' using message='This recording exceeds your workspace allowance. Open Settings to see usage and request pilot access.';
  end if;
  return jsonb_build_object('plan',plan_row.plan,'endsAt',plan_row.term_end,'limitSeconds',capacity,
    'usedSeconds',used,'reservedSeconds',held,'remainingSeconds',remaining,'requested',plan_row.requested_at is not null);
end $$;

create function public.request_pilot_access(p_org text) returns void
language plpgsql security invoker set search_path='' as $$
begin
  perform public.recording_allowance(p_org);
  update private.workspace_plans set requested_at=coalesce(requested_at,now()) where org_id=p_org;
end $$;

-- Operator-only, idempotent when retried with the same request timestamp.
create function private.approve_pilot(p_org text, p_request timestamptz) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
  update private.workspace_plans set plan='pilot',term_start=clock_timestamp(),
    term_end=clock_timestamp()+interval '1 month',requested_at=null
    where org_id=p_org and requested_at=p_request;
  return found;
end $$;

create function private.meter_transcription() returns trigger
language plpgsql security invoker set search_path='' as $$
declare duration integer;
begin
  if tg_op='INSERT' then
    select ceil(duration_seconds)::integer into duration from public.meetings
      where id=new.meeting_id and organization_id=new.organization_id;
    -- Older imports with missing duration reserve the full single-recording limit.
    duration := coalesce(duration,3600);
    if duration < 1 or duration > 3600 then raise exception 'Invalid recording duration'; end if;
    perform public.recording_allowance(new.organization_id,duration);
    insert into private.recording_usage(run_id,org_id,term_start,seconds)
      select new.id,org_id,term_start,duration from private.workspace_plans where org_id=new.organization_id;
  elsif new.status='completed' then
    -- commit_transcript has already saved the authoritative provider duration.
    update private.recording_usage u set seconds=greatest(1,ceil(m.duration_seconds)::integer),settled=true
      from public.meetings m where u.run_id=new.id and m.id=new.meeting_id and not u.settled;
  elsif new.status in ('failed','cancelled') then
    delete from private.recording_usage where run_id=new.id and not settled;
  end if;
  return new;
end $$;
create trigger reserve_recording_usage after insert on public.processing_runs
  for each row when (new.kind='transcribe' and new.status='active') execute function private.meter_transcription();
create trigger settle_recording_usage after update of status on public.processing_runs
  for each row when (new.kind='transcribe' and old.status='active' and new.status<>old.status) execute function private.meter_transcription();

revoke all on function public.recording_allowance(text,integer), public.request_pilot_access(text),
  private.approve_pilot(text,timestamptz), private.meter_transcription() from public, anon, authenticated;
grant execute on function public.recording_allowance(text,integer), public.request_pilot_access(text), private.meter_transcription() to service_role;
revoke all on function private.approve_pilot(text,timestamptz) from service_role;
