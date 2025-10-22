-- Migration: add_vendor_duplicate_suggestions
-- Created: 2025-10-22 15:09:08

BEGIN;

-- Create enum for duplicate suggestion status
DO $$ BEGIN
    CREATE TYPE duplicate_status AS ENUM ('pending', 'ignored', 'merged');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create vendor_duplicate_suggestions table
CREATE TABLE IF NOT EXISTS public.vendor_duplicate_suggestions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  source_vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  target_vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  confidence_score DECIMAL(5, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  status duplicate_status NOT NULL DEFAULT 'pending',
  reasons TEXT[], -- Array of reasons why these vendors are considered duplicates
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE, -- When the suggestion was ignored or merged

  -- Constraints
  CONSTRAINT different_vendors CHECK (source_vendor_id != target_vendor_id),
  CONSTRAINT unique_suggestion UNIQUE(user_id, source_vendor_id, target_vendor_id)
);

-- Create indexes for performance
CREATE INDEX idx_vendor_duplicates_user_id ON public.vendor_duplicate_suggestions(user_id);
CREATE INDEX idx_vendor_duplicates_status ON public.vendor_duplicate_suggestions(status);
CREATE INDEX idx_vendor_duplicates_source_vendor ON public.vendor_duplicate_suggestions(source_vendor_id);
CREATE INDEX idx_vendor_duplicates_target_vendor ON public.vendor_duplicate_suggestions(target_vendor_id);
CREATE INDEX idx_vendor_duplicates_confidence ON public.vendor_duplicate_suggestions(confidence_score DESC);

-- Enable Row Level Security
ALTER TABLE public.vendor_duplicate_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own duplicate suggestions
CREATE POLICY "Users can view their own duplicate suggestions"
  ON public.vendor_duplicate_suggestions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own duplicate suggestions"
  ON public.vendor_duplicate_suggestions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own duplicate suggestions"
  ON public.vendor_duplicate_suggestions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own duplicate suggestions"
  ON public.vendor_duplicate_suggestions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vendor_duplicate_suggestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF (NEW.status != OLD.status AND NEW.status IN ('ignored', 'merged')) THEN
    NEW.resolved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER update_vendor_duplicate_suggestions_timestamp
BEFORE UPDATE ON public.vendor_duplicate_suggestions
FOR EACH ROW
EXECUTE FUNCTION update_vendor_duplicate_suggestions_updated_at();

COMMIT;
