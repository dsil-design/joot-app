-- Add missing INSERT and DELETE RLS policies for transaction_proposals

CREATE POLICY "Users can insert own proposals"
  ON public.transaction_proposals FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own proposals"
  ON public.transaction_proposals FOR DELETE
  USING ((SELECT auth.uid()) = user_id);
