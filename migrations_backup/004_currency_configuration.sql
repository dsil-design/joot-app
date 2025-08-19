-- Migration: Currency Configuration Management
-- This migration adds support for dynamic currency tracking configuration

-- 1. Create table for tracking which currencies are enabled
CREATE TABLE IF NOT EXISTS currency_configuration (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  currency_code VARCHAR(10) NOT NULL UNIQUE,
  is_tracked BOOLEAN DEFAULT FALSE,
  display_name VARCHAR(100) NOT NULL,
  currency_symbol VARCHAR(10),
  source VARCHAR(50) DEFAULT 'ECB', -- ECB or COINGECKO
  is_crypto BOOLEAN DEFAULT FALSE,
  decimal_places INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_currency_config_tracked 
ON currency_configuration(is_tracked) WHERE is_tracked = TRUE;

CREATE INDEX IF NOT EXISTS idx_currency_config_source 
ON currency_configuration(source);

-- 3. Insert all available currencies from ECB and crypto sources
INSERT INTO currency_configuration (currency_code, display_name, currency_symbol, source, is_crypto, is_tracked, decimal_places) VALUES
  -- Currently tracked currencies (enabled by default)
  ('USD', 'US Dollar', '$', 'ECB', FALSE, TRUE, 2),
  ('EUR', 'Euro', '€', 'ECB', FALSE, TRUE, 2),
  ('GBP', 'British Pound', '£', 'ECB', FALSE, TRUE, 2),
  ('THB', 'Thai Baht', '฿', 'ECB', FALSE, TRUE, 2),
  ('SGD', 'Singapore Dollar', 'S$', 'ECB', FALSE, TRUE, 2),
  ('MYR', 'Malaysian Ringgit', 'RM', 'ECB', FALSE, TRUE, 2),
  ('BTC', 'Bitcoin', '₿', 'COINGECKO', TRUE, TRUE, 8),
  
  -- Other available ECB currencies (disabled by default)
  ('AUD', 'Australian Dollar', 'A$', 'ECB', FALSE, FALSE, 2),
  ('BGN', 'Bulgarian Lev', 'лв', 'ECB', FALSE, FALSE, 2),
  ('BRL', 'Brazilian Real', 'R$', 'ECB', FALSE, FALSE, 2),
  ('CAD', 'Canadian Dollar', 'C$', 'ECB', FALSE, FALSE, 2),
  ('CHF', 'Swiss Franc', 'Fr', 'ECB', FALSE, FALSE, 2),
  ('CNY', 'Chinese Yuan', '¥', 'ECB', FALSE, FALSE, 2),
  ('CZK', 'Czech Koruna', 'Kč', 'ECB', FALSE, FALSE, 2),
  ('DKK', 'Danish Krone', 'kr', 'ECB', FALSE, FALSE, 2),
  ('HKD', 'Hong Kong Dollar', 'HK$', 'ECB', FALSE, FALSE, 2),
  ('HUF', 'Hungarian Forint', 'Ft', 'ECB', FALSE, FALSE, 2),
  ('IDR', 'Indonesian Rupiah', 'Rp', 'ECB', FALSE, FALSE, 2),
  ('ILS', 'Israeli Shekel', '₪', 'ECB', FALSE, FALSE, 2),
  ('INR', 'Indian Rupee', '₹', 'ECB', FALSE, FALSE, 2),
  ('ISK', 'Icelandic Króna', 'kr', 'ECB', FALSE, FALSE, 2),
  ('JPY', 'Japanese Yen', '¥', 'ECB', FALSE, FALSE, 0),
  ('KRW', 'South Korean Won', '₩', 'ECB', FALSE, FALSE, 0),
  ('MXN', 'Mexican Peso', '$', 'ECB', FALSE, FALSE, 2),
  ('NOK', 'Norwegian Krone', 'kr', 'ECB', FALSE, FALSE, 2),
  ('NZD', 'New Zealand Dollar', 'NZ$', 'ECB', FALSE, FALSE, 2),
  ('PHP', 'Philippine Peso', '₱', 'ECB', FALSE, FALSE, 2),
  ('PLN', 'Polish Złoty', 'zł', 'ECB', FALSE, FALSE, 2),
  ('RON', 'Romanian Leu', 'lei', 'ECB', FALSE, FALSE, 2),
  ('SEK', 'Swedish Krona', 'kr', 'ECB', FALSE, FALSE, 2),
  ('TRY', 'Turkish Lira', '₺', 'ECB', FALSE, FALSE, 2),
  ('ZAR', 'South African Rand', 'R', 'ECB', FALSE, FALSE, 2),
  
  -- Additional crypto currencies (can be enabled later)
  ('ETH', 'Ethereum', 'Ξ', 'COINGECKO', TRUE, FALSE, 8),
  ('USDT', 'Tether', '₮', 'COINGECKO', TRUE, FALSE, 2),
  ('BNB', 'Binance Coin', 'BNB', 'COINGECKO', TRUE, FALSE, 8),
  ('SOL', 'Solana', 'SOL', 'COINGECKO', TRUE, FALSE, 8),
  ('XRP', 'Ripple', 'XRP', 'COINGECKO', TRUE, FALSE, 8),
  ('USDC', 'USD Coin', 'USDC', 'COINGECKO', TRUE, FALSE, 2),
  ('ADA', 'Cardano', 'ADA', 'COINGECKO', TRUE, FALSE, 8),
  ('DOGE', 'Dogecoin', 'Ð', 'COINGECKO', TRUE, FALSE, 8)
ON CONFLICT (currency_code) DO NOTHING;

-- 4. Create function to get tracked currencies
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

-- 5. Create function to update tracked currencies and clean up old data
CREATE OR REPLACE FUNCTION update_tracked_currencies(
  p_currencies VARCHAR(10)[]
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  removed_rates INTEGER
) AS $$
DECLARE
  v_removed_rates INTEGER := 0;
  v_untracked_currencies VARCHAR(10)[];
BEGIN
  -- Start transaction
  -- Update all currencies to untracked
  UPDATE currency_configuration SET is_tracked = FALSE;
  
  -- Set specified currencies as tracked
  UPDATE currency_configuration 
  SET is_tracked = TRUE, updated_at = NOW()
  WHERE currency_code = ANY(p_currencies);
  
  -- Get list of untracked currencies for cleanup
  SELECT ARRAY_AGG(currency_code) INTO v_untracked_currencies
  FROM currency_configuration
  WHERE is_tracked = FALSE;
  
  -- Remove exchange rates for untracked currencies
  IF v_untracked_currencies IS NOT NULL THEN
    DELETE FROM exchange_rates
    WHERE from_currency::text = ANY(v_untracked_currencies)
       OR to_currency::text = ANY(v_untracked_currencies);
    
    GET DIAGNOSTICS v_removed_rates = ROW_COUNT;
  END IF;
  
  RETURN QUERY
  SELECT 
    TRUE as success,
    format('Updated tracked currencies. Removed %s rates for untracked currencies.', v_removed_rates) as message,
    v_removed_rates as removed_rates;
END;
$$ LANGUAGE plpgsql;

-- 6. Create view for available currency pairs based on configuration
CREATE OR REPLACE VIEW available_currency_pairs AS
SELECT DISTINCT
  c1.currency_code as from_currency,
  c2.currency_code as to_currency,
  c1.display_name as from_display_name,
  c2.display_name as to_display_name
FROM currency_configuration c1
CROSS JOIN currency_configuration c2
WHERE c1.currency_code != c2.currency_code
  AND c1.is_tracked = TRUE
  AND c2.is_tracked = TRUE
ORDER BY c1.currency_code, c2.currency_code;

-- 7. Add RLS policies for currency_configuration
ALTER TABLE currency_configuration ENABLE ROW LEVEL SECURITY;

-- Read access for all authenticated users
CREATE POLICY "Authenticated users can view currency configuration" 
ON currency_configuration
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Write access only for admin users (you may want to adjust this based on your admin setup)
CREATE POLICY "Admin users can update currency configuration" 
ON currency_configuration
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.uid() = id 
    AND raw_user_meta_data->>'is_admin' = 'true'
  )
);

-- 8. Add trigger for updated_at
CREATE TRIGGER update_currency_config_updated_at 
BEFORE UPDATE ON currency_configuration
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- 9. Add comments for documentation
COMMENT ON TABLE currency_configuration IS 'Configuration for which currencies are tracked and synced';
COMMENT ON COLUMN currency_configuration.is_tracked IS 'Whether this currency should be fetched and stored during sync operations';
COMMENT ON COLUMN currency_configuration.source IS 'Data source for this currency (ECB for fiat, COINGECKO for crypto)';
COMMENT ON FUNCTION get_tracked_currencies() IS 'Returns list of currencies currently being tracked';
COMMENT ON FUNCTION update_tracked_currencies(VARCHAR[]) IS 'Updates tracked currencies and removes data for untracked ones';