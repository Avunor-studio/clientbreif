create function public.review_scope_change(p_org text,p_project uuid,p_change uuid,p_revision integer,p_status text,p_note text,p_budget text,p_timeline text,p_user text) returns jsonb
language plpgsql set search_path='' as $$
declare c public.scope_changes; r public.project_runs; baseline public.output_versions;
begin
 select * into c from public.scope_changes where id=p_change and organization_id=p_org and project_id=p_project;
 if c.id is null then raise exception 'Scope suggestion unavailable'; end if;
 select * into baseline from public.output_versions where id=c.baseline_version_id;
 perform 1 from public.meetings where id in (c.meeting_id,baseline.meeting_id) order by id for update;
 if baseline.id is null or not exists(select 1 from public.meetings where id=c.meeting_id and deleted_at is null) or not exists(select 1 from public.meetings where id=baseline.meeting_id and deleted_at is null) then raise exception 'Scope suggestion unavailable'; end if;
 select * into r from public.project_runs where id=c.run_id;
 if r.status<>'completed' or r.transcript_revision<>(select transcript_revision from public.meetings where id=c.meeting_id) then raise exception 'Transcript changed. Run a new comparison before reviewing.'; end if;
 update public.scope_changes set status=p_status,review_note=p_note,budget_impact=p_budget,timeline_impact=p_timeline,reviewed_by=p_user,updated_at=now(),revision=revision+1
 where id=c.id and revision=p_revision returning * into c;
 if c.id is null then raise exception 'This suggestion changed. Refresh and review the latest version.'; end if;
 return to_jsonb(c);
end $$;
revoke all on function public.review_scope_change(text,uuid,uuid,integer,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.review_scope_change(text,uuid,uuid,integer,text,text,text,text,text) to service_role;
