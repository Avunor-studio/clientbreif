-- Clerk v2 session tokens; no Supabase user synchronization required.
create schema if not exists private;
create function private.org_id() returns text language sql stable set search_path='' as $$ select auth.jwt()->'o'->>'id' $$;
create function private.is_admin() returns boolean language sql stable set search_path='' as $$ select coalesce(auth.jwt()->'o'->>'rol'='admin',false) $$;
grant usage on schema private to authenticated;
grant execute on function private.org_id(), private.is_admin() to authenticated;

create table public.clients (
 id uuid primary key default gen_random_uuid(), organization_id text not null,
 name text not null check(length(name) between 1 and 150), contact_email text,
 created_at timestamptz not null default now(), unique(id,organization_id)
);
create table public.projects (
 id uuid primary key default gen_random_uuid(), organization_id text not null, client_id uuid not null,
 name text not null check(length(name) between 1 and 150), description text not null default '',
 created_at timestamptz not null default now(), unique(id,organization_id),
 foreign key(client_id,organization_id) references public.clients(id,organization_id)
);
create table public.meetings (
 id uuid primary key default gen_random_uuid(), organization_id text not null, project_id uuid not null,
 title text not null, status text not null default 'uploading' check(status in ('uploading','transcribing','transcript_ready','generating','ready','failed')),
 recording_path text, recording_deleted boolean not null default false,
 cleanup_status text not null default 'none', cleanup_error text, deleted_at timestamptz,
 mime_type text not null, bytes bigint not null, duration_seconds numeric, provider_id text,
 transcript_revision integer not null default 0, error text, created_at timestamptz not null default now(),
 unique(id,organization_id), foreign key(project_id,organization_id) references public.projects(id,organization_id)
);
create table public.transcript_segments (
 id uuid primary key default gen_random_uuid(), organization_id text not null, meeting_id uuid not null,
 speaker text not null, start_ms integer not null check(start_ms>=0), end_ms integer not null, text text not null,
 check(end_ms>=start_ms), unique(id,organization_id), foreign key(meeting_id,organization_id) references public.meetings(id,organization_id) on delete cascade
);
create table public.output_versions (
 id uuid primary key default gen_random_uuid(), organization_id text not null, meeting_id uuid not null,
 content jsonb not null, transcript_revision integer not null, created_by text not null,
 created_at timestamptz not null default now(), unique(id,organization_id),
 foreign key(meeting_id,organization_id) references public.meetings(id,organization_id) on delete cascade
);
create table public.tasks (
 id uuid not null, version_id uuid not null, organization_id text not null, description text not null,
 owner text, deadline date, completed boolean not null default false, segment_ids jsonb not null,
 primary key(id,version_id), foreign key(version_id,organization_id) references public.output_versions(id,organization_id) on delete cascade
);
create table public.review_links (
 id uuid primary key default gen_random_uuid(), organization_id text not null, version_id uuid not null,
 token_hash text not null unique, expires_at timestamptz not null, revoked_at timestamptz,
 created_at timestamptz not null default now(), unique(id,organization_id),
 foreign key(version_id,organization_id) references public.output_versions(id,organization_id) on delete cascade
);
create table public.review_responses (
 id uuid primary key default gen_random_uuid(), organization_id text not null, link_id uuid not null unique,
 name text not null, email text not null, decision text not null check(decision in ('approved','changes_requested')),
 comments text not null default '', created_at timestamptz not null default now(),
 foreign key(link_id,organization_id) references public.review_links(id,organization_id) on delete cascade
);
create table public.processing_runs (
 id uuid primary key default gen_random_uuid(), organization_id text not null, meeting_id uuid not null,
 kind text not null check(kind in ('transcribe','generate')), status text not null default 'active',
 transcript_revision integer not null, workflow_id text, error text, created_at timestamptz not null default now(),
 finished_at timestamptz, foreign key(meeting_id,organization_id) references public.meetings(id,organization_id) on delete cascade
);
create unique index one_active_run_per_meeting on public.processing_runs(meeting_id) where status='active';
create index active_org_runs on public.processing_runs(organization_id,status);
create index client_org on public.clients(organization_id);
create index project_org_client on public.projects(organization_id,client_id);
create index meeting_org_project on public.meetings(organization_id,project_id,created_at desc);
create index segments_meeting on public.transcript_segments(organization_id,meeting_id,start_ms);
create index versions_meeting on public.output_versions(organization_id,meeting_id,created_at desc);
create index tasks_version on public.tasks(organization_id,version_id);
create index links_version on public.review_links(organization_id,version_id);
create index responses_org on public.review_responses(organization_id);

