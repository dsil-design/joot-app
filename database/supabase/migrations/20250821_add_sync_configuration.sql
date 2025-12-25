-- Migration: Add Exchange Rate Sync Configuration and Tracking
-- This migration adds tables for managing the daily ECB sync process

-- 1. Sync configuration table (singleton pattern - only one row)
CREATE TABLE IF NOT EXISTS sync_configuration (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  start_date DATE NOT NULL DEFAULT '2017-01-01',
  auto_sync_enabled BOOLEAN DEFAULT TRUE,
  sync_time TIME DEFAULT '17:00:00', -- 5 PM UTC (after ECB updates at 16:00 CET)
  max_retries INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 300, -- 5 minutes
  last_modified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row_check CHECK (id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid) -- Ensures only one row
);

-- 2. Sync history table for tracking all sync operations
CREATE TABLE IF NOT EXISTS sync_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL, -- 'manual', 'scheduled', 'auto_retry'
  status VARCHAR(50) NOT NULL, -- 'running', 'completed', 'failed', 'cancelled'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  
  -- Statistics
  total_rates_in_xml INTEGER,
  filtered_rates INTEGER, -- After currency & date filtering
  new_rates_inserted INTEGER DEFAULT 0,
  rates_updated INTEGER DEFAULT 0,
  rates_deleted INTEGER DEFAULT 0,
  rates_unchanged INTEGER DEFAULT 0,
  
  -- Configuration snapshot at time of sync
  currencies_tracked TEXT[], -- Array of currency codes
  start_date DATE,
  end_date DATE,
  
  -- Error tracking
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  retry_of UUID REFERENCES sync_history(id), -- Links to original sync if this is a retry
  
  -- Metadata
  triggered_by UUID REFERENCES auth.users(id),
  xml_file_size_bytes INTEGER,
  xml_download_time_ms INTEGER,
  processing_time_ms INTEGER,
  database_time_ms INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Sync logs table for detailed debugging
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_history_id UUID REFERENCES sync_history(id) ON DELETE CASCADE,
  log_level VARCHAR(20) NOT NULL, -- 'debug', 'info', 'warning', 'error'
  phase VARCHAR(50) NOT NULL, -- 'download', 'parse', 'filter', 'diff', 'update', 'cleanup'
  message TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Rate changes audit table (tracks what changed)
CREATE TABLE IF NOT EXISTS rate_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_history_id UUID REFERENCES sync_history(id) ON DELETE CASCADE,
  exchange_rate_id UUID REFERENCES exchange_rates(id) ON DELETE CASCADE,
  change_type VARCHAR(20) NOT NULL, -- 'insert', 'update', 'delete'
  
  -- For updates, track the changes
  old_rate DECIMAL(10, 4),
  new_rate DECIMAL(10, 4),
  rate_date DATE NOT NULL,
  from_currency VARCHAR(10) NOT NULL,
  to_currency VARCHAR(10) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON sync_history(status);
CREATE INDEX IF NOT EXISTS idx_sync_history_started_at ON sync_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_history_triggered_by ON sync_history(triggered_by);
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_history ON sync_logs(sync_history_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_level ON sync_logs(log_level);
CREATE INDEX IF NOT EXISTS idx_sync_logs_phase ON sync_logs(phase);
CREATE INDEX IF NOT EXISTS idx_rate_changes_sync_history ON rate_changes(sync_history_id);
CREATE INDEX IF NOT EXISTS idx_rate_changes_type ON rate_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_rate_changes_date ON rate_changes(rate_date DESC);

-- 6. Insert default configuration
INSERT INTO sync_configuration (
  id,
  start_date,
  auto_sync_enabled,
  sync_time,
  max_retries,
  retry_delay_seconds
) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  '2017-01-01',
  TRUE,
  '17:00:00',
  3,
  300
) ON CONFLICT (id) DO NOTHING;

-- 7. Functions for sync management

