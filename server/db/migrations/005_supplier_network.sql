-- =====================================================================
-- 005 - supplier tenants + private B2B network  (PRODUCT_ROADMAP.md Phase 2)
--   * organizations.org_type turns a supplier into a first-class tenant
--   * supplier_products : the supplier's own catalogue
--   * supplier_connections : the private pharmacy <-> supplier link
--   * refactored_purchase_orders gains supplier_org_id + source so a B2B
--     order is distinguishable from a hand-entered PO
-- Idempotent.
-- =====================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS org_type varchar NOT NULL DEFAULT 'pharmacy';
-- existing rows become 'pharmacy' via the DEFAULT
CREATE INDEX IF NOT EXISTS idx_organizations_org_type ON public.organizations(org_type);

-- ---------------------------------------------------------------------
-- supplier_products  (supplier-owned catalogue, separate from products)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_products (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_org_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name             varchar NOT NULL,
  generic_name     varchar,
  manufacturer     varchar,
  pack_size        varchar,
  unit_price       numeric NOT NULL DEFAULT 0,
  moq              integer NOT NULL DEFAULT 1,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON public.supplier_products(supplier_org_id);

-- ---------------------------------------------------------------------
-- supplier_connections  (private link; status drives ordering rights)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_connections (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_org_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_org_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status              varchar NOT NULL DEFAULT 'pending',   -- pending | active | paused | revoked
  credit_limit        numeric NOT NULL DEFAULT 0,
  payment_terms_days  integer NOT NULL DEFAULT 0,
  requested_by        uuid REFERENCES public.users(id),
  approved_by         uuid REFERENCES public.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_connections_status_chk
    CHECK (status IN ('pending','active','paused','revoked')),
  CONSTRAINT supplier_connections_uniq UNIQUE (pharmacy_org_id, supplier_org_id)
);
CREATE INDEX IF NOT EXISTS idx_supplier_connections_pharmacy ON public.supplier_connections(pharmacy_org_id);
CREATE INDEX IF NOT EXISTS idx_supplier_connections_supplier ON public.supplier_connections(supplier_org_id);

-- ---------------------------------------------------------------------
-- refactored_purchase_orders : mark B2B orders + point at the supplier org
-- ---------------------------------------------------------------------
ALTER TABLE public.refactored_purchase_orders
  ADD COLUMN IF NOT EXISTS supplier_org_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.refactored_purchase_orders
  ADD COLUMN IF NOT EXISTS source varchar NOT NULL DEFAULT 'manual';   -- manual | b2b
CREATE INDEX IF NOT EXISTS idx_ref_po_supplier_org ON public.refactored_purchase_orders(supplier_org_id);

-- items table also needs to carry a supplier_product reference for B2B lines
ALTER TABLE public.refactored_purchase_order_items
  ADD COLUMN IF NOT EXISTS supplier_product_id uuid REFERENCES public.supplier_products(id);

-- The live refactoredPurchaseOrderController reads/writes unit_price / total_price
-- / updated_at on this table, but 001 only created unit_cost / total_cost.
-- Add the columns the code expects and backfill from the existing ones.
ALTER TABLE public.refactored_purchase_order_items
  ADD COLUMN IF NOT EXISTS unit_price numeric;
ALTER TABLE public.refactored_purchase_order_items
  ADD COLUMN IF NOT EXISTS total_price numeric;
ALTER TABLE public.refactored_purchase_order_items
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.refactored_purchase_order_items ALTER COLUMN unit_cost DROP NOT NULL;
ALTER TABLE public.refactored_purchase_order_items ALTER COLUMN total_cost DROP NOT NULL;
UPDATE public.refactored_purchase_order_items
  SET unit_price = COALESCE(unit_price, unit_cost),
      total_price = COALESCE(total_price, total_cost)
  WHERE unit_price IS NULL OR total_price IS NULL;
