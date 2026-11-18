-- Intake responses are immutable. Only server-authorized operations may write.
create table public.intake_links (
 id uuid primary key default gen_random_uuid(), organization_id text not null, project_id uuid not null,
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz not null default now()+interval '7 days', revoked_at timestamptz,
 created_at timestamptz not null default now(), unique(id,project_id,organization_id),
 foreign key(project_id,organization_id) references public.projects(id,organization_id) on delete cascade
);
create table public.intake_responses (
 id uuid primary key default gen_random_uuid(), organization_id text not null, project_id uuid not null,
 link_id uuid not null unique, name text not null, email text not null, answers jsonb not null,
 created_at timestamptz not null default now(), unique(id,project_id,organization_id), unique(id,organization_id),
 check(jsonb_typeof(answers)='object'), check(octet_length(answers::text)<=40000),
 foreign key(link_id,project_id,organization_id) references public.intake_links(id,project_id,organization_id) on delete cascade
);
create table public.project_runs (
 id uuid primary key default gen_random_uuid(), organization_id text not null, project_id uuid not null,
 kind text not null check(kind in ('intake_prep','scope_check')),
 status text not null default 'active' check(status in ('active','completed','failed','cancelled')),
 intake_response_id uuid, meeting_id uuid, baseline_version_id uuid, transcript_revision integer,
 input_key text not null, workflow_id text, result jsonb, error text,
 created_at timestamptz not null default now(), finished_at timestamptz, unique(id,organization_id),
 foreign key(project_id,organization_id) references public.projects(id,organization_id) on delete cascade,
 foreign key(intake_response_id,project_id,organization_id) references public.intake_responses(id,project_id,organization_id) on delete cascade,
 foreign key(meeting_id,organization_id) references public.meetings(id,organization_id) on delete cascade,
 foreign key(baseline_version_id,organization_id) references public.output_versions(id,organization_id) on delete cascade,
 check((kind='intake_prep' and intake_response_id is not null and meeting_id is null and baseline_version_id is null)
    or (kind='scope_check' and intake_response_id is null and meeting_id is not null and baseline_version_id is not null and transcript_revision is not null))
);
create table public.scope_changes (
 id uuid primary key default gen_random_uuid(), organization_id text not null, project_id uuid not null,
 run_id uuid not null, meeting_id uuid not null, baseline_version_id uuid not null,
 suggestion jsonb not null, source_segments jsonb not null, baseline_items jsonb not null,
 status text not null default 'pending' check(status in ('pending','confirmed','dismissed','needs_clarification')),
 review_note text not null default '', budget_impact text not null default '', timeline_impact text not null default '',
 revision integer not null default 0, reviewed_by text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(run_id,organization_id) references public.project_runs(id,organization_id) on delete cascade,
 foreign key(project_id,organization_id) references public.projects(id,organization_id) on delete cascade,
 foreign key(meeting_id,organization_id) references public.meetings(id,organization_id) on delete cascade,
 foreign key(baseline_version_id,organization_id) references public.output_versions(id,organization_id) on delete cascade
);
alter table public.processing_runs add column intake_response_id uuid references public.intake_responses(id);
create index processing_intake on public.processing_runs(intake_response_id) where intake_response_id is not null;
create index intake_links_project on public.intake_links(project_id,organization_id);
create index intake_responses_link on public.intake_responses(link_id,project_id,organization_id);
create index intake_responses_project on public.intake_responses(project_id,organization_id,created_at desc);
create index project_runs_project on public.project_runs(project_id,organization_id,created_at desc);
create index project_runs_intake on public.project_runs(intake_response_id,project_id,organization_id);
create index project_runs_meeting on public.project_runs(meeting_id,organization_id);
create index project_runs_baseline on public.project_runs(baseline_version_id,organization_id);
create index project_runs_active on public.project_runs(organization_id) where status='active';
create unique index project_runs_dedupe on public.project_runs(organization_id,input_key) where status in ('active','completed');
create index changes_project on public.scope_changes(project_id,organization_id,created_at desc);
create index changes_run on public.scope_changes(run_id,organization_id);
create index changes_meeting on public.scope_changes(meeting_id,organization_id);
create index changes_baseline on public.scope_changes(baseline_version_id,organization_id);

