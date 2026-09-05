-- =====================================================================
-- 002 - SaaS plans + platform administration
--   * platform-superadmin flag on users
--   * plans catalogue
--   * organization <-> plan link + subscription lifecycle
--   * subscription_events audit trail
-- Idempotent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- platform superadmin
-- ---------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------
-- plans
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plans (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code           varchar NOT NULL UNIQUE,
  name           varchar NOT NULL,
  description    text,
  price_monthly  numeric NOT NULL DEFAULT 0,
  price_yearly   numeric NOT NULL DEFAULT 0,
  currency       varchar NOT NULL DEFAULT 'USD',
  max_users      integer,          -- NULL = unlimited
  max_products   integer,          -- NULL = unlimited
  trial_days     integer NOT NULL DEFAULT 14,
  features       jsonb   NOT NULL DEFAULT '{}'::jsonb,
  is_active      boolean NOT NULL DEFAULT true,
  is_public      boolean NOT NULL DEFAULT true,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- organization subscription columns
-- ---------------------------------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id);
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan_status varchar DEFAULT 'trialing';   -- trialing | active | past_due | suspended | canceled
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan_started_at timestamptz;
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan_current_period_end timestamptz;
CREATE INDEX IF NOT EXISTS idx_organizations_plan_id ON public.organizations(plan_id);

-- ---------------------------------------------------------------------
-- subscription_events (back-office audit of plan/access changes)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type       varchar NOT NULL,   -- created | plan_changed | access_extended | suspended | reactivated
  from_plan_id     uuid REFERENCES public.plans(id),
  to_plan_id       uuid REFERENCES public.plans(id),
  notes            text,
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
  performed_by     uuid REFERENCES public.users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscription_events_org ON public.subscription_events(organization_id);

-- ---------------------------------------------------------------------
-- default plan catalogue
-- ---------------------------------------------------------------------
INSERT INTO public.plans
  (code, name, description, price_monthly, price_yearly, max_users, max_products, trial_days, features, sort_order)
VALUES
  ('free',       'Free',       'Single counter, limited catalogue',        0,    0,     2,   200,  0,
   '{"ai_analytics": false, "purchase_orders": false, "multi_branch": false, "exports": false, "api_access": false}'::jsonb, 0),
  ('basic',      'Basic',      'Small pharmacy, one branch',              29,  290,     5,  2000, 14,
   '{"ai_analytics": false, "purchase_orders": true,  "multi_branch": false, "exports": true,  "api_access": false}'::jsonb, 1),
  ('pro',        'Pro',        'Growing store with analytics',            79,  790,    20, 20000, 14,
   '{"ai_analytics": true,  "purchase_orders": true,  "multi_branch": true,  "exports": true,  "api_access": true}'::jsonb,  2),
  ('enterprise', 'Enterprise', 'Unlimited users and catalogue, priority', 199, 1990,  NULL,  NULL, 30,
   '{"ai_analytics": true,  "purchase_orders": true,  "multi_branch": true,  "exports": true,  "api_access": true}'::jsonb,  3)
ON CONFLICT (code) DO NOTHING;

-- put any org without a plan on Basic / active
UPDATE public.organizations o
SET plan_id = p.id,
    plan_status = 'active',
    plan_started_at = COALESCE(o.plan_started_at, now())
FROM public.plans p
WHERE p.code = 'basic' AND o.plan_id IS NULL;
