-- Add sort_order column to payment_methods table
ALTER TABLE public.payment_methods
ADD COLUMN sort_order INTEGER;

-- Set initial sort order based on name (alphabetically)
WITH ordered_methods AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY name) as rn
  FROM public.payment_methods
)
UPDATE public.payment_methods pm
SET sort_order = om.rn
FROM ordered_methods om
WHERE pm.id = om.id;

-- Make sort_order NOT NULL after setting initial values
ALTER TABLE public.payment_methods
ALTER COLUMN sort_order SET NOT NULL;

-- Add index for better query performance
CREATE INDEX idx_payment_methods_sort_order ON public.payment_methods(user_id, sort_order);
