create index projects_client_fk on public.projects(client_id,organization_id);
create index meetings_project_fk on public.meetings(project_id,organization_id);
create index segments_meeting_fk on public.transcript_segments(meeting_id,organization_id);
create index outputs_meeting_fk on public.output_versions(meeting_id,organization_id);
create index tasks_version_fk on public.tasks(version_id,organization_id);
create index links_version_fk on public.review_links(version_id,organization_id);
create index responses_link_fk on public.review_responses(link_id,organization_id);
create index runs_meeting_fk on public.processing_runs(meeting_id,organization_id);

create or replace function public.begin_cleanup(p_org text,p_meeting uuid,p_full boolean) returns void
language plpgsql set search_path='' as $$
begin
 perform 1 from public.meetings where id=p_meeting and organization_id=p_org for update;
 update public.meetings set deleted_at=case when p_full then coalesce(deleted_at,now()) else deleted_at end,
 recording_deleted=true,cleanup_status='pending',cleanup_error=null,
 status=case when status in ('transcribing','generating') then case when transcript_revision>0 then 'transcript_ready' else 'failed' end else status end,
 error=case when status='transcribing' then 'Recording deleted before transcription finished.' else error end
 where id=p_meeting and organization_id=p_org;
 update public.processing_runs set status='cancelled',finished_at=now() where meeting_id=p_meeting and status='active';
 if p_full then update public.review_links set revoked_at=now() where version_id in(select id from public.output_versions where meeting_id=p_meeting); end if;
end $$;
