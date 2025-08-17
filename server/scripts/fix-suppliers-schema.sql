-- Fix Suppliers Schema - Add missing fields for refactored system
-- This script adds the missing columns that the refactored supplier system expects

-- Add missing columns to suppliers table
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS supplier_code VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50);

-- Update payment_terms column to match expected format
ALTER TABLE public.suppliers 
ALTER COLUMN payment_terms TYPE INTEGER USING (
  CASE 
    WHEN payment_terms ~ '^[0-9]+$' THEN payment_terms::INTEGER
    WHEN payment_terms ILIKE '%30%' THEN 30
    WHEN payment_terms ILIKE '%45%' THEN 45
    WHEN payment_terms ILIKE '%60%' THEN 60
    WHEN payment_terms ILIKE '%90%' THEN 90
    ELSE 30
  END
);

-- Set default value for payment_terms
ALTER TABLE public.suppliers 
ALTER COLUMN payment_terms SET DEFAULT 30;

-- Create function to generate supplier codes if it doesn't exist
CREATE OR REPLACE FUNCTION generate_supplier_code(org_id UUID, supplier_name TEXT)
RETURNS TEXT AS $$
DECLARE
    code_prefix TEXT;
    code_number INTEGER;
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    -- Generate prefix from supplier name (first 3 characters, uppercase)
    code_prefix := UPPER(LEFT(REGEXP_REPLACE(supplier_name, '[^A-Za-z]', '', 'g'), 3));
    
    -- If prefix is less than 3 characters, pad with 'SUP'
    IF LENGTH(code_prefix) < 3 THEN
        code_prefix := RPAD(code_prefix, 3, 'SUP');
    END IF;
    
    -- Find the next available number
    code_number := 1;
    LOOP
        new_code := code_prefix || LPAD(code_number::TEXT, 4, '0');
        
        SELECT EXISTS(
            SELECT 1 FROM public.suppliers 
            WHERE supplier_code = new_code 
            AND organization_id = org_id
        ) INTO code_exists;
        
        IF NOT code_exists THEN
            EXIT;
        END IF;
        
        code_number := code_number + 1;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Update existing suppliers without supplier_code
UPDATE public.suppliers 
SET supplier_code = generate_supplier_code(organization_id, name)
WHERE supplier_code IS NULL;

-- Create index for supplier_code
CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_code ON public.suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_tax_number ON public.suppliers(tax_number);

-- Add constraint to ensure supplier_code is unique within organization
ALTER TABLE public.suppliers 
DROP CONSTRAINT IF EXISTS suppliers_supplier_code_org_unique;

ALTER TABLE public.suppliers 
ADD CONSTRAINT suppliers_supplier_code_org_unique 
UNIQUE (supplier_code, organization_id);

-- Create trigger to auto-generate supplier_code for new suppliers
CREATE OR REPLACE FUNCTION auto_generate_supplier_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.supplier_code IS NULL THEN
        NEW.supplier_code := generate_supplier_code(NEW.organization_id, NEW.name);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_generate_supplier_code ON public.suppliers;
CREATE TRIGGER trigger_auto_generate_supplier_code
    BEFORE INSERT ON public.suppliers
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_supplier_code();

-- Update RLS policies if needed
-- (The existing policies should work with the new columns)

COMMIT;