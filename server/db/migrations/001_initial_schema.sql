-- =====================================================================
-- Medical POS - consolidated initial schema
-- Reconstructed from db.txt (live dump) + the query surface of the
-- current server code (controllers/ models/) + the ad-hoc patch scripts
-- in server/scripts/. No Supabase RLS / auth.uid() - plain PostgreSQL.
-- Idempotent: safe to re-run.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- organizations
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name               varchar NOT NULL,
  code               varchar NOT NULL UNIQUE,
  description        text,
  address            text,
  phone              varchar,
  email              varchar,
  website            varchar,
  logo_url           text,
  is_active          boolean DEFAULT true,
  subscription_tier  varchar DEFAULT 'basic',
  max_users          integer DEFAULT 5,
  current_users      integer DEFAULT 0,
  trial_ends_at      timestamptz,
  billing_email      varchar,
  tax_id             varchar,
  currency           varchar DEFAULT 'USD',
  timezone           varchar DEFAULT 'UTC',
  access_valid_till  timestamptz,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

-- =====================================================================
-- users
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_uid           uuid UNIQUE,                 -- legacy, now nullable
  username               varchar NOT NULL UNIQUE,
  email                  varchar NOT NULL UNIQUE,
  full_name              varchar,
  phone                  varchar,
  avatar_url             text,
  password_hash          varchar,                     -- used by authController
  password               varchar,                     -- legacy alias written by routes/admin.js
  role                   varchar DEFAULT 'user',
  role_in_pos            varchar,                      -- admin | manager | counter | warehouse
  permissions            jsonb DEFAULT '[]'::jsonb,
  organization_id        uuid NOT NULL REFERENCES public.organizations(id),
  subscription_status    varchar DEFAULT 'pending',
  access_valid_till      timestamptz,
  trial_ends_at          timestamptz,
  last_access_extension  timestamptz,
  is_trial_user          boolean DEFAULT true,
  is_active              boolean DEFAULT false,
  is_email_verified      boolean DEFAULT false,
  session_token          text,                        -- single-session enforcement
  session_created_at     timestamp,
  last_login             timestamptz,
  login_attempts         integer DEFAULT 0,
  locked_until           timestamptz,
  password_reset_token   varchar,
  password_reset_expires timestamptz,
  two_factor_enabled     boolean DEFAULT false,
  two_factor_secret      varchar,
  preferences            jsonb DEFAULT '{}'::jsonb,
  theme                  varchar DEFAULT 'light',
  language               varchar DEFAULT 'en',
  timezone               varchar DEFAULT 'UTC',
  notification_settings  jsonb DEFAULT '{}'::jsonb,
  created_by             uuid REFERENCES public.users(id),
  approved_by            uuid REFERENCES public.users(id),
  approved_at            timestamptz,
  deactivated_by         uuid REFERENCES public.users(id),
  deactivated_at         timestamptz,
  deactivation_reason    text,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_session_token   ON public.users(session_token);

-- =====================================================================
-- suppliers  (includes columns added by fix-suppliers-schema.sql)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_code    varchar,
  name             varchar NOT NULL,
  contact_person   varchar,
  phone            varchar,
  email            varchar,
  address          text,
  city             varchar,
  state            varchar,
  country          varchar DEFAULT 'Pakistan',
  postal_code      varchar,
  website          varchar,
  tax_id           varchar,
  tax_number       varchar,
  payment_terms    integer DEFAULT 30,
  credit_limit     numeric DEFAULT 0,
  current_balance  numeric DEFAULT 0,
  notes            text,
  is_active        boolean DEFAULT true,
  organization_id  uuid NOT NULL REFERENCES public.organizations(id),
  created_by       uuid REFERENCES public.users(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  CONSTRAINT suppliers_supplier_code_org_unique UNIQUE (supplier_code, organization_id)
);
CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id ON public.suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_code   ON public.suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_city            ON public.suppliers(city);

-- =====================================================================
-- medicines  (legacy single-row-per-product model; still referenced by
-- some endpoints + inventory_adjustments). quantity_in_stock added by
-- fix-missing-columns.sql.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.medicines (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                   varchar NOT NULL,
  generic_name           varchar,
  manufacturer           varchar NOT NULL,
  batch_number           varchar,
  selling_price          numeric NOT NULL DEFAULT 0,
  cost_price             numeric NOT NULL DEFAULT 0,
  gst_per_unit           numeric DEFAULT 0,
  gst_rate               numeric DEFAULT 0,
  quantity               integer NOT NULL DEFAULT 0,
  quantity_in_stock      integer DEFAULT 0,
  low_stock_threshold    integer DEFAULT 10,
  expiry_date            date,
  category               varchar,
  subcategory            varchar,
  description            text,
  dosage_form            varchar,
  strength               varchar,
  pack_size              varchar,
  storage_conditions     varchar,
  prescription_required  boolean DEFAULT false,
  is_active              boolean DEFAULT true,
  organization_id        uuid NOT NULL REFERENCES public.organizations(id),
  supplier_id            uuid REFERENCES public.suppliers(id),
  created_by             uuid REFERENCES public.users(id),
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_medicines_organization_id ON public.medicines(organization_id);
CREATE INDEX IF NOT EXISTS idx_medicines_batch_number    ON public.medicines(batch_number);

-- =====================================================================
-- products + inventory_batches  (current inventory core - migrate_v2_batches.js)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                   varchar NOT NULL,
  generic_name           varchar,
  manufacturer           varchar NOT NULL,
  category               varchar,
  subcategory            varchar,
  description            text,
  dosage_form            varchar,
  strength               varchar,
  pack_size              varchar,
  storage_conditions     varchar,
  prescription_required  boolean DEFAULT false,
  gst_rate               numeric DEFAULT 0,
  low_stock_threshold    integer DEFAULT 10,
  is_active              boolean DEFAULT true,
  organization_id        uuid NOT NULL REFERENCES public.organizations(id),
  created_by             uuid REFERENCES public.users(id),
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now(),
  UNIQUE (name, manufacturer, organization_id)
);
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON public.products(organization_id);

CREATE TABLE IF NOT EXISTS public.inventory_batches (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  batch_number     varchar,
  expiry_date      date NOT NULL,
  quantity         integer NOT NULL DEFAULT 0,
  selling_price    numeric NOT NULL DEFAULT 0,
  cost_price       numeric NOT NULL DEFAULT 0,
  mrp              numeric,
  supplier_id      uuid REFERENCES public.suppliers(id),
  is_active        boolean DEFAULT true,
  organization_id  uuid NOT NULL REFERENCES public.organizations(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE (product_id, batch_number, organization_id)
);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_product_id      ON public.inventory_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_organization_id ON public.inventory_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry_date     ON public.inventory_batches(expiry_date);

-- =====================================================================
-- customers
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name               varchar NOT NULL,
  phone              varchar,
  email              varchar,
  address            text,
  city               varchar,
  state              varchar,
  country            varchar,
  postal_code        varchar,
  date_of_birth      date,
  gender             varchar,
  medical_history    text,
  allergies          text,
  emergency_contact  varchar,
  emergency_phone    varchar,
  is_active          boolean DEFAULT true,
  organization_id    uuid NOT NULL REFERENCES public.organizations(id),
  created_by         uuid REFERENCES public.users(id),
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON public.customers(organization_id);

-- =====================================================================
-- orders + order_items  (payment tracking + customer_id patched in)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number     varchar NOT NULL UNIQUE,
  user_id          uuid REFERENCES public.users(id),
  customer_id      uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name    varchar,
  customer_phone   varchar,
  customer_email   varchar,
  organization_id  uuid NOT NULL REFERENCES public.organizations(id),
  total_amount     numeric NOT NULL DEFAULT 0,
  subtotal         numeric NOT NULL DEFAULT 0,
  tax_amount       numeric NOT NULL DEFAULT 0,
  tax_percent      numeric DEFAULT 0,
  profit           numeric NOT NULL DEFAULT 0,
  discount         numeric NOT NULL DEFAULT 0,
  discount_percent numeric DEFAULT 0,
  amount_paid      numeric DEFAULT 0,
  amount_due       numeric DEFAULT 0,
  change_given     numeric DEFAULT 0,
  payment_method   varchar NOT NULL DEFAULT 'cash',
  payment_status   varchar DEFAULT 'pending',
  status           varchar DEFAULT 'pending',
  notes            text,
  completed_at     timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_organization_id ON public.orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id     ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at      ON public.orders(created_at);

CREATE TABLE IF NOT EXISTS public.order_items (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  medicine_id      uuid NOT NULL,          -- product_id or medicine_id depending on path; no FK
  quantity         integer NOT NULL,
  unit_price       numeric NOT NULL,
  total_price      numeric NOT NULL,
  discount         numeric DEFAULT 0,
  discount_percent numeric DEFAULT 0,
  cost_price       numeric DEFAULT 0,
  profit           numeric DEFAULT 0,
  gst_amount       numeric DEFAULT 0,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- =====================================================================
-- purchase_orders + items (legacy) + status history
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number          varchar NOT NULL UNIQUE,
  supplier_id        uuid NOT NULL REFERENCES public.suppliers(id),
  organization_id    uuid NOT NULL REFERENCES public.organizations(id),
  total_amount       numeric NOT NULL DEFAULT 0,
  tax_amount         numeric DEFAULT 0,
  discount           numeric DEFAULT 0,
  status             varchar DEFAULT 'pending',
  order_date         date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery  date,
  actual_delivery    date,
  applied_at         timestamptz,
  notes              text,
  created_by         uuid REFERENCES public.users(id),
  approved_by        uuid REFERENCES public.users(id),
  approved_at        timestamptz,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_organization_id ON public.purchase_orders(organization_id);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id  uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  medicine_id        uuid NOT NULL,
  quantity           integer NOT NULL,
  unit_cost          numeric NOT NULL,
  total_cost         numeric NOT NULL,
  received_quantity  integer DEFAULT 0,
  created_at         timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON public.purchase_order_items(purchase_order_id);

CREATE TABLE IF NOT EXISTS public.purchase_order_status_history (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id  uuid NOT NULL,   -- may reference purchase_orders or refactored_purchase_orders
  old_status         varchar NOT NULL,
  new_status         varchar NOT NULL,
  changed_by         uuid REFERENCES public.users(id),
  notes              text,
  changed_at         timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_po_status_history_po_id ON public.purchase_order_status_history(purchase_order_id);

-- =====================================================================
-- refactored_purchase_orders + items  (mounted /api/purchase-orders route)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.refactored_purchase_orders (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number          varchar NOT NULL UNIQUE,
  supplier_id        uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  organization_id    uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  total_amount       numeric NOT NULL DEFAULT 0,
  tax_amount         numeric DEFAULT 0,
  discount           numeric DEFAULT 0,
  status             varchar DEFAULT 'pending',
  order_date         date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery  date,
  actual_delivery    date,
  applied_at         timestamptz,
  notes              text,
  created_by         uuid REFERENCES public.users(id),
  approved_by        uuid REFERENCES public.users(id),
  approved_at        timestamptz,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ref_po_org      ON public.refactored_purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_ref_po_supplier ON public.refactored_purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_ref_po_status   ON public.refactored_purchase_orders(status);

CREATE TABLE IF NOT EXISTS public.refactored_purchase_order_items (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id  uuid NOT NULL REFERENCES public.refactored_purchase_orders(id) ON DELETE CASCADE,
  medicine_id        uuid,
  product_id         uuid,
  item_name          varchar,
  quantity           integer NOT NULL,
  unit_cost          numeric NOT NULL,
  total_cost         numeric NOT NULL,
  received_quantity  integer DEFAULT 0,
  created_at         timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ref_po_items_po_id ON public.refactored_purchase_order_items(purchase_order_id);

-- =====================================================================
-- inventory_transactions / stock_movements / inventory_adjustments
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  medicine_id       uuid NOT NULL,
  organization_id   uuid NOT NULL REFERENCES public.organizations(id),
  transaction_type  varchar NOT NULL,
  quantity          integer NOT NULL,
  unit_price        numeric,
  total_amount      numeric,
  reference_id      uuid,
  reference_type    varchar,
  notes             text,
  created_by        uuid REFERENCES public.users(id),
  created_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inv_txn_org ON public.inventory_transactions(organization_id);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  medicine_id      uuid,
  product_id       uuid,
  batch_id         uuid,
  organization_id  uuid NOT NULL REFERENCES public.organizations(id),
  movement_type    varchar NOT NULL,
  quantity         integer NOT NULL,
  reference_id     uuid,
  reference_type   varchar,
  reason           text,
  notes            text,
  user_id          uuid REFERENCES public.users(id),
  created_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org ON public.stock_movements(organization_id);

CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  medicine_id      uuid NOT NULL,
  organization_id  uuid NOT NULL REFERENCES public.organizations(id),
  adjustment_type  varchar NOT NULL,   -- add | subtract | correction
  quantity         integer NOT NULL,
  reason           text,
  notes            text,
  adjusted_by      uuid REFERENCES public.users(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inv_adj_org ON public.inventory_adjustments(organization_id);

-- =====================================================================
-- audit_logs + supplier_audit_log
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  action           varchar NOT NULL,
  entity           varchar NOT NULL,
  entity_id        uuid,
  user_id          uuid REFERENCES public.users(id),
  target_user_id   uuid REFERENCES public.users(id),
  organization_id  uuid REFERENCES public.organizations(id),
  old_values       jsonb,
  new_values       jsonb,
  changes          jsonb,
  ip_address       inet,
  user_agent       text,
  request_id       varchar,
  session_id       varchar,
  reason           text,
  metadata         jsonb DEFAULT '{}'::jsonb,
  "timestamp"      timestamptz DEFAULT now(),
  created_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org  ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);

CREATE TABLE IF NOT EXISTS public.supplier_audit_log (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id  uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  action       varchar NOT NULL,
  new_values   jsonb,
  changed_by   uuid REFERENCES public.users(id),
  created_at   timestamptz DEFAULT now()
);

-- =====================================================================
-- organization_ledger
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.organization_ledger (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   uuid NOT NULL REFERENCES public.organizations(id),
  transaction_type  varchar NOT NULL,
  description       text NOT NULL,
  reference_number  varchar,
  amount            numeric NOT NULL,
  debit_amount      numeric NOT NULL DEFAULT 0,
  credit_amount     numeric NOT NULL DEFAULT 0,
  running_balance   numeric NOT NULL DEFAULT 0,
  category          varchar NOT NULL,
  sub_category      varchar,
  payment_method    varchar,
  order_id          uuid REFERENCES public.orders(id),
  supplier_id       uuid REFERENCES public.suppliers(id),
  customer_id       uuid REFERENCES public.customers(id),
  user_id           uuid REFERENCES public.users(id),
  is_verified       boolean NOT NULL DEFAULT false,
  verified_by       uuid REFERENCES public.users(id),
  verified_at       timestamptz,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  transaction_date  timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_org_ledger_org ON public.organization_ledger(organization_id);

-- =====================================================================
-- functions + triggers (from fix-suppliers-schema.sql / fix-missing-columns.sql)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.generate_supplier_code(org_id uuid, supplier_name text)
RETURNS text AS $$
DECLARE
  code_prefix text;
  code_number integer;
  new_code    text;
  code_exists boolean;
BEGIN
  code_prefix := UPPER(LEFT(REGEXP_REPLACE(supplier_name, '[^A-Za-z]', '', 'g'), 3));
  IF LENGTH(code_prefix) < 3 THEN
    code_prefix := RPAD(code_prefix, 3, 'SUP');
  END IF;
  code_number := 1;
  LOOP
    new_code := code_prefix || LPAD(code_number::text, 4, '0');
    SELECT EXISTS(
      SELECT 1 FROM public.suppliers
      WHERE supplier_code = new_code AND organization_id = org_id
    ) INTO code_exists;
    EXIT WHEN NOT code_exists;
    code_number := code_number + 1;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.auto_generate_supplier_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.supplier_code IS NULL THEN
    NEW.supplier_code := public.generate_supplier_code(NEW.organization_id, NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_generate_supplier_code ON public.suppliers;
CREATE TRIGGER trigger_auto_generate_supplier_code
  BEFORE INSERT ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_supplier_code();

CREATE OR REPLACE FUNCTION public.sync_medicine_quantity()
RETURNS trigger AS $$
BEGIN
  IF COALESCE(NEW.quantity_in_stock, 0) != COALESCE(NEW.quantity, 0) THEN
    NEW.quantity_in_stock := NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS medicine_sync_quantity ON public.medicines;
CREATE TRIGGER medicine_sync_quantity
  BEFORE INSERT OR UPDATE ON public.medicines
  FOR EACH ROW EXECUTE FUNCTION public.sync_medicine_quantity();
