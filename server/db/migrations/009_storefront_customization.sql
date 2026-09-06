-- =====================================================================
-- 009 - Phase 1e: storefront self-serve customization
--   * storefront_settings.accent_color   : per-tenant brand accent (hex)
--   * storefront_banners                 : ordered homepage banners (scheduled)
--   * storefront_deals                   : per-product % discount, date-windowed
--   * storefront_featured_products       : curated homepage list
-- White-label per tenant (PRODUCT_ROADMAP.md §5). Idempotent.
-- =====================================================================

ALTER TABLE public.storefront_settings
  ADD COLUMN IF NOT EXISTS accent_color varchar;

-- ---------------------------------------------------------------------
-- storefront_banners
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.storefront_banners (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  headline         varchar,
  subheadline      varchar,
  cta_label        varchar,
  cta_href         varchar,
  image_url        text,
  bg_style         varchar NOT NULL DEFAULT 'color',   -- color | gradient | image
  bg_value         varchar,
  sort_order       integer NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true,
  starts_at        timestamptz,
  ends_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT storefront_banners_bg_style_chk CHECK (bg_style IN ('color','gradient','image'))
);
CREATE INDEX IF NOT EXISTS idx_storefront_banners_org ON public.storefront_banners(organization_id, sort_order);

-- ---------------------------------------------------------------------
-- storefront_deals  (one active deal per product per org)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.storefront_deals (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id       uuid NOT NULL,
  discount_pct     numeric NOT NULL,
  starts_at        timestamptz,
  ends_at          timestamptz,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT storefront_deals_pct_chk CHECK (discount_pct > 0 AND discount_pct <= 90),
  CONSTRAINT storefront_deals_uniq UNIQUE (organization_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_storefront_deals_org ON public.storefront_deals(organization_id);

-- ---------------------------------------------------------------------
-- storefront_featured_products
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.storefront_featured_products (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id       uuid NOT NULL,
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT storefront_featured_uniq UNIQUE (organization_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_storefront_featured_org ON public.storefront_featured_products(organization_id, sort_order);
