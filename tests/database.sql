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
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"user_test_a","role":"authenticated","o":{"id":"org_test_a","rol":"member"}}',true);
do $$ begin
 if (select count(*) from public.clients)<>1 then raise exception 'Client RLS failure';end if;
 if (select count(*) from public.projects)<>1 then raise exception 'Project RLS failure';end if;
 if exists(select 1 from public.meetings where organization_id='org_test_b') then raise exception 'Meeting RLS failure';end if;
 if exists(select 1 from public.output_versions where organization_id='org_test_b') then raise exception 'Output RLS failure';end if;
 if exists(select 1 from storage.objects where bucket_id='recordings' and (storage.foldername(name))[1]='org_test_b') then raise exception 'Storage RLS failure';end if;
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
end $$;
reset role;
rollback;
