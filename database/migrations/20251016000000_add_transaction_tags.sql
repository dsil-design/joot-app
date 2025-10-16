-- Migration: Add transaction tags support
-- Created: 2025-10-16
-- Description: Adds tags table and transaction_tags junction table for many-to-many relationship

-- Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#dbeafe', -- Default to blue-100
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, user_id)
);

-- Create transaction_tags junction table
CREATE TABLE IF NOT EXISTS public.transaction_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(transaction_id, tag_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON public.tags(name);
CREATE INDEX IF NOT EXISTS idx_transaction_tags_transaction_id ON public.transaction_tags(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_tags_tag_id ON public.transaction_tags(tag_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tags table
CREATE POLICY "Users can view own tags" ON public.tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags" ON public.tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags" ON public.tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags" ON public.tags
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for transaction_tags table
-- Users can view transaction_tags for their own transactions
CREATE POLICY "Users can view own transaction tags" ON public.transaction_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = transaction_tags.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own transaction tags" ON public.transaction_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = transaction_tags.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own transaction tags" ON public.transaction_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = transaction_tags.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

-- Create trigger for updated_at column on tags
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get next available tag color
CREATE OR REPLACE FUNCTION get_next_tag_color(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_colors TEXT[] := ARRAY['#dbeafe', '#dcfce7', '#fef3c7', '#ffe2e2', '#f4f4f5', '#bedbff', '#b9f8cf', '#fee685'];
  v_used_colors TEXT[];
  v_available_colors TEXT[];
  v_next_color TEXT;
BEGIN
  -- Get all colors currently used by this user
  SELECT ARRAY_AGG(DISTINCT color) INTO v_used_colors
  FROM public.tags
  WHERE user_id = p_user_id;

  -- If no colors used yet, return first color
  IF v_used_colors IS NULL THEN
    RETURN v_colors[1];
  END IF;

  -- Find colors not yet used
  SELECT ARRAY_AGG(c) INTO v_available_colors
  FROM UNNEST(v_colors) AS c
  WHERE c NOT IN (SELECT UNNEST(v_used_colors));

  -- If there are available colors, return the first one
  IF v_available_colors IS NOT NULL AND array_length(v_available_colors, 1) > 0 THEN
    RETURN v_available_colors[1];
  END IF;

  -- If all colors are used, cycle back to first color
  RETURN v_colors[1];
END;
$$ LANGUAGE plpgsql;
