-- =====================================================
-- Fix Missing Database Columns
-- =====================================================
-- This script adds all missing columns that are referenced in the application code

-- 1. Add missing column to medicines table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medicines' AND column_name = 'quantity_in_stock'
  ) THEN
    ALTER TABLE medicines ADD COLUMN quantity_in_stock INTEGER DEFAULT 0;
    COMMENT ON COLUMN medicines.quantity_in_stock IS 'Stock quantity (alias for quantity column)';
  END IF;
END $$;

-- 2. Add missing columns to suppliers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'supplier_code'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN supplier_code VARCHAR(100) UNIQUE;
    COMMENT ON COLUMN suppliers.supplier_code IS 'Unique supplier code';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'city'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN city VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'state'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN state VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN postal_code VARCHAR(20);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'country'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN country VARCHAR(100) DEFAULT 'Pakistan';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'tax_number'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN tax_number VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'credit_limit'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN credit_limit NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'payment_terms'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN payment_terms INTEGER DEFAULT 30;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'notes'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN notes TEXT;
  END IF;
END $$;

-- 3. Add missing columns to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Add missing columns to order_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE order_items ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'discount_percent'
  ) THEN
    ALTER TABLE order_items ADD COLUMN discount_percent NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'cost_price'
  ) THEN
    ALTER TABLE order_items ADD COLUMN cost_price NUMERIC;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'profit'
  ) THEN
    ALTER TABLE order_items ADD COLUMN profit NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'gst_amount'
  ) THEN
    ALTER TABLE order_items ADD COLUMN gst_amount NUMERIC DEFAULT 0;
  END IF;
END $$;

-- 5. Create refactored_purchase_orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS refactored_purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number VARCHAR(100) NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  total_amount NUMERIC NOT NULL,
  tax_amount NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  actual_delivery DATE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create supplier_audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS supplier_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  new_values JSONB,
  changed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_medicines_quantity_in_stock ON medicines(quantity_in_stock);
CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_code ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_city ON suppliers(city);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_refactored_purchase_orders_org ON refactored_purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_refactored_purchase_orders_supplier ON refactored_purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_refactored_purchase_orders_status ON refactored_purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_supplier_audit_log_supplier ON supplier_audit_log(supplier_id);

-- 8. Update medicines trigger to update quantity_in_stock
DO $$
BEGIN
  -- Create trigger function to sync quantity and quantity_in_stock if they are different columns
  CREATE OR REPLACE FUNCTION sync_medicine_quantity() RETURNS TRIGGER AS $trigger$
  BEGIN
    -- If quantity_in_stock is different from quantity, sync them
    IF COALESCE(NEW.quantity_in_stock, 0) != COALESCE(NEW.quantity, 0) THEN
      NEW.quantity_in_stock = NEW.quantity;
    END IF;
    RETURN NEW;
  END;
  $trigger$ LANGUAGE plpgsql;
EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL;
END $$;

-- Apply the trigger
DROP TRIGGER IF EXISTS medicine_sync_quantity ON medicines;
CREATE TRIGGER medicine_sync_quantity
BEFORE INSERT OR UPDATE ON medicines
FOR EACH ROW
EXECUTE FUNCTION sync_medicine_quantity();

-- Print completion message
SELECT 'Database migration completed successfully!' as status;