do $$ declare t text; begin
 foreach t in array array['intake_links','intake_responses','project_runs','scope_changes'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
 foreach t in array array['intake_links','intake_responses'] loop
 execute format('create policy tenant_read on public.%I for select to authenticated using(organization_id=(select private.org_id()))',t);
 end loop;
 foreach t in array array['project_runs','scope_changes'] loop
 execute format('create policy tenant_read on public.%I for select to authenticated using(organization_id=(select private.org_id()) and (meeting_id is null or exists(select 1 from public.meetings m where m.id=meeting_id and m.deleted_at is null)) and (baseline_version_id is null or exists(select 1 from public.output_versions v where v.id=baseline_version_id)))',t);
 end loop;
end $$;

create function public.submit_intake(p_hash text,p_name text,p_email text,p_answers jsonb) returns uuid
language plpgsql set search_path='' as $$
declare l public.intake_links; response_id uuid;
begin
 select * into l from public.intake_links where token_hash=p_hash for update;
 if l.id is null or l.revoked_at is not null or l.expires_at<=now() then raise exception 'Intake link expired or unavailable'; end if;
 select id into response_id from public.intake_responses where link_id=l.id;
 if response_id is not null then return response_id; end if;
 insert into public.intake_responses(organization_id,project_id,link_id,name,email,answers)
 values(l.organization_id,l.project_id,l.id,p_name,p_email,p_answers) returning id into response_id;
 return response_id;
end $$;

-- Share the existing two-job limit with project AI work, using the same org lock.
create or replace function public.claim_run(p_org text,p_meeting uuid,p_kind text) returns jsonb
language plpgsql set search_path='' as $$
declare m public.meetings; r public.processing_runs;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_org,0));
 select * into m from public.meetings where id=p_meeting and organization_id=p_org for update;
 if m.id is null or m.deleted_at is not null or m.cleanup_status in ('pending','failed') then raise exception 'Meeting unavailable'; end if;
 select * into r from public.processing_runs where meeting_id=p_meeting and status='active';
 if r.id is not null then return to_jsonb(r); end if;
 if (select count(*) from public.processing_runs where organization_id=p_org and status='active')+
    (select count(*) from public.project_runs where organization_id=p_org and status='active')>=2 then raise exception 'Two jobs are already processing. Try again when one finishes.'; end if;
 if p_kind='generate' and m.transcript_revision=0 then raise exception 'Transcript not ready'; end if;
 if p_kind='transcribe' and (m.recording_deleted or m.transcript_revision>0) then raise exception 'Recording unavailable or already transcribed'; end if;
 insert into public.processing_runs(organization_id,meeting_id,kind,transcript_revision) values(p_org,p_meeting,p_kind,m.transcript_revision) returning * into r;
 update public.meetings set status=case when p_kind='transcribe' then 'transcribing' else 'generating' end,error=null where id=p_meeting;
 return to_jsonb(r);
end $$;

create function public.claim_generation(p_org text,p_meeting uuid,p_intake uuid default null) returns jsonb
language plpgsql set search_path='' as $$
declare r jsonb; old_run public.processing_runs;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_org,0));
 if p_intake is not null and not exists(select 1 from public.intake_responses i join public.meetings m on m.project_id=i.project_id and m.organization_id=i.organization_id where i.id=p_intake and m.id=p_meeting and i.organization_id=p_org) then raise exception 'Intake unavailable for this project'; end if;
 select * into old_run from public.processing_runs where meeting_id=p_meeting and organization_id=p_org and status='active';
 if old_run.id is not null and (old_run.kind<>'generate' or old_run.intake_response_id is distinct from p_intake) then raise exception 'Wait for the current processing stage to finish'; end if;
 r:=public.claim_run(p_org,p_meeting,'generate');
 update public.processing_runs set intake_response_id=p_intake where id=(r->>'id')::uuid returning to_jsonb(processing_runs.*) into r;
 return r;
end $$;

