-- =====================================================================
-- 008 - Phase 4.2: online payments behind storefront_orders.payment_method
--   * storefront_settings.online_enabled : store accepts online payment
--   * storefront_orders.payment_provider : which payment adapter (e.g. 'jazzcash')
--   * storefront_orders.payment_ref      : the provider's txn reference
--   * payment_method gains 'online'
-- payment_status stays a plain varchar: 'unpaid' | 'paid' | 'failed'.
-- Idempotent.
-- =====================================================================

ALTER TABLE public.storefront_settings
  ADD COLUMN IF NOT EXISTS online_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.storefront_orders
  ADD COLUMN IF NOT EXISTS payment_provider varchar,
  ADD COLUMN IF NOT EXISTS payment_ref      varchar;

ALTER TABLE public.storefront_orders
  DROP CONSTRAINT IF EXISTS storefront_orders_payment_method_chk;
ALTER TABLE public.storefront_orders
  ADD CONSTRAINT storefront_orders_payment_method_chk
    CHECK (payment_method IN ('cod','in_store','online'));

CREATE INDEX IF NOT EXISTS idx_storefront_orders_payment_ref
  ON public.storefront_orders(payment_provider, payment_ref);