-- Function to get current sync configuration
CREATE OR REPLACE FUNCTION get_sync_configuration()
RETURNS TABLE(
  start_date DATE,
  auto_sync_enabled BOOLEAN,
  sync_time TIME,
  max_retries INTEGER,
  retry_delay_seconds INTEGER,
  tracked_currencies TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.start_date,
    sc.auto_sync_enabled,
    sc.sync_time,
    sc.max_retries,
    sc.retry_delay_seconds,
    ARRAY_AGG(cc.currency_code ORDER BY cc.currency_code) as tracked_currencies
  FROM sync_configuration sc
  CROSS JOIN currency_configuration cc
  WHERE cc.is_tracked = TRUE
    AND cc.source = 'ECB'
  GROUP BY sc.id, sc.start_date, sc.auto_sync_enabled, sc.sync_time, 
           sc.max_retries, sc.retry_delay_seconds;
END;
$$ LANGUAGE plpgsql;

-- Function to update sync configuration
CREATE OR REPLACE FUNCTION update_sync_configuration(
  p_start_date DATE DEFAULT NULL,
  p_auto_sync_enabled BOOLEAN DEFAULT NULL,
  p_sync_time TIME DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE sync_configuration
  SET 
    start_date = COALESCE(p_start_date, start_date),
    auto_sync_enabled = COALESCE(p_auto_sync_enabled, auto_sync_enabled),
    sync_time = COALESCE(p_sync_time, sync_time),
    last_modified_by = p_user_id,
    updated_at = NOW()
  WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get latest sync status
CREATE OR REPLACE FUNCTION get_latest_sync_status()
RETURNS TABLE(
  id UUID,
  sync_type VARCHAR(50),
  status VARCHAR(50),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  new_rates_inserted INTEGER,
  rates_updated INTEGER,
  rates_deleted INTEGER,
  rates_unchanged INTEGER,
  error_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sh.id,
    sh.sync_type,
    sh.status,
    sh.started_at,
    sh.completed_at,
    sh.duration_ms,
    sh.new_rates_inserted,
    sh.rates_updated,
    sh.rates_deleted,
    sh.rates_unchanged,
    sh.error_message
  FROM sync_history sh
  ORDER BY sh.started_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get sync statistics
CREATE OR REPLACE FUNCTION get_sync_statistics(
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  total_syncs INTEGER,
  successful_syncs INTEGER,
  failed_syncs INTEGER,
  average_duration_ms INTEGER,
  total_rates_inserted INTEGER,
  total_rates_updated INTEGER,
  last_successful_sync TIMESTAMP WITH TIME ZONE,
  last_failed_sync TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_syncs,
    COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as successful_syncs,
    COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as failed_syncs,
    AVG(duration_ms)::INTEGER as average_duration_ms,
    SUM(new_rates_inserted)::INTEGER as total_rates_inserted,
    SUM(rates_updated)::INTEGER as total_rates_updated,
    MAX(completed_at) FILTER (WHERE status = 'completed') as last_successful_sync,
    MAX(completed_at) FILTER (WHERE status = 'failed') as last_failed_sync
  FROM sync_history
  WHERE started_at >= NOW() - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql;

-- 8. RLS Policies
ALTER TABLE sync_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_changes ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated users
CREATE POLICY "Authenticated users can view sync configuration" 
ON sync_configuration FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view sync history" 
ON sync_history FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view sync logs" 
ON sync_logs FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view rate changes" 
ON rate_changes FOR SELECT 
USING (auth.role() = 'authenticated');

-- Write access for admin users
CREATE POLICY "Admin users can update sync configuration" 
ON sync_configuration FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.uid() = id 
    AND raw_user_meta_data->>'is_admin' = 'true'
  )
);

CREATE POLICY "Admin users can insert sync history" 
ON sync_history FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.uid() = id 
    AND raw_user_meta_data->>'is_admin' = 'true'
  )
);

-- 9. Triggers for updated_at
CREATE TRIGGER update_sync_configuration_updated_at 
BEFORE UPDATE ON sync_configuration
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- 10. Comments for documentation
COMMENT ON TABLE sync_configuration IS 'Singleton configuration for ECB sync process';
COMMENT ON TABLE sync_history IS 'History of all sync operations with statistics';
COMMENT ON TABLE sync_logs IS 'Detailed logs for debugging sync operations';
COMMENT ON TABLE rate_changes IS 'Audit trail of all rate changes during syncs';
COMMENT ON FUNCTION get_sync_configuration() IS 'Returns current sync configuration with tracked currencies';
COMMENT ON FUNCTION update_sync_configuration(DATE, BOOLEAN, TIME, UUID) IS 'Updates sync configuration settings';
COMMENT ON FUNCTION get_latest_sync_status() IS 'Returns the status of the most recent sync';
COMMENT ON FUNCTION get_sync_statistics(INTEGER) IS 'Returns sync statistics for the specified number of days';