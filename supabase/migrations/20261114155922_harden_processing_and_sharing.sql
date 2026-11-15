-- Serialize sharing with deletion so a deleted meeting cannot acquire new links.
create function public.create_review_link(p_org text,p_meeting uuid,p_version uuid,p_hash text) returns uuid
language plpgsql set search_path='' as $$
declare m public.meetings; link_id uuid;
begin
 select * into m from public.meetings where id=p_meeting and organization_id=p_org for update;
 if m.id is null or m.deleted_at is not null then raise exception 'Meeting unavailable'; end if;
 if not exists(select 1 from public.output_versions where id=p_version and meeting_id=p_meeting and organization_id=p_org) then raise exception 'Version unavailable'; end if;
 insert into public.review_links(organization_id,version_id,token_hash,expires_at) values(p_org,p_version,p_hash,now()+interval '7 days') returning id into link_id;
 return link_id;
end $$;
revoke all on function public.create_review_link(text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.create_review_link(text,uuid,uuid,text) to service_role;

-- Supabase TUS recovery requires HEAD/read access; permit it only while this active meeting owns the object.
create policy recording_recovery on storage.objects for select to authenticated using (
 bucket_id='recordings' and (storage.foldername(name))[1]=(select private.org_id()) and
 exists(select 1 from public.meetings m where m.recording_path=name and m.organization_id=(select private.org_id()) and not m.recording_deleted and m.deleted_at is null)
);
grant all on public.clients,public.projects,public.meetings,public.transcript_segments,public.output_versions,public.tasks,public.review_links,public.review_responses,public.processing_runs to service_role;

-- A live meeting is required for ordinary user reads of dependent rows.
drop policy tenant_read on public.output_versions;
create policy tenant_read on public.output_versions for select to authenticated using (
 organization_id=(select private.org_id()) and exists(select 1 from public.meetings m where m.id=meeting_id and m.deleted_at is null)
);
drop policy tenant_read on public.transcript_segments;
create policy tenant_read on public.transcript_segments for select to authenticated using (
 organization_id=(select private.org_id()) and exists(select 1 from public.meetings m where m.id=meeting_id and m.deleted_at is null)
);