do $$ declare t text; begin
 foreach t in array array['clients','projects','meetings','transcript_segments','output_versions','tasks','review_links','review_responses','processing_runs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy tenant_read on public.%I for select to authenticated using (organization_id=(select private.org_id()))',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('revoke all on public.%I from anon',t);
 end loop;
 foreach t in array array['clients','projects'] loop
 execute format('grant insert,update on public.%I to authenticated',t);
 execute format('create policy tenant_insert on public.%I for insert to authenticated with check(organization_id=(select private.org_id()))',t);
 execute format('create policy tenant_update on public.%I for update to authenticated using(organization_id=(select private.org_id())) with check(organization_id=(select private.org_id()))',t);
 end loop;
end $$;
-- Revoke Supabase default grants for tables modified only through authorized server operations.
revoke insert,update,delete on public.meetings,public.transcript_segments,public.output_versions,public.tasks,public.review_links,public.review_responses,public.processing_runs from authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('recordings','recordings',false,262144000,array['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/mp4','audio/x-m4a','video/mp4','video/webm','audio/webm']);
create policy recording_upload on storage.objects for insert to authenticated with check (
 bucket_id='recordings' and (storage.foldername(name))[1]=(select private.org_id()) and
 exists(select 1 from public.meetings m where m.organization_id=(select private.org_id()) and m.recording_path=name and m.status='uploading' and m.deleted_at is null and not m.recording_deleted)
);
-- Playback and upload recovery go through authorized server endpoints. No public reads or overwrites.

create function public.claim_run(p_org text,p_meeting uuid,p_kind text) returns jsonb
language plpgsql set search_path='' as $$
declare m public.meetings; r public.processing_runs;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_org,0));
 select * into m from public.meetings where id=p_meeting and organization_id=p_org for update;
 if m.id is null or m.deleted_at is not null or m.cleanup_status in ('pending','failed') then raise exception 'Meeting unavailable'; end if;
 select * into r from public.processing_runs where meeting_id=p_meeting and status='active';
 if r.id is not null then return to_jsonb(r); end if;
 if (select count(*) from public.processing_runs where organization_id=p_org and status='active')>=2 then raise exception 'Two meetings are already processing. Try again when one finishes.'; end if;
 if p_kind='generate' and m.transcript_revision=0 then raise exception 'Transcript not ready'; end if;
 if p_kind='transcribe' and (m.recording_deleted or m.transcript_revision>0) then raise exception 'Recording unavailable or already transcribed'; end if;
 insert into public.processing_runs(organization_id,meeting_id,kind,transcript_revision) values(p_org,p_meeting,p_kind,m.transcript_revision) returning * into r;
 update public.meetings set status=case when p_kind='transcribe' then 'transcribing' else 'generating' end,error=null where id=p_meeting;
 return to_jsonb(r);
end $$;

create function public.commit_transcript(p_run uuid,p_segments jsonb,p_duration numeric) returns boolean
language plpgsql set search_path='' as $$
declare r public.processing_runs; m public.meetings;
begin
 select * into r from public.processing_runs where id=p_run;
 select * into m from public.meetings where id=r.meeting_id for update;
 if r.status<>'active' or m.deleted_at is not null or m.recording_deleted or m.id is null then return false; end if;
 if m.transcript_revision=0 then
 insert into public.transcript_segments(id,organization_id,meeting_id,speaker,start_ms,end_ms,text)
 select (s->>'id')::uuid,r.organization_id,r.meeting_id,s->>'speaker',(s->>'start_ms')::integer,(s->>'end_ms')::integer,s->>'text' from jsonb_array_elements(p_segments) s;
 update public.meetings set transcript_revision=1,duration_seconds=p_duration,status='transcript_ready',error=null where id=m.id;
 end if;
 update public.processing_runs set status='completed',finished_at=now() where id=r.id;
 return true;
end $$;

