-- Run with a database-owner connection. Every fixture is rolled back.
begin;
insert into public.clients(id,organization_id,name) values
('10000000-0000-4000-8000-000000000001','org_test_a','Agency A client'),
('10000000-0000-4000-8000-000000000002','org_test_b','Agency B client');
insert into public.projects(id,organization_id,client_id,name) values
('20000000-0000-4000-8000-000000000001','org_test_a','10000000-0000-4000-8000-000000000001','A project'),
('20000000-0000-4000-8000-000000000002','org_test_b','10000000-0000-4000-8000-000000000002','B project');
insert into public.meetings(id,organization_id,project_id,title,mime_type,bytes) values
('30000000-0000-4000-8000-000000000001','org_test_a','20000000-0000-4000-8000-000000000001','A meeting 1','audio/mpeg',100),
('30000000-0000-4000-8000-000000000002','org_test_a','20000000-0000-4000-8000-000000000001','A meeting 2','audio/mpeg',100),
('30000000-0000-4000-8000-000000000003','org_test_a','20000000-0000-4000-8000-000000000001','A meeting 3','audio/mpeg',100),
('30000000-0000-4000-8000-000000000004','org_test_b','20000000-0000-4000-8000-000000000002','B meeting','audio/mpeg',100);
do $$
declare r jsonb; duplicate jsonb; r2 jsonb; r3 jsonb; v uuid; l uuid; newer uuid; response jsonb; content jsonb;
begin
 r:=public.claim_run('org_test_a','30000000-0000-4000-8000-000000000001','transcribe');
 duplicate:=public.claim_run('org_test_a','30000000-0000-4000-8000-000000000001','transcribe');
 if r->>'id'<>duplicate->>'id' then raise exception 'Duplicate processing run';end if;
 r2:=public.claim_run('org_test_a','30000000-0000-4000-8000-000000000002','transcribe');
 begin perform public.claim_run('org_test_a','30000000-0000-4000-8000-000000000003','transcribe');raise exception 'Concurrency limit missing';
 exception when others then if sqlerrm='Concurrency limit missing' then raise;end if;end;
 perform public.commit_transcript((r->>'id')::uuid,'[{"id":"40000000-0000-4000-8000-000000000001","speaker":"A","start_ms":0,"end_ms":1000,"text":"Five pages"}]',60);
 content:='{"brief":{"overview":"Example","scope":[{"text":"Five pages","segmentIds":["40000000-0000-4000-8000-000000000001"]}],"deliverables":[],"requirements":[],"openQuestions":[]},"tasks":[],"decisions":[],"followUp":"Hello"}';
 v:=public.save_output('30000000-0000-4000-8000-000000000001','org_test_a',content,1,'test');
 l:=public.create_review_link('org_test_a','30000000-0000-4000-8000-000000000001',v,'test_hash');
 response:=public.submit_review('test_hash','Reviewer','reviewer@example.test','approved','');
 response:=public.submit_review('test_hash','Other','other@example.test','changes_requested','Do not duplicate');
 if response->>'decision'<>'approved' or (select count(*) from public.review_responses where link_id=l)<>1 then raise exception 'Review response not idempotent';end if;
 newer:=public.save_output('30000000-0000-4000-8000-000000000001','org_test_a',content,1,'test');
 if exists(select 1 from public.review_links where version_id=newer) then raise exception 'New version inherited approval';end if;
 update public.review_links set expires_at=now()-interval '1 second' where id=l;
 begin perform public.submit_review('test_hash','R','r@example.test','approved','');raise exception 'Expired review accepted';
 exception when others then if sqlerrm='Expired review accepted' then raise;end if;end;
 update public.review_links set expires_at=now()+interval '1 day',revoked_at=now() where id=l;
 begin perform public.submit_review('test_hash','R','r@example.test','approved','');raise exception 'Revoked review accepted';
 exception when others then if sqlerrm='Revoked review accepted' then raise;end if;end;
 perform public.begin_cleanup('org_test_a','30000000-0000-4000-8000-000000000002',true);
 if public.commit_transcript((r2->>'id')::uuid,'[]',60) then raise exception 'Deleted meeting revived';end if;
 begin perform public.create_review_link('org_test_a','30000000-0000-4000-8000-000000000002',v,'bad_hash');raise exception 'Deleted meeting shared';
 exception when others then if sqlerrm='Deleted meeting shared' then raise;end if;end;
 r3:=public.claim_run('org_test_a','30000000-0000-4000-8000-000000000003','transcribe');
 perform public.begin_cleanup('org_test_a','30000000-0000-4000-8000-000000000003',false);
 if public.commit_transcript((r3->>'id')::uuid,'[]',60) then raise exception 'Deleted recording generated transcript';end if;
end $$;
-- Build storage metadata only. No recording bytes are uploaded.
update public.meetings set recording_path=organization_id||'/'||id||'/test.wav'
 where organization_id in ('org_test_a','org_test_b');
insert into storage.objects(bucket_id,name)
 select 'recordings',recording_path from public.meetings where organization_id in ('org_test_a','org_test_b');

