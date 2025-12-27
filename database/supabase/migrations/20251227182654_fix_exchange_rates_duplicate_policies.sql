-- Migration: fix_exchange_rates_duplicate_policies
-- Created: 2025-12-27 18:26:54
-- Description: Fix multiple permissive policies on exchange_rates table
--
-- Issue: "Admins can manage exchange rates" uses FOR ALL which includes SELECT,
-- but "Authenticated users can view exchange rates" already covers SELECT.
-- This creates duplicate SELECT policies.
--
-- Fix: Replace the FOR ALL admin policy with separate INSERT, UPDATE, DELETE policies.

BEGIN;

-- Drop the overlapping "FOR ALL" policy
DROP POLICY IF EXISTS "Admins can manage exchange rates" ON public.exchange_rates;

-- Create separate policies for each write action (not SELECT)
CREATE POLICY "Admins can insert exchange rates" ON public.exchange_rates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE (select auth.uid()) = id
      AND raw_user_meta_data->>'is_admin' = 'true'
    )
  );

CREATE POLICY "Admins can update exchange rates" ON public.exchange_rates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE (select auth.uid()) = id
      AND raw_user_meta_data->>'is_admin' = 'true'
    )
  );

CREATE POLICY "Admins can delete exchange rates" ON public.exchange_rates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE (select auth.uid()) = id
      AND raw_user_meta_data->>'is_admin' = 'true'
    )
  );

COMMIT;
