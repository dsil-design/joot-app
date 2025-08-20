-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types (only if they don't exist)
DO $$ BEGIN
    CREATE TYPE currency_type AS ENUM ('USD', 'THB');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('income', 'expense');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  preferred_currency currency_type DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID,
  payment_method_id UUID,
  description TEXT,
  amount_usd DECIMAL(12, 2) NOT NULL, -- Always store USD amount
  amount_thb DECIMAL(12, 2) NOT NULL, -- Always store THB amount
  exchange_rate DECIMAL(10, 4) NOT NULL, -- Exchange rate used for conversion
  original_currency currency_type NOT NULL, -- Which currency was originally entered
  transaction_type transaction_type NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_amounts CHECK (amount_usd > 0 AND amount_thb > 0),
  CONSTRAINT positive_exchange_rate CHECK (exchange_rate > 0)
);

-- Payment methods table
CREATE TABLE public.payment_methods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, user_id)
);

-- Vendors table
CREATE TABLE public.vendors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, user_id)
);

-- Exchange rates table (for historical tracking)
CREATE TABLE public.exchange_rates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  from_currency currency_type NOT NULL,
  to_currency currency_type NOT NULL,
  rate DECIMAL(10, 4) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_rate CHECK (rate > 0),
  CONSTRAINT different_currencies CHECK (from_currency != to_currency),
  UNIQUE(from_currency, to_currency, date)
);

-- Create indexes for better performance
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date DESC);
CREATE INDEX idx_transactions_vendor_id ON public.transactions(vendor_id);
CREATE INDEX idx_transactions_payment_method_id ON public.transactions(payment_method_id);
CREATE INDEX idx_payment_methods_user_id ON public.payment_methods(user_id);
CREATE INDEX idx_payment_methods_name ON public.payment_methods(name);
CREATE INDEX idx_vendors_user_id ON public.vendors(user_id);
CREATE INDEX idx_vendors_name ON public.vendors(name);
CREATE INDEX idx_exchange_rates_date ON public.exchange_rates(date DESC);
CREATE INDEX idx_exchange_rates_currencies ON public.exchange_rates(from_currency, to_currency);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for transactions table
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for payment_methods table
CREATE POLICY "Users can view own payment methods" ON public.payment_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment methods" ON public.payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment methods" ON public.payment_methods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods" ON public.payment_methods
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for vendors table
CREATE POLICY "Users can view own vendors" ON public.vendors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vendors" ON public.vendors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vendors" ON public.vendors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vendors" ON public.vendors
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for exchange_rates table (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view exchange rates" ON public.exchange_rates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Create default payment methods for new user
  INSERT INTO public.payment_methods (name, user_id) VALUES
    ('Cash', NEW.id),
    ('Credit Card', NEW.id),
    ('Bank Account', NEW.id),
    ('Bank Transfer', NEW.id);
  
  -- Create default vendors for new user
  INSERT INTO public.vendors (name, user_id) VALUES
    ('McDonalds', NEW.id),
    ('Starbucks', NEW.id),
    ('Amazon', NEW.id),
    ('Target', NEW.id),
    ('Uber', NEW.id),
    ('Netflix', NEW.id),
    ('Spotify', NEW.id),
    ('Shell', NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add foreign key constraints after all tables are created
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_vendor_id_fkey 
FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_payment_method_id_fkey 
FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) ON DELETE SET NULL;

-- Insert some sample exchange rates
INSERT INTO public.exchange_rates (from_currency, to_currency, rate, date) VALUES
  ('USD', 'THB', 35.50, CURRENT_DATE),
  ('THB', 'USD', 0.0282, CURRENT_DATE)
ON CONFLICT (from_currency, to_currency, date) DO NOTHING;
