begin;
do $$
declare
  org text := 'qa_'||gen_random_uuid();
  client uuid;
  project uuid;
  first_meeting uuid;
  second_meeting uuid;
  run uuid;
  allowance jsonb;
  requested timestamptz;
begin
  insert into public.clients(organization_id,name) values(org,'Pilot check') returning id into client;
  insert into public.projects(organization_id,client_id,name) values(org,client,'Demo') returning id into project;
  insert into public.meetings(organization_id,project_id,title,mime_type,bytes,duration_seconds)
    values(org,project,'First','audio/mpeg',100,3000) returning id into first_meeting;
  insert into public.meetings(organization_id,project_id,title,mime_type,bytes,duration_seconds)
    values(org,project,'Second','audio/mpeg',100,1000) returning id into second_meeting;
  run := (public.claim_run(org,first_meeting,'transcribe')->>'id')::uuid;
  if (public.claim_run(org,first_meeting,'transcribe')->>'id')::uuid <> run then raise exception 'Retry duplicated run'; end if;
  begin
    perform public.claim_run(org,second_meeting,'transcribe');
    raise exception 'Oversized reservation succeeded';
  exception when sqlstate 'PT402' then null; end;
  update public.processing_runs set status='failed' where id=run;
  if (public.recording_allowance(org)->>'remainingSeconds')::int <> 3600 then raise exception 'Reservation leaked'; end if;
  run := (public.claim_run(org,first_meeting,'transcribe')->>'id')::uuid;
  perform public.commit_transcript(run,'[]',2500);
  perform public.begin_cleanup(org,first_meeting,true);
  allowance := public.recording_allowance(org);
  if (allowance->>'usedSeconds')::int <> 2500 or (allowance->>'reservedSeconds')::int <> 0 then raise exception 'Actual duration/deletion accounting failed'; end if;
  update private.workspace_plans set term_start=now()-interval '15 days',term_end=now()-interval '1 day' where org_id=org;
  begin
    perform public.claim_run(org,second_meeting,'transcribe');
    raise exception 'Expired term accepted recording';
  exception when sqlstate 'PT402' then null; end;
  perform public.request_pilot_access(org);
  select requested_at into requested from private.workspace_plans where org_id=org;
  perform public.request_pilot_access(org);
  if not private.approve_pilot(org,requested) then raise exception 'Pilot activation failed'; end if;
  if private.approve_pilot(org,requested) then raise exception 'Request reused'; end if;
  allowance := public.recording_allowance(org);
  if allowance->>'plan'<>'pilot' or (allowance->>'remainingSeconds')::int<>36000 then raise exception 'Wrong pilot allowance'; end if;
  if has_function_privilege('authenticated','public.recording_allowance(text,integer)','execute')
     or has_function_privilege('service_role','private.approve_pilot(text,timestamptz)','execute')
     or has_table_privilege('authenticated','private.workspace_plans','update')
     or has_table_privilege('anon','private.recording_usage','select') then raise exception 'Billing privileges exposed'; end if;
end $$;
rollback;
