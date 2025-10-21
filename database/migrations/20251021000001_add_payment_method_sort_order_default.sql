-- Function to calculate next sort order for a user's payment methods
CREATE OR REPLACE FUNCTION get_next_payment_method_sort_order(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_order INTEGER;
BEGIN
  SELECT COALESCE(MAX(sort_order), 0) + 1
  INTO next_order
  FROM payment_methods
  WHERE user_id = p_user_id;

  RETURN next_order;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-assign sort_order
CREATE OR REPLACE FUNCTION set_payment_method_sort_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sort_order IS NULL THEN
    NEW.sort_order := get_next_payment_method_sort_order(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_set_payment_method_sort_order ON payment_methods;
CREATE TRIGGER trg_set_payment_method_sort_order
  BEFORE INSERT ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_method_sort_order();

-- Make sort_order nullable so trigger can set it
ALTER TABLE public.payment_methods
ALTER COLUMN sort_order DROP NOT NULL;
