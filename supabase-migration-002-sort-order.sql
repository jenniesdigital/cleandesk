-- Migration: Add sort_order column to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sort_order integer default 0;

-- Update existing tasks to have sequential sort_order
UPDATE public.tasks AS t
SET sort_order = sub.new_order
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) - 1 AS new_order
  FROM public.tasks
) AS sub
WHERE t.id = sub.id;
