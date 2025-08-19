-- Safe manual application of currency configuration
-- This script ONLY adds the currency configuration feature to your existing database
-- It does NOT modify any existing tables or data

-- 1. Create the currency configuration table
CREATE TABLE IF NOT EXISTS currency_configuration (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  currency_code VARCHAR(10) NOT NULL UNIQUE,
  is_tracked BOOLEAN DEFAULT FALSE,
  display_name VARCHAR(100) NOT NULL,
  currency_symbol VARCHAR(10),
  source VARCHAR(50) DEFAULT 'ECB',
  is_crypto BOOLEAN DEFAULT FALSE,
  decimal_places INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_currency_config_tracked 
ON currency_configuration(is_tracked) WHERE is_tracked = TRUE;

CREATE INDEX IF NOT EXISTS idx_currency_config_source 
ON currency_configuration(source);

-- 3. Insert currency data
INSERT INTO currency_configuration (currency_code, display_name, currency_symbol, source, is_crypto, is_tracked, decimal_places) VALUES
  -- Currently tracked currencies (enabled by default)
  ('USD', 'US Dollar', '$', 'ECB', FALSE, TRUE, 2),
  ('EUR', 'Euro', '€', 'ECB', FALSE, TRUE, 2),
  ('GBP', 'British Pound', '£', 'ECB', FALSE, TRUE, 2),
  ('THB', 'Thai Baht', '฿', 'ECB', FALSE, TRUE, 2),
  ('SGD', 'Singapore Dollar', 'S$', 'ECB', FALSE, TRUE, 2),
  ('MYR', 'Malaysian Ringgit', 'RM', 'ECB', FALSE, TRUE, 2),
  ('BTC', 'Bitcoin', '₿', 'COINGECKO', TRUE, TRUE, 8),
  
  -- Other available currencies (disabled by default) 
  ('AUD', 'Australian Dollar', 'A$', 'ECB', FALSE, FALSE, 2),
  ('CAD', 'Canadian Dollar', 'C$', 'ECB', FALSE, FALSE, 2),
  ('CHF', 'Swiss Franc', 'Fr', 'ECB', FALSE, FALSE, 2),
  ('CNY', 'Chinese Yuan', '¥', 'ECB', FALSE, FALSE, 2),
  ('JPY', 'Japanese Yen', '¥', 'ECB', FALSE, FALSE, 0),
  ('ETH', 'Ethereum', 'Ξ', 'COINGECKO', TRUE, FALSE, 8)
ON CONFLICT (currency_code) DO NOTHING;

-- 4. Create helper functions
CREATE OR REPLACE FUNCTION get_tracked_currencies()
RETURNS TABLE(
  currency_code VARCHAR(10),
  display_name VARCHAR(100),
  currency_symbol VARCHAR(10),
  source VARCHAR(50),
  is_crypto BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.currency_code,
    cc.display_name,
    cc.currency_symbol,
    cc.source,
    cc.is_crypto
  FROM currency_configuration cc
  WHERE cc.is_tracked = TRUE
  ORDER BY cc.is_crypto, cc.currency_code;
END;
$$ LANGUAGE plpgsql;

-- 5. Enable RLS
ALTER TABLE currency_configuration ENABLE ROW LEVEL SECURITY;

-- 6. Create policies
CREATE POLICY "Authenticated users can view currency configuration" 
ON currency_configuration
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 7. Add trigger (create function if needed)
DO $$
BEGIN
  -- Create or update the function
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $inner$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $inner$ LANGUAGE plpgsql;

  -- Create trigger if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_currency_config_updated_at' 
    AND tgrelid = 'currency_configuration'::regclass
  ) THEN
    CREATE TRIGGER update_currency_config_updated_at 
    BEFORE UPDATE ON currency_configuration
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 8. Verify the table was created
SELECT 'Currency configuration table created successfully!' as result;
