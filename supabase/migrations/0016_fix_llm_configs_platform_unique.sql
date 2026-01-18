-- Fix unique constraint for platform scope where scope_id is NULL
-- PostgreSQL treats NULL != NULL, so the existing unique constraint doesn't work for platform configs

-- Add partial unique index for platform scope (where scope_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS llm_configs_platform_provider_unique
ON public.llm_configs (scope, provider)
WHERE scope_id IS NULL;

-- Add comment explaining the constraint
COMMENT ON INDEX public.llm_configs_platform_provider_unique IS
  'Ensures only one config per provider for platform scope (where scope_id is NULL)';
