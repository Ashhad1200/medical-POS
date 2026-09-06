-- =====================================================================
-- 007 - Phase 4.1: courier adapter behind storefront_orders
--   * courier            : adapter name a store order was handed to
--   * courier_ref        : the adapter's own tracking id (returned by assignCourier)
--   * courier_status_raw : last raw external status string (kept even when unmapped)
-- Idempotent.
-- =====================================================================

ALTER TABLE public.storefront_orders
  ADD COLUMN IF NOT EXISTS courier            varchar,
  ADD COLUMN IF NOT EXISTS courier_ref        varchar,
  ADD COLUMN IF NOT EXISTS courier_status_raw varchar;

CREATE INDEX IF NOT EXISTS idx_storefront_orders_courier_ref
  ON public.storefront_orders(courier, courier_ref);