do $$ declare t regclass; f regprocedure; begin
 for t in select c.oid::regclass from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind in ('r','p') loop
   if not (select relrowsecurity from pg_class where oid=t) then raise exception 'Missing RLS on %',t; end if;
   if has_table_privilege('authenticated',t,'TRUNCATE,TRIGGER,REFERENCES,DELETE')
      or has_any_column_privilege('anon',t,'SELECT,UPDATE,INSERT,REFERENCES')
      or has_table_privilege('anon',t,'TRUNCATE,TRIGGER,DELETE') then raise exception 'Unexpected grant on %',t; end if;
 end loop;
 foreach t in array array['public.review_links'::regclass,'public.intake_links'::regclass] loop
   if has_column_privilege('authenticated',t,'token_hash','SELECT')
      or not has_column_privilege('authenticated',t,'id','SELECT') then raise exception 'Link field permissions on %',t; end if;
 end loop;
 for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and not exists (select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e') loop
   if has_function_privilege('authenticated',f,'EXECUTE') or has_function_privilege('anon',f,'EXECUTE')
     or not has_function_privilege('service_role',f,'EXECUTE') then raise exception 'Server RPC permissions on %',f; end if;
 end loop;
 if exists(select 1 from storage.buckets where id='recordings' and public) then raise exception 'Public recordings bucket';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"user_test_a","role":"authenticated","o":{"id":"org_test_a","rol":"member"}}',true);
do $$ begin
 if (select count(*) from public.clients)<>1 then raise exception 'Client RLS failure';end if;
 if (select count(*) from public.projects)<>1 then raise exception 'Project RLS failure';end if;
 if exists(select 1 from public.meetings where organization_id='org_test_b') then raise exception 'Meeting RLS failure';end if;
 if exists(select 1 from public.output_versions where organization_id='org_test_b') then raise exception 'Output RLS failure';end if;
 if exists(select 1 from storage.objects where bucket_id='recordings' and (storage.foldername(name))[1]='org_test_b') then raise exception 'Storage RLS failure';end if;
 if exists(select 1 from storage.objects where bucket_id='recordings' and (storage.foldername(name))[1]='org_test_a') then raise exception 'Completed or deleted upload accessible directly'; end if;
 if exists(select 1 from public.meetings where deleted_at is not null) or exists(
   select 1 from public.processing_runs where meeting_id='30000000-0000-4000-8000-000000000002'
 ) then raise exception 'Deleted meeting or run remains visible';end if;
 if (select count(id) from public.review_links)<>1 or (select count(*) from public.review_responses)<>1
 then raise exception 'Live review history unavailable';end if;
 if has_function_privilege('authenticated','public.claim_run(text,uuid,text)','EXECUTE') then raise exception 'Privileged RPC exposed';end if;
 if has_function_privilege('authenticated','public.submit_review(text,text,text,text,text)','EXECUTE') then raise exception 'Review RPC exposed';end if;
 if has_table_privilege('authenticated','public.meetings','UPDATE') then raise exception 'Privileged meeting updates exposed';end if;
 begin insert into public.clients(organization_id,name) values('org_test_b','Cross tenant');raise exception 'Cross tenant insertion accepted';
 exception when insufficient_privilege then null;end;
 update public.clients set name='Changed by wrong tenant' where organization_id='org_test_b';
 if found then raise exception 'Cross tenant update accepted';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"user_test_b","role":"authenticated","o":{"id":"org_test_b","rol":"admin"}}',true);
do $$ begin
 if (select count(*) from public.clients)<>1 then raise exception 'Org switch RLS failure';end if;
 if (select count(*) from public.meetings)<>1 then raise exception 'Org B meeting isolation failed';end if;
 if (select count(*) from storage.objects where bucket_id='recordings')<>1 then raise exception 'Upload recovery isolation failed';end if;
 if has_column_privilege('authenticated','public.projects','organization_id','UPDATE')
   or has_column_privilege('authenticated','public.clients','id','INSERT') then raise exception 'System fields are writable';end if;
 insert into public.clients(organization_id,name) values('org_test_b','Second client');
 update public.projects set name='Revised project' where organization_id='org_test_b';
 if not found then raise exception 'Authorized project edit failed';end if;
end $$;
reset role;
-- Remove the meeting that owns the approved version from the active workspace.
insert into public.tasks(id,version_id,organization_id,description,segment_ids)
 select gen_random_uuid(), version_id, organization_id, 'Test task','[]' from public.review_links where organization_id='org_test_a';
update public.meetings set deleted_at=now() where id='30000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"user_test_a","o":{"id":"org_test_a","rol":"admin"}}',true);
do $$ begin
 if exists(select 1 from public.output_versions) or exists(select 1 from public.transcript_segments)
   or exists(select 1 from public.tasks) or exists(select id from public.review_links) or exists(select 1 from public.review_responses)
   then raise exception 'Deleted meeting content is visible'; end if;
end $$;
do $$ declare claims jsonb; begin
 for claims in select value from jsonb_array_elements('[
   {},{"sub":"user_test_a"},{"o":{"id":"org_test_a","rol":"member"}},
   {"sub":"user_test_a","o":{"id":"org_test_a"}},{"sub":"user_test_a","o":{"id":"org_test_a","rol":"guest"}}
 ]') loop
   perform set_config('request.jwt.claims',claims::text,true);
   if private.org_id() is not null or exists(select 1 from public.clients) then raise exception 'Incomplete or unsupported session allowed'; end if;
 end loop;
end $$;
reset role;
rollback;
