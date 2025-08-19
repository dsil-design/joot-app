


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."currency_type" AS ENUM (
    'USD',
    'THB',
    'EUR',
    'GBP',
    'SGD',
    'VND',
    'MYR',
    'BTC',
    'JPY',
    'CHF',
    'CAD',
    'AUD',
    'NZD',
    'SEK',
    'NOK',
    'DKK',
    'PLN',
    'CZK',
    'HUF',
    'BGN',
    'RON',
    'ISK',
    'TRY',
    'RUB',
    'HRK',
    'CNY',
    'INR',
    'KRW',
    'BRL',
    'ZAR',
    'MXN',
    'ILS',
    'HKD',
    'PHP',
    'IDR'
);


ALTER TYPE "public"."currency_type" OWNER TO "postgres";


CREATE TYPE "public"."transaction_type" AS ENUM (
    'income',
    'expense'
);


ALTER TYPE "public"."transaction_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_payment_methods"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO public.payment_methods (name, user_id) VALUES
        ('Cash', NEW.id),
        ('Credit Card', NEW.id),
        ('Bank Account', NEW.id),
        ('Bank Transfer', NEW.id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_default_payment_methods"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_vendors"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO public.vendors (name, user_id) VALUES
        -- Food & Dining
        ('McDonald''s', NEW.id),
        ('Starbucks', NEW.id),
        ('Pizza Hut', NEW.id),
        ('Subway', NEW.id),
        
        -- Grocery & Shopping
        ('Whole Foods', NEW.id),
        ('Trader Joe''s', NEW.id),
        ('Costco', NEW.id),
        ('Amazon', NEW.id),
        ('Target', NEW.id),
        
        -- Transportation
        ('Uber', NEW.id),
        ('Lyft', NEW.id),
        ('Shell', NEW.id),
        ('Chevron', NEW.id),
        
        -- Entertainment & Services
        ('Netflix', NEW.id),
        ('Spotify', NEW.id),
        ('Gym Membership', NEW.id),
        
        -- Utilities & Bills
        ('Electric Company', NEW.id),
        ('Internet Provider', NEW.id),
        ('Phone Company', NEW.id),
        
        -- Retail
        ('Best Buy', NEW.id),
        ('Nike', NEW.id)
    ON CONFLICT (name, user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_default_vendors"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_exchange_rate_with_fallback"("p_from_currency" "public"."currency_type", "p_to_currency" "public"."currency_type", "p_date" "date", "p_max_days_back" integer DEFAULT 7) RETURNS TABLE("rate" numeric, "actual_date" "date", "source" character varying, "is_interpolated" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- First try exact date match
    RETURN QUERY
    SELECT er.rate, er.date, er.source, er.is_interpolated
    FROM exchange_rates er
    WHERE er.from_currency = p_from_currency
      AND er.to_currency = p_to_currency
      AND er.date = p_date
    ORDER BY er.is_interpolated ASC  -- Prefer actual rates over interpolated
    LIMIT 1;
    
    -- If no exact match found, try finding the most recent rate within the specified range
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT er.rate, er.date, er.source, er.is_interpolated
        FROM exchange_rates er
        WHERE er.from_currency = p_from_currency
          AND er.to_currency = p_to_currency
          AND er.date >= p_date - p_max_days_back
          AND er.date <= p_date
        ORDER BY er.date DESC, er.is_interpolated ASC
        LIMIT 1;
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_exchange_rate_with_fallback"("p_from_currency" "public"."currency_type", "p_to_currency" "public"."currency_type", "p_date" "date", "p_max_days_back" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_exchange_rate_with_fallback"("p_from_currency" "public"."currency_type", "p_to_currency" "public"."currency_type", "p_date" "date", "p_max_days_back" integer) IS 'Get exchange rate with fallback logic: exact date first, then most recent within specified range';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Create default categories for new user
  INSERT INTO public.transaction_categories (name, color, icon, user_id) VALUES
    ('Food & Dining', '#ef4444', 'utensils', NEW.id),
    ('Transportation', '#3b82f6', 'car', NEW.id),
    ('Shopping', '#8b5cf6', 'shopping-bag', NEW.id),
    ('Entertainment', '#f59e0b', 'film', NEW.id),
    ('Bills & Utilities', '#10b981', 'receipt', NEW.id),
    ('Healthcare', '#ec4899', 'heart', NEW.id),
    ('Income', '#22c55e', 'trending-up', NEW.id),
    ('Other', '#6b7280', 'circle', NEW.id);
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."exchange_rates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "from_currency" "public"."currency_type" NOT NULL,
    "to_currency" "public"."currency_type" NOT NULL,
    "rate" numeric(10,4) NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "source" character varying(50) DEFAULT 'ECB'::character varying,
    "is_interpolated" boolean DEFAULT false,
    "interpolated_from_date" "date",
    CONSTRAINT "chk_interpolated_date" CHECK (((("is_interpolated" = false) AND ("interpolated_from_date" IS NULL)) OR (("is_interpolated" = true) AND ("interpolated_from_date" IS NOT NULL)))),
    CONSTRAINT "chk_positive_rate" CHECK (("rate" > (0)::numeric)),
    CONSTRAINT "chk_source_not_empty" CHECK ((("source" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "source")) > 0))),
    CONSTRAINT "different_currencies" CHECK (("from_currency" <> "to_currency")),
    CONSTRAINT "positive_rate" CHECK (("rate" > (0)::numeric))
);


