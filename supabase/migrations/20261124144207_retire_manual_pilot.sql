-- Apply after deploying the RevenueCat routes. Keep historical records for reconciliation.
drop trigger reserve_recording_usage on public.processing_runs;
drop trigger settle_recording_usage on public.processing_runs;
drop function private.meter_transcription();
drop function public.request_pilot_access(text);
drop function private.approve_pilot(text,timestamptz);
drop function public.recording_allowance(text,integer);
revoke all on private.workspace_plans, private.recording_usage from service_role;
