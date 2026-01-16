revoke all on function public.claim_analysis_job(text) from public;
grant execute on function public.claim_analysis_job(text) to service_role;

drop policy if exists analysis_jobs_update_own on public.analysis_jobs;

revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to supabase_auth_admin, service_role;