ALTER TABLE "public"."exchange_rates" OWNER TO "postgres";


COMMENT ON COLUMN "public"."exchange_rates"."source" IS 'Data source provider (e.g., ECB, Yahoo Finance)';



COMMENT ON COLUMN "public"."exchange_rates"."is_interpolated" IS 'True if this rate was calculated/interpolated from other dates';



COMMENT ON COLUMN "public"."exchange_rates"."interpolated_from_date" IS 'The date from which this rate was interpolated';



CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "description" "text",
    "amount_usd" numeric(12,2) NOT NULL,
    "amount_thb" numeric(12,2) NOT NULL,
    "exchange_rate" numeric(10,4) NOT NULL,
    "original_currency" "public"."currency_type" NOT NULL,
    "transaction_type" "public"."transaction_type" NOT NULL,
    "transaction_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "payment_method" "text",
    "vendor_id" "uuid",
    "title" "text",
    "vendor" "text",
    "payment_method_id" "uuid",
    CONSTRAINT "positive_amounts" CHECK ((("amount_usd" > (0)::numeric) AND ("amount_thb" > (0)::numeric))),
    CONSTRAINT "positive_exchange_rate" CHECK (("exchange_rate" > (0)::numeric))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "avatar_url" "text",
    "preferred_currency" "public"."currency_type" DEFAULT 'USD'::"public"."currency_type",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "first_name" "text",
    "last_name" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendors" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vendors" OWNER TO "postgres";


ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_from_currency_to_currency_date_key" UNIQUE ("from_currency", "to_currency", "date");



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_unique_name_per_user" UNIQUE ("name", "user_id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_name_user_id_key" UNIQUE ("name", "user_id");



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_exchange_rates_currencies" ON "public"."exchange_rates" USING "btree" ("from_currency", "to_currency");



CREATE INDEX "idx_exchange_rates_date" ON "public"."exchange_rates" USING "btree" ("date" DESC);



CREATE INDEX "idx_exchange_rates_interpolated" ON "public"."exchange_rates" USING "btree" ("is_interpolated", "interpolated_from_date");



CREATE INDEX "idx_exchange_rates_lookup" ON "public"."exchange_rates" USING "btree" ("from_currency", "to_currency", "date" DESC);



CREATE INDEX "idx_exchange_rates_recent_actual" ON "public"."exchange_rates" USING "btree" ("from_currency", "to_currency", "date" DESC) WHERE ("is_interpolated" = false);



CREATE INDEX "idx_exchange_rates_source" ON "public"."exchange_rates" USING "btree" ("source");



CREATE INDEX "idx_payment_methods_name" ON "public"."payment_methods" USING "btree" ("name");



CREATE INDEX "idx_payment_methods_user_id" ON "public"."payment_methods" USING "btree" ("user_id");



CREATE INDEX "idx_transactions_date" ON "public"."transactions" USING "btree" ("transaction_date" DESC);



CREATE INDEX "idx_transactions_payment_method" ON "public"."transactions" USING "btree" ("payment_method");



CREATE INDEX "idx_transactions_payment_method_id" ON "public"."transactions" USING "btree" ("payment_method_id");



CREATE INDEX "idx_transactions_user_id" ON "public"."transactions" USING "btree" ("user_id");



CREATE INDEX "idx_transactions_vendor" ON "public"."transactions" USING "btree" ("vendor");



CREATE INDEX "idx_transactions_vendor_id" ON "public"."transactions" USING "btree" ("vendor_id");



CREATE INDEX "idx_vendors_user_id" ON "public"."vendors" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "create_user_vendors" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_vendors"();



CREATE OR REPLACE TRIGGER "update_payment_methods_updated_at" BEFORE UPDATE ON "public"."payment_methods" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_transactions_updated_at" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_vendors_updated_at" BEFORE UPDATE ON "public"."vendors" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can view exchange rates" ON "public"."exchange_rates" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can delete own transactions" ON "public"."transactions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own vendors" ON "public"."vendors" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own payment methods" ON "public"."payment_methods" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own transactions" ON "public"."transactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own vendors" ON "public"."vendors" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own payment methods" ON "public"."payment_methods" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own transactions" ON "public"."transactions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own vendors" ON "public"."vendors" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own payment methods" ON "public"."payment_methods" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own transactions" ON "public"."transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own vendors" ON "public"."vendors" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own payment methods" ON "public"."payment_methods" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."payment_methods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendors" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_payment_methods"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_payment_methods"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_payment_methods"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_vendors"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_vendors"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_vendors"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_exchange_rate_with_fallback"("p_from_currency" "public"."currency_type", "p_to_currency" "public"."currency_type", "p_date" "date", "p_max_days_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_exchange_rate_with_fallback"("p_from_currency" "public"."currency_type", "p_to_currency" "public"."currency_type", "p_date" "date", "p_max_days_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exchange_rate_with_fallback"("p_from_currency" "public"."currency_type", "p_to_currency" "public"."currency_type", "p_date" "date", "p_max_days_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."exchange_rates" TO "anon";
GRANT ALL ON TABLE "public"."exchange_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."exchange_rates" TO "service_role";



GRANT ALL ON TABLE "public"."payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."vendors" TO "anon";
GRANT ALL ON TABLE "public"."vendors" TO "authenticated";
GRANT ALL ON TABLE "public"."vendors" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






RESET ALL;
