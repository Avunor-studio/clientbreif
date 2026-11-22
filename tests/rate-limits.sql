-- Disposable identities and counters. Run under the migration owner.
begin;
do $$ declare role_name text; begin
  foreach role_name in array array['anon','authenticated'] loop
    if has_any_column_privilege(role_name,'private.api_rate_windows','SELECT,INSERT,UPDATE,REFERENCES')
       or has_table_privilege(role_name,'private.api_rate_windows','DELETE,TRUNCATE,TRIGGER')
       or has_function_privilege(role_name,'public.consume_api_budget(text,text)','EXECUTE')
       or has_function_privilege(role_name,'private.meter_record_write()','EXECUTE') then
      raise exception 'Rate state or a mutating routine is exposed to %', role_name;
    end if;
  end loop;
  if not (select relrowsecurity from pg_class where oid='private.api_rate_windows'::regclass)
     or exists(select 1 from pg_policies where schemaname='private' and tablename='api_rate_windows') then
    raise exception 'The rate table requires default-deny RLS';
  end if;
end $$;
set local role service_role;
do $$ declare
  subject text := encode(sha256(convert_to('rate_test_user', 'UTF8')), 'hex');
  bucket_name text;
  quota integer;
begin
  for bucket_name, quota in values ('api',120), ('processing',10), ('visitor',30), ('record_write',60) loop
    for i in 1..quota loop
      if public.consume_api_budget(subject,bucket_name) <> 0 then raise exception 'Early limit in %',bucket_name; end if;
    end loop;
    if public.consume_api_budget(subject,bucket_name) <= 0 then raise exception 'Missing limit in %',bucket_name; end if;
  end loop;
  if public.consume_api_budget(repeat('3',64),'api') <> 0 then raise exception 'User allowances overlap'; end if;
  update private.api_rate_windows set expires_at=now()-interval '1 second' where subject_hash=subject and bucket='api';
  if public.consume_api_budget(subject,'api') <> 0 then raise exception 'Window did not renew'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"rate_test_user","role":"authenticated","o":{"id":"org_rate_test","rol":"admin"}}',true);
do $$ begin
  begin
    insert into public.clients(organization_id,name) values ('org_rate_test','Temporary client');
    raise exception 'Direct database write skipped the account budget';
  exception when sqlstate 'PT429' then null; end;
end $$;
reset role;
select 'Rate limits, counter privacy, renewals and direct edits passed' as result;
rollback;
