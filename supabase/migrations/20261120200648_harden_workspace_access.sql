-- New application tables require explicit grants, including before RLS is enabled.
alter default privileges for role postgres in schema public revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from public, anon, authenticated;
-- PostgreSQL's built-in PUBLIC execute default can only be removed at role scope.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
revoke create on schema public from public, anon, authenticated;

create or replace function private.org_id() returns text
language sql stable set search_path = '' as $$
  select case when nullif(btrim(claims->>'sub'), '') is not null
    and claims->'o'->>'rol' in ('member', 'admin')
    then nullif(btrim(claims->'o'->>'id'), '') end
  from (select auth.jwt() as claims) session_claims
$$;
revoke execute on function private.org_id(), private.is_admin() from public, anon;
grant execute on function private.org_id(), private.is_admin() to authenticated;

revoke all on public.clients, public.projects, public.meetings, public.transcript_segments,
  public.output_versions, public.tasks, public.review_links, public.review_responses,
  public.processing_runs, public.intake_links, public.intake_responses, public.project_runs,
  public.scope_changes from public, anon, authenticated;

grant select on public.clients, public.projects, public.meetings, public.transcript_segments,
  public.output_versions, public.tasks, public.review_responses, public.processing_runs,
  public.intake_responses, public.project_runs, public.scope_changes to authenticated;
grant select (id, organization_id, version_id, expires_at, revoked_at, created_at)
  on public.review_links to authenticated;
grant select (id, organization_id, project_id, expires_at, revoked_at, created_at)
  on public.intake_links to authenticated;
grant insert (organization_id, name, contact_email), update (name, contact_email)
  on public.clients to authenticated;
grant insert (organization_id, client_id, name, description), update (client_id, name, description)
  on public.projects to authenticated;

alter policy tenant_read on public.meetings using (
  organization_id = (select private.org_id()) and deleted_at is null
);
-- The parent SELECT policies apply to each EXISTS, including tenant and deletion checks.
alter policy tenant_read on public.tasks using (
  organization_id = (select private.org_id())
  and exists (select 1 from public.output_versions v where v.id = tasks.version_id)
);
alter policy tenant_read on public.review_links using (
  organization_id = (select private.org_id())
  and exists (select 1 from public.output_versions v where v.id = review_links.version_id)
);
alter policy tenant_read on public.review_responses using (
  organization_id = (select private.org_id())
  and exists (select 1 from public.review_links l where l.id = review_responses.link_id)
);
alter policy tenant_read on public.processing_runs using (
  organization_id = (select private.org_id())
  and exists (select 1 from public.meetings m where m.id = processing_runs.meeting_id)
);
-- Direct object access supports resumable uploads. Playback uses a short-lived signed URL.
alter policy recording_recovery on storage.objects using (
  bucket_id = 'recordings' and (storage.foldername(name))[1] = (select private.org_id())
  and exists (select 1 from public.meetings m where m.organization_id = (select private.org_id())
    and m.recording_path = objects.name and m.status = 'uploading'
    and m.deleted_at is null and not m.recording_deleted)
);
