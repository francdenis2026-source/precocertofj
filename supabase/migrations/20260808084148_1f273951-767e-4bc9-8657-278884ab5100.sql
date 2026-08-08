-- 1. ENUMS AND EXTENSIONS
DO $$ BEGIN
    CREATE TYPE public.business_size AS ENUM ('micro', 'small', 'medium', 'large', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.credit_transaction_type AS ENUM ('purchase', 'reward', 'usage', 'refund', 'bonus', 'admin_adjustment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.subscription_status AS ENUM ('trial', 'active', 'past_due', 'cancelled', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.collaboration_status AS ENUM ('pending', 'approved', 'partially_approved', 'rejected', 'suspected_fraud');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS public.system_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    description text,
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id)
);

GRANT SELECT ON public.system_settings TO authenticated, anon;
GRANT ALL ON public.system_settings TO service_role;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Public read for system settings" ON public.system_settings FOR SELECT USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. CREDIT PACKAGES
CREATE TABLE IF NOT EXISTS public.credit_packages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    credits integer NOT NULL,
    price_cents integer NOT NULL,
    bonus_credits integer DEFAULT 0,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT ON public.credit_packages TO authenticated, anon;
GRANT ALL ON public.credit_packages TO service_role;

ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Public read for active credit packages" ON public.credit_packages FOR SELECT USING (active = true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. USER WALLET & TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.user_wallets (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    balance integer NOT NULL DEFAULT 0,
    total_earned integer NOT NULL DEFAULT 0,
    total_spent integer NOT NULL DEFAULT 0,
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT ON public.user_wallets TO authenticated;
GRANT ALL ON public.user_wallets TO service_role;

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view their own wallet" ON public.user_wallets FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type public.credit_transaction_type NOT NULL,
    amount integer NOT NULL,
    description text,
    reference_id text,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view their own transactions" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. MERCHANT ENHANCEMENTS
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS size public.business_size DEFAULT 'small';
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS subscription_status public.subscription_status DEFAULT 'trial';
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.license_plans(id);

-- 6. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    establishment_id uuid REFERENCES public.establishments(id),
    plan_id uuid NOT NULL REFERENCES public.license_plans(id),
    status public.subscription_status NOT NULL DEFAULT 'active',
    start_date timestamptz NOT NULL DEFAULT now(),
    renewal_date timestamptz,
    payment_provider text,
    external_subscription_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7. COLLABORATION ENHANCEMENTS
ALTER TABLE public.collaborator_submissions ADD COLUMN IF NOT EXISTS status public.collaboration_status DEFAULT 'pending';
ALTER TABLE public.collaborator_submissions ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE public.collaborator_submissions ADD COLUMN IF NOT EXISTS points_awarded integer DEFAULT 0;
ALTER TABLE public.collaborator_submissions ADD COLUMN IF NOT EXISTS processed_at timestamptz;
ALTER TABLE public.collaborator_submissions ADD COLUMN IF NOT EXISTS processed_by uuid REFERENCES auth.users(id);

-- 8. TRIGGER FOR WALLET CREATION
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_wallets (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();

-- Seeding initial settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
('consumer_premium_price', '{"cents": 790, "currency": "BRL"}', 'Preço inicial da assinatura PreçoCerto+'),
('credit_usage_cost', '{"smart_basket": 1, "ai_optimization": 1}', 'Custo em créditos por funcionalidade'),
('collaboration_rewards', '{"small_receipt": 10, "large_receipt": 30, "new_product_bonus": 5}', 'Recompensas por colaboração')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.credit_packages (name, credits, price_cents, bonus_credits)
VALUES 
('Básico', 3, 200, 0),
('Econômico', 10, 500, 2),
('Super', 25, 1000, 5)
ON CONFLICT DO NOTHING;
