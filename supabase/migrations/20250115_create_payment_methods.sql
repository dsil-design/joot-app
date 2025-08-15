-- Create payment_methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add unique constraint to prevent duplicate payment method names per user
    CONSTRAINT payment_methods_unique_name_per_user UNIQUE (name, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON public.payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_name ON public.payment_methods(name);

-- Enable Row Level Security
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can only see and manage their own payment methods)
CREATE POLICY "Users can view their own payment methods" 
    ON public.payment_methods 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment methods" 
    ON public.payment_methods 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods" 
    ON public.payment_methods 
    FOR UPDATE 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods" 
    ON public.payment_methods 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_methods_updated_at 
    BEFORE UPDATE ON public.payment_methods 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- Populate default payment methods for all existing users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM auth.users LOOP
        INSERT INTO public.payment_methods (name, user_id) VALUES
            ('Cash', user_record.id),
            ('Credit Card', user_record.id),
            ('Bank Account', user_record.id),
            ('Bank Transfer', user_record.id)
        ON CONFLICT (name, user_id) DO NOTHING;
    END LOOP;
END $$;

-- Create function to automatically add default payment methods for new users
CREATE OR REPLACE FUNCTION public.create_default_payment_methods()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.payment_methods (name, user_id) VALUES
        ('Cash', NEW.id),
        ('Credit Card', NEW.id),
        ('Bank Account', NEW.id),
        ('Bank Transfer', NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to add default payment methods when a new user is created
CREATE TRIGGER create_user_payment_methods
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_payment_methods();