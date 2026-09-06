-- =====================================================================
-- 004 - per-pharmacy public storefront  (PRODUCT_ROADMAP.md Phase 1)
-- OTC-only online shop per pharmacy org: settings, orders, order items,
-- status-change audit. Kept separate from internal orders/order_items.
-- Rx gating reuses the existing products.prescription_required column.
-- Idempotent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- storefront_settings  (one row per pharmacy org)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.storefront_settings (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug                  varchar NOT NULL UNIQUE,
  display_name          varchar NOT NULL,
  logo_url              text,
  theme                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivery_fee          numeric NOT NULL DEFAULT 0,
  delivery_radius_km    numeric,
  min_order             numeric NOT NULL DEFAULT 0,
  cod_enabled           boolean NOT NULL DEFAULT true,
  pay_in_store_enabled  boolean NOT NULL DEFAULT true,
  is_live               boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_storefront_settings_slug ON public.storefront_settings(slug);

-- ---------------------------------------------------------------------
-- storefront_orders
-- status: placed -> confirmed -> out_for_delivery -> delivered ; or cancelled
-- payment_method: cod | in_store
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.storefront_orders (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_number     varchar NOT NULL UNIQUE,
  customer_name    varchar NOT NULL,
  customer_phone   varchar NOT NULL,
  customer_address text NOT NULL,
  customer_city    varchar,
  subtotal         numeric NOT NULL DEFAULT 0,
  delivery_fee     numeric NOT NULL DEFAULT 0,
  total            numeric NOT NULL DEFAULT 0,
  payment_method   varchar NOT NULL DEFAULT 'cod',
  payment_status   varchar NOT NULL DEFAULT 'unpaid',
  status           varchar NOT NULL DEFAULT 'placed',
  rider_name       varchar,
  rider_phone      varchar,
  notes            text,
  placed_at        timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT storefront_orders_status_chk
    CHECK (status IN ('placed','confirmed','out_for_delivery','delivered','cancelled')),
  CONSTRAINT storefront_orders_payment_method_chk
    CHECK (payment_method IN ('cod','in_store'))
);
CREATE INDEX IF NOT EXISTS idx_storefront_orders_org    ON public.storefront_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_storefront_orders_status ON public.storefront_orders(status);
CREATE INDEX IF NOT EXISTS idx_storefront_orders_placed ON public.storefront_orders(placed_at);

-- ---------------------------------------------------------------------
-- storefront_order_items  (name + price snapshotted at order time)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.storefront_order_items (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  storefront_order_id  uuid NOT NULL REFERENCES public.storefront_orders(id) ON DELETE CASCADE,
  medicine_id          uuid NOT NULL,          -- products.id (no FK: product may be retired later)
  name_snapshot        varchar NOT NULL,
  unit_price_snapshot  numeric NOT NULL,
  quantity             integer NOT NULL,
  line_total           numeric NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_storefront_order_items_order ON public.storefront_order_items(storefront_order_id);

-- ---------------------------------------------------------------------
-- storefront_order_events  (status-change audit)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.storefront_order_events (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  storefront_order_id  uuid NOT NULL REFERENCES public.storefront_orders(id) ON DELETE CASCADE,
  from_status          varchar,
  to_status            varchar NOT NULL,
  actor                varchar,               -- user id, or 'customer' / 'system'
  note                 text,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_storefront_order_events_order ON public.storefront_order_events(storefront_order_id);

-- ---------------------------------------------------------------------
-- storefront is a paid feature — add the flag to pro & enterprise
-- ---------------------------------------------------------------------
UPDATE public.plans
SET features = jsonb_set(features, '{storefront}', 'true'::jsonb)
WHERE code IN ('pro', 'enterprise');

UPDATE public.plans
SET features = jsonb_set(features, '{storefront}', 'false'::jsonb)
WHERE code IN ('free', 'basic') AND NOT (features ? 'storefront');
