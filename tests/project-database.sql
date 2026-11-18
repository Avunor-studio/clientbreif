-- Disposable fixtures; no customer records are changed. Run as database owner.
begin;
create function pg_temp.assert_true(value boolean, message text) returns void language plpgsql as $$ begin if value is distinct from true then raise exception '%',message; end if; end $$;
create function pg_temp.expect_failure(statement text, pattern text) returns void language plpgsql as $$
begin
 begin execute statement; exception when others then
  if sqlerrm not ilike '%'||pattern||'%' then raise exception 'Wrong failure: % (expected %)',sqlerrm,pattern; end if;
  return;
 end;
 raise exception 'Expected failure: %',pattern;
end $$;
insert into public.clients(id,organization_id,name) values
('a1000000-0000-4000-8000-000000000001','org_feature_a','Feature test A'),('a1000000-0000-4000-8000-000000000002','org_feature_b','Feature test B');
insert into public.projects(id,organization_id,client_id,name) values
('a2000000-0000-4000-8000-000000000001','org_feature_a','a1000000-0000-4000-8000-000000000001','Feature project A'),
('a2000000-0000-4000-8000-000000000002','org_feature_b','a1000000-0000-4000-8000-000000000002','Feature project B');
insert into public.intake_links(id,organization_id,project_id,token_hash) values
('a3000000-0000-4000-8000-000000000001','org_feature_a','a2000000-0000-4000-8000-000000000001',repeat('a',64)),
('a3000000-0000-4000-8000-000000000002','org_feature_b','a2000000-0000-4000-8000-000000000002',repeat('b',64));
insert into public.meetings(id,organization_id,project_id,title,mime_type,bytes,transcript_revision,status) values
('a4000000-0000-4000-8000-000000000001','org_feature_a','a2000000-0000-4000-8000-000000000001','Approved discovery','audio/mpeg',100,1,'ready'),
('a4000000-0000-4000-8000-000000000002','org_feature_a','a2000000-0000-4000-8000-000000000001','Later request','audio/mpeg',100,1,'transcript_ready'),
('a4000000-0000-4000-8000-000000000003','org_feature_b','a2000000-0000-4000-8000-000000000002','Other agency','audio/mpeg',100,1,'transcript_ready');
insert into public.output_versions(id,organization_id,meeting_id,content,transcript_revision,created_by) values
('a5000000-0000-4000-8000-000000000001','org_feature_a','a4000000-0000-4000-8000-000000000001','{"brief":{"overview":"Five pages","scope":[{"text":"Five pages","segmentIds":[]}],"deliverables":[],"requirements":[],"openQuestions":[]},"decisions":[],"tasks":[],"followUp":""}',1,'test'),
('a5000000-0000-4000-8000-000000000002','org_feature_a','a4000000-0000-4000-8000-000000000001','{"brief":{}}',1,'test');
select public.create_review_link('org_feature_a','a4000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000001','feature_review');
select public.submit_review('feature_review','Synthetic reviewer','synthetic@example.test','approved','Fixture only');
do $$ declare i uuid; r jsonb; same jsonb; c uuid; result jsonb; g jsonb; begin
 i:=public.submit_intake(repeat('a',64),'Synthetic client','synthetic@example.test','{"goals":"Leads","deliverables":"Five pages"}');
 perform pg_temp.assert_true(i=public.submit_intake(repeat('a',64),'Changed','other@example.test','{"goals":"Overwrite"}'),'Duplicate intake submission created another row');
 perform pg_temp.assert_true((select answers->>'goals' from public.intake_responses where id=i)='Leads','Duplicate submission overwrote answers');
 perform public.submit_intake(repeat('b',64),'Other client','other@example.test','{"goals":"Other","deliverables":"Other"}');
 update public.intake_links set expires_at=now()-interval '1 second' where token_hash=repeat('a',64);
 perform pg_temp.expect_failure(format('select public.submit_intake(%L,%L,%L,%L)',repeat('a',64),'R','r@example.test','{}'),'expired');
 update public.intake_links set expires_at=now()+interval '1 day',revoked_at=now() where token_hash=repeat('a',64);
 perform pg_temp.expect_failure(format('select public.submit_intake(%L,%L,%L,%L)',repeat('a',64),'R','r@example.test','{}'),'expired');
 update public.intake_links set revoked_at=null where token_hash=repeat('a',64);
 perform pg_temp.expect_failure(format('select public.claim_project_run(%L,%L,%L,%L)','org_feature_b','a2000000-0000-4000-8000-000000000002','intake_prep',i),'Intake unavailable');
 perform pg_temp.expect_failure(format('select public.claim_generation(%L,%L,%L)','org_feature_b','a4000000-0000-4000-8000-000000000003',i),'Intake unavailable');
 perform pg_temp.expect_failure('select public.claim_project_run(''org_feature_a'',''a2000000-0000-4000-8000-000000000001'',''scope_check'',null,''a4000000-0000-4000-8000-000000000002'',''a5000000-0000-4000-8000-000000000002'')','approved');
 r:=public.claim_project_run('org_feature_a','a2000000-0000-4000-8000-000000000001','intake_prep',i);
 same:=public.claim_project_run('org_feature_a','a2000000-0000-4000-8000-000000000001','intake_prep',i);
 perform pg_temp.assert_true(r->>'id'=same->>'id','Active agenda job not deduplicated');
 g:=public.claim_generation('org_feature_a','a4000000-0000-4000-8000-000000000002',i);
 perform pg_temp.expect_failure('select public.claim_project_run(''org_feature_a'',''a2000000-0000-4000-8000-000000000001'',''scope_check'',null,''a4000000-0000-4000-8000-000000000002'',''a5000000-0000-4000-8000-000000000001'')','Two jobs');
 perform pg_temp.expect_failure('select public.claim_generation(''org_feature_a'',''a4000000-0000-4000-8000-000000000002'',null)','Wait for');
 perform public.commit_project_run((r->>'id')::uuid,'{"agenda":[],"questions":[]}');
 same:=public.claim_project_run('org_feature_a','a2000000-0000-4000-8000-000000000001','intake_prep',i);
 perform pg_temp.assert_true(r->>'id'=same->>'id','Completed agenda job not reused');
 update public.processing_runs set status='completed' where id=(g->>'id')::uuid;
 r:=public.claim_project_run('org_feature_a','a2000000-0000-4000-8000-000000000001','scope_check',null,'a4000000-0000-4000-8000-000000000002','a5000000-0000-4000-8000-000000000001');
 result:='{"changes":[{"suggestion":{"title":"Booking","description":"Add booking","reason":"New request","category":"addition","segmentIds":["a6000000-0000-4000-8000-000000000001"],"baselineRefs":[]},"source_segments":[],"baseline_items":[]}]}';
 perform public.commit_project_run((r->>'id')::uuid,result);
 perform public.commit_project_run((r->>'id')::uuid,result);
 perform pg_temp.assert_true((select count(*) from public.scope_changes where run_id=(r->>'id')::uuid)=1,'Duplicate workflow completion duplicated suggestions');
 select id into c from public.scope_changes where run_id=(r->>'id')::uuid;
 perform public.review_scope_change('org_feature_a','a2000000-0000-4000-8000-000000000001',c,0,'confirmed','Review','','','tester');
 perform pg_temp.expect_failure(format('select public.review_scope_change(%L,%L,%L,0,%L,%L,%L,%L,%L)','org_feature_a','a2000000-0000-4000-8000-000000000001',c,'dismissed','','','','tester'),'changed');
 update public.meetings set transcript_revision=2 where id='a4000000-0000-4000-8000-000000000002';
 perform pg_temp.expect_failure(format('select public.review_scope_change(%L,%L,%L,1,%L,%L,%L,%L,%L)','org_feature_a','a2000000-0000-4000-8000-000000000001',c,'confirmed','','','','tester'),'Transcript changed');
 r:=public.claim_project_run('org_feature_a','a2000000-0000-4000-8000-000000000001','scope_check',null,'a4000000-0000-4000-8000-000000000002','a5000000-0000-4000-8000-000000000001');
 update public.meetings set transcript_revision=3 where id='a4000000-0000-4000-8000-000000000002';
 perform pg_temp.expect_failure(format('select public.commit_project_run(%L,%L)',r->>'id',result),'Transcript changed');
 update public.project_runs set status='failed' where id=(r->>'id')::uuid;
 r:=public.claim_project_run('org_feature_a','a2000000-0000-4000-8000-000000000001','scope_check',null,'a4000000-0000-4000-8000-000000000002','a5000000-0000-4000-8000-000000000001');
 perform public.begin_cleanup('org_feature_a','a4000000-0000-4000-8000-000000000002',true);
 perform pg_temp.assert_true((select status from public.project_runs where id=(r->>'id')::uuid)='cancelled','Deletion did not cancel project work');
 perform pg_temp.expect_failure(format('select public.commit_project_run(%L,%L)',r->>'id',result),'unavailable');
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"feature_user_a","role":"authenticated","o":{"id":"org_feature_a","rol":"member"}}',true);
do $$ begin
 if (select count(*) from public.intake_responses)<>1 then raise exception 'Intake tenant isolation failed'; end if;
 if exists(select 1 from public.scope_changes) then raise exception 'Deleted meeting scope still visible'; end if;
 if exists(select 1 from public.project_runs where kind='scope_check') then raise exception 'Deleted meeting runs still visible'; end if;
 if has_table_privilege('authenticated','public.intake_responses','INSERT') or has_table_privilege('authenticated','public.scope_changes','UPDATE') then raise exception 'Direct privileged writes exposed'; end if;
 if has_function_privilege('authenticated','public.submit_intake(text,text,text,jsonb)','EXECUTE') or has_function_privilege('authenticated','public.claim_project_run(text,uuid,text,uuid,uuid,uuid)','EXECUTE') or has_function_privilege('authenticated','public.review_scope_change(text,uuid,uuid,integer,text,text,text,text,text)','EXECUTE') then raise exception 'Privileged project RPC exposed'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"feature_user_b","role":"authenticated","o":{"id":"org_feature_b","rol":"admin"}}',true);
do $$ begin
 if (select count(*) from public.intake_links)<>1 or (select count(*) from public.intake_responses)<>1 then raise exception 'Org switching isolation failed'; end if;
 if exists(select 1 from public.project_runs) then raise exception 'Cross-tenant project run visible'; end if;
end $$;
reset role;
select pg_temp.assert_true(not has_table_privilege('anon','public.intake_responses','SELECT'),'Public responses table exposed');
select 'Intake, scope, idempotency, role, isolation, stale review, and deletion checks passed' as result;
rollback;
