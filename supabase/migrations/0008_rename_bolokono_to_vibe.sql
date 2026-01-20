-- Rename bolokono_type column to vibe_type as part of brand rename
-- from Bolokono to Vibed Coding

ALTER TABLE public.analysis_reports
  RENAME COLUMN bolokono_type TO vibe_type;
