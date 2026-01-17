create or replace function public.enforce_analysis_job_done_requires_outputs()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    if not exists (
      select 1 from public.analysis_insights ai where ai.job_id = new.id
    ) then
      raise exception 'analysis_jobs % cannot be marked done without analysis_insights', new.id;
    end if;

    if not exists (
      select 1 from public.analysis_metrics am where am.job_id = new.id
    ) then
      raise exception 'analysis_jobs % cannot be marked done without analysis_metrics', new.id;
    end if;

    if not exists (
      select 1 from public.analysis_reports ar where ar.job_id = new.id
    ) then
      raise exception 'analysis_jobs % cannot be marked done without analysis_reports', new.id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists analysis_jobs_require_outputs_for_done on public.analysis_jobs;

create trigger analysis_jobs_require_outputs_for_done
before update of status on public.analysis_jobs
for each row
execute function public.enforce_analysis_job_done_requires_outputs();

