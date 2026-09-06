-- =====================================================================
-- 006 - Phase 3: returns/near-expiry + partial fulfilment for the B2B network
--   * refactored_purchase_orders.expected_delivery is used for on-time %
--   * supplier_returns : a pharmacy-raised return against a received B2B PO item
-- Idempotent.
-- =====================================================================

-- ensure the PO carries a fulfilled timestamp for on-time-% maths
ALTER TABLE public.refactored_purchase_orders
  ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz;

-- ---------------------------------------------------------------------
-- supplier_returns
--   status: requested -> accepted | rejected   (supplier decides)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_returns (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  purchase_order_id      uuid NOT NULL REFERENCES public.refactored_purchase_orders(id) ON DELETE CASCADE,
  purchase_order_item_id uuid REFERENCES public.refactored_purchase_order_items(id) ON DELETE SET NULL,
  item_name              varchar,
  quantity               integer NOT NULL,
  unit_price             numeric NOT NULL DEFAULT 0,
  refund_amount          numeric NOT NULL DEFAULT 0,
  reason                 varchar NOT NULL,   -- near_expiry | damaged | wrong_item | other
  note                   text,
  status                 varchar NOT NULL DEFAULT 'requested',
  requested_by           uuid REFERENCES public.users(id),
  resolved_by            uuid REFERENCES public.users(id),
  resolved_at            timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_returns_status_chk CHECK (status IN ('requested','accepted','rejected')),
  CONSTRAINT supplier_returns_reason_chk CHECK (reason IN ('near_expiry','damaged','wrong_item','other'))
);
CREATE INDEX IF NOT EXISTS idx_supplier_returns_pharmacy ON public.supplier_returns(pharmacy_org_id);
CREATE INDEX IF NOT EXISTS idx_supplier_returns_supplier ON public.supplier_returns(supplier_org_id);
CREATE INDEX IF NOT EXISTS idx_supplier_returns_po ON public.supplier_returns(purchase_order_id);