create function public.claim_project_run(p_org text,p_project uuid,p_kind text,p_intake uuid default null,p_meeting uuid default null,p_baseline uuid default null) returns jsonb
language plpgsql set search_path='' as $$
declare r public.project_runs; m public.meetings; v public.output_versions; key text;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_org,0));
 if not exists(select 1 from public.projects where id=p_project and organization_id=p_org) then raise exception 'Project unavailable'; end if;
 if p_kind='intake_prep' then
   if not exists(select 1 from public.intake_responses where id=p_intake and project_id=p_project and organization_id=p_org) then raise exception 'Intake unavailable'; end if;
   key:='prep:'||p_intake::text;
 elsif p_kind='scope_check' then
   select * into v from public.output_versions where id=p_baseline and organization_id=p_org;
   perform 1 from public.meetings where id in (p_meeting,v.meeting_id) order by id for update;
   select * into m from public.meetings where id=p_meeting and organization_id=p_org and project_id=p_project and deleted_at is null;
   if m.id is null or m.transcript_revision=0 then raise exception 'Transcript not ready'; end if;
   if v.id is null or v.meeting_id=m.id or not exists(select 1 from public.meetings where id=v.meeting_id and project_id=p_project and deleted_at is null) then raise exception 'Approved baseline unavailable for this project'; end if;
   if not exists(select 1 from public.review_links l join public.review_responses x on x.link_id=l.id where l.version_id=v.id and x.decision='approved') then raise exception 'Choose an approved brief version'; end if;
   key:='scope:'||m.id::text||':'||m.transcript_revision::text||':'||v.id::text;
 else raise exception 'Unknown project job'; end if;
 select * into r from public.project_runs where organization_id=p_org and input_key=key and status in ('active','completed');
 if r.id is not null then return to_jsonb(r); end if;
 if (select count(*) from public.processing_runs where organization_id=p_org and status='active')+
    (select count(*) from public.project_runs where organization_id=p_org and status='active')>=2 then raise exception 'Two jobs are already processing. Try again when one finishes.'; end if;
 insert into public.project_runs(organization_id,project_id,kind,intake_response_id,meeting_id,baseline_version_id,transcript_revision,input_key)
 values(p_org,p_project,p_kind,p_intake,p_meeting,p_baseline,m.transcript_revision,key) returning * into r;
 return to_jsonb(r);
end $$;

create function public.commit_project_run(p_run uuid,p_result jsonb) returns boolean
language plpgsql set search_path='' as $$
declare r public.project_runs; m public.meetings; baseline public.output_versions; item jsonb;
begin
 select * into r from public.project_runs where id=p_run;
 if r.id is null then return false; end if;
 if r.kind='scope_check' then
   select * into baseline from public.output_versions where id=r.baseline_version_id;
   perform 1 from public.meetings where id in (r.meeting_id,baseline.meeting_id) order by id for update;
   select * into m from public.meetings where id=r.meeting_id;
   if m.id is null or m.deleted_at is not null or baseline.id is null or not exists(select 1 from public.meetings where id=baseline.meeting_id and deleted_at is null) then raise exception 'Scope check cancelled: meeting unavailable'; end if;
   if m.transcript_revision<>r.transcript_revision then raise exception 'Transcript changed. Run the comparison again.'; end if;
 end if;
 select * into r from public.project_runs where id=p_run for update;
 if r.status='completed' then return true; end if;
 if r.status<>'active' then return false; end if;
 if r.kind='scope_check' then
   for item in select * from jsonb_array_elements(p_result->'changes') loop
     insert into public.scope_changes(organization_id,project_id,run_id,meeting_id,baseline_version_id,suggestion,source_segments,baseline_items)
     values(r.organization_id,r.project_id,r.id,r.meeting_id,r.baseline_version_id,item->'suggestion',item->'source_segments',item->'baseline_items');
   end loop;
 end if;
 update public.project_runs set status='completed',result=p_result,error=null,finished_at=now() where id=p_run;
 return true;
end $$;

-- Tombstoning a meeting immediately cancels new project work; cleanup removes snapshots too.
create function private.cancel_project_work() returns trigger language plpgsql set search_path='' as $$
begin
 if new.deleted_at is not null and old.deleted_at is null then
  update public.project_runs set status='cancelled',finished_at=now() where status='active' and
   (meeting_id=new.id or baseline_version_id in(select id from public.output_versions where meeting_id=new.id));
 end if;
 return new;
end $$;
create trigger cancel_project_work after update of deleted_at on public.meetings for each row execute function private.cancel_project_work();

revoke all on function public.submit_intake(text,text,text,jsonb),public.claim_generation(text,uuid,uuid),public.claim_project_run(text,uuid,text,uuid,uuid,uuid),public.commit_project_run(uuid,jsonb),private.cancel_project_work() from public,anon,authenticated;
grant execute on function public.submit_intake(text,text,text,jsonb),public.claim_generation(text,uuid,uuid),public.claim_project_run(text,uuid,text,uuid,uuid,uuid),public.commit_project_run(uuid,jsonb) to service_role;