create function public.save_output(p_meeting uuid,p_org text,p_content jsonb,p_revision integer,p_user text,p_run uuid default null) returns uuid
language plpgsql set search_path='' as $$
declare m public.meetings; v uuid; t jsonb;
begin
 select * into m from public.meetings where id=p_meeting and organization_id=p_org for update;
 if m.id is null or m.deleted_at is not null or m.transcript_revision<>p_revision then raise exception 'Meeting changed. Refresh before saving.'; end if;
 if p_run is not null and not exists(select 1 from public.processing_runs where id=p_run and meeting_id=m.id and status='active') then raise exception 'Processing cancelled'; end if;
 insert into public.output_versions(organization_id,meeting_id,content,transcript_revision,created_by) values(p_org,p_meeting,p_content,p_revision,p_user) returning id into v;
 for t in select * from jsonb_array_elements(p_content->'tasks') loop
 insert into public.tasks(id,version_id,organization_id,description,owner,deadline,completed,segment_ids) values((t->>'id')::uuid,v,p_org,t->>'text',t->>'owner',(t->>'deadline')::date,(t->>'completed')::boolean,t->'segmentIds');
 end loop;
 update public.meetings set status='ready',error=null where id=m.id;
 if p_run is not null then update public.processing_runs set status='completed',finished_at=now() where id=p_run; end if;
 return v;
end $$;

create function public.edit_transcript(p_meeting uuid,p_org text,p_revision integer,p_segments jsonb) returns void
language plpgsql set search_path='' as $$
declare m public.meetings; s jsonb;
begin
 select * into m from public.meetings where id=p_meeting and organization_id=p_org for update;
 if m.id is null or m.deleted_at is not null or m.transcript_revision<>p_revision then raise exception 'Transcript changed. Refresh and try again.'; end if;
 if exists(select 1 from public.processing_runs where meeting_id=m.id and status='active') then raise exception 'Wait for processing to finish'; end if;
 for s in select * from jsonb_array_elements(p_segments) loop
 update public.transcript_segments set text=s->>'text',speaker=s->>'speaker' where id=(s->>'id')::uuid and meeting_id=m.id;
 if not found then raise exception 'Unknown transcript segment'; end if;
 end loop;
 update public.meetings set transcript_revision=transcript_revision+1,status='transcript_ready' where id=m.id;
end $$;

create function public.submit_review(p_hash text,p_name text,p_email text,p_decision text,p_comments text) returns jsonb
language plpgsql set search_path='' as $$
declare l public.review_links; r public.review_responses;
begin
 select * into l from public.review_links where token_hash=p_hash for update;
 if l.id is null or l.revoked_at is not null or l.expires_at<=now() or not exists(select 1 from public.output_versions v join public.meetings m on m.id=v.meeting_id where v.id=l.version_id and m.deleted_at is null) then raise exception 'Review link expired or unavailable'; end if;
 select * into r from public.review_responses where link_id=l.id;
 if r.id is not null then return to_jsonb(r); end if;
 insert into public.review_responses(organization_id,link_id,name,email,decision,comments) values(l.organization_id,l.id,p_name,p_email,p_decision,p_comments) returning * into r;
 return to_jsonb(r);
end $$;

create function public.begin_cleanup(p_org text,p_meeting uuid,p_full boolean) returns void
language plpgsql set search_path='' as $$
begin
 perform 1 from public.meetings where id=p_meeting and organization_id=p_org for update;
 update public.meetings set deleted_at=case when p_full then coalesce(deleted_at,now()) else deleted_at end,
 recording_deleted=true,cleanup_status='pending',cleanup_error=null where id=p_meeting and organization_id=p_org;
 update public.processing_runs set status='cancelled',finished_at=now() where meeting_id=p_meeting and status='active';
 if p_full then update public.review_links set revoked_at=now() where version_id in(select id from public.output_versions where meeting_id=p_meeting); end if;
end $$;

-- These RPCs are server-only; they never trust organization IDs from browser input.
revoke all on function public.claim_run(text,uuid,text),public.commit_transcript(uuid,jsonb,numeric),public.save_output(uuid,text,jsonb,integer,text,uuid),public.edit_transcript(uuid,text,integer,jsonb),public.submit_review(text,text,text,text,text),public.begin_cleanup(text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.claim_run(text,uuid,text),public.commit_transcript(uuid,jsonb,numeric),public.save_output(uuid,text,jsonb,integer,text,uuid),public.edit_transcript(uuid,text,integer,jsonb),public.submit_review(text,text,text,text,text),public.begin_cleanup(text,uuid,boolean) to service_role;
