-- =====================================================================
-- 010 - Phase 1f: custom domains for the storefront (PRODUCT_ROADMAP.md §6a)
--   * storefront_domains : one custom host per org, with DNS-verification +
--     cert lifecycle state. `domain` is globally UNIQUE (DB-level) so two orgs
--     can never claim the same host.
--   * plans.features.custom_domain : paid-tier flag (mirrors `storefront`)
-- Idempotent.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.storefront_domains (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id    uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain             varchar NOT NULL,
  kind               varchar NOT NULL DEFAULT 'apex',      -- apex | subdomain
  status             varchar NOT NULL DEFAULT 'pending',   -- pending | verifying | active | failed
  verification_token varchar NOT NULL,
  dns_target         varchar,                              -- the CNAME / A value we told them to set
  verified_at        timestamptz,
  cert_status        varchar NOT NULL DEFAULT 'none',      -- none | issuing | issued | failed
  cert_expires_at    timestamptz,
  last_checked_at    timestamptz,
  failure_reason     varchar,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT storefront_domains_domain_uniq UNIQUE (domain),
  CONSTRAINT storefront_domains_kind_chk   CHECK (kind IN ('apex','subdomain')),
  CONSTRAINT storefront_domains_status_chk CHECK (status IN ('pending','verifying','active','failed')),
  CONSTRAINT storefront_domains_cert_chk   CHECK (cert_status IN ('none','issuing','issued','failed'))
);
CREATE INDEX IF NOT EXISTS idx_storefront_domains_active
  ON public.storefront_domains(domain) WHERE status = 'active';

-- custom_domain is a paid feature — on for pro & enterprise
UPDATE public.plans
SET features = jsonb_set(features, '{custom_domain}', 'true'::jsonb)
WHERE code IN ('pro', 'enterprise');

UPDATE public.plans
SET features = jsonb_set(features, '{custom_domain}', 'false'::jsonb)
WHERE code IN ('free', 'basic') AND NOT (features ? 'custom_domain');
