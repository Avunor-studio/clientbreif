create table private.api_rate_windows (
  subject_hash text not null check (subject_hash ~ '^[a-f0-9]{64}$'),
  bucket text not null,
  expires_at timestamptz not null,
  hits integer not null check (hits > 0),
  primary key (subject_hash, bucket)
);
create index api_rate_windows_expiry on private.api_rate_windows (expires_at);
alter table private.api_rate_windows enable row level security;
revoke all on private.api_rate_windows from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on private.api_rate_windows to service_role;

-- The caller can only consume an allowance. Limits and time come from the database.
create function public.consume_api_budget(p_subject text, p_bucket text) returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  quota integer;
  duration interval := interval '1 minute';
  observed timestamptz := clock_timestamp();
  expiry timestamptz;
begin
  case p_bucket
    when 'api' then quota := 120;
    when 'processing' then quota := 10; duration := interval '1 hour';
    when 'visitor' then quota := 30;
    when 'record_write' then quota := 60;
    else raise exception 'Unknown rate limit bucket';
  end case;

  insert into private.api_rate_windows as w (subject_hash, bucket, hits, expires_at)
    values (p_subject, p_bucket, 1, observed + duration)
    on conflict (subject_hash, bucket) do update set
      hits = case when w.expires_at <= observed then 1 else w.hits + 1 end,
      expires_at = case when w.expires_at <= observed then observed + duration else w.expires_at end
    where w.expires_at <= observed or w.hits < quota
    returning expires_at into expiry;
  if not found then
    select expires_at into strict expiry from private.api_rate_windows
      where subject_hash = p_subject and bucket = p_bucket;
    return greatest(1, ceil(extract(epoch from expiry - observed))::integer);
  end if;

  -- Bound cleanup work even after a long period of inactivity.
  if random() < 0.01 then
    delete from private.api_rate_windows where (subject_hash, bucket) in (
      select subject_hash, bucket from private.api_rate_windows
      where expires_at < observed - interval '1 day'
      order by expires_at limit 100 for update skip locked
    );
  end if;
  return 0;
end $$;
revoke all on function public.consume_api_budget(text,text) from public, anon, authenticated;
grant execute on function public.consume_api_budget(text,text) to service_role;

-- Clients and projects also allow user-JWT writes through the Supabase Data API.
create function private.meter_record_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  subject text := nullif(auth.jwt()->>'sub', '');
begin
  if subject is null then raise insufficient_privilege; end if;
  if public.consume_api_budget(encode(sha256(convert_to(subject, 'UTF8')), 'hex'), 'record_write') > 0 then
    raise sqlstate 'PT429' using message = 'Too many client or project edits. Try again in a minute.';
  end if;
  return new;
end $$;
revoke all on function private.meter_record_write() from public, anon, authenticated;
create trigger meter_client_write before insert or update on public.clients
  for each row when (current_user = 'authenticated') execute function private.meter_record_write();
create trigger meter_project_write before insert or update on public.projects
  for each row when (current_user = 'authenticated') execute function private.meter_record_write();
