-- =====================================================
-- SECURITY DEFINER FUNCTIONS TO BYPASS RLS
-- =====================================================

-- Function to create medicine bypassing RLS
CREATE OR REPLACE FUNCTION create_medicine_bypass_rls(
    p_name VARCHAR(255),
    p_generic_name VARCHAR(255) DEFAULT NULL,
    p_manufacturer VARCHAR(255),
    p_batch_number VARCHAR(100) DEFAULT NULL,
    p_selling_price DECIMAL(10,2),
    p_cost_price DECIMAL(10,2),
    p_gst_per_unit DECIMAL(10,2) DEFAULT 0,
    p_gst_rate DECIMAL(5,2) DEFAULT 0,
    p_quantity INTEGER DEFAULT 0,
    p_low_stock_threshold INTEGER DEFAULT 10,
    p_expiry_date DATE,
    p_category VARCHAR(100) DEFAULT NULL,
    p_subcategory VARCHAR(100) DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_dosage_form VARCHAR(100) DEFAULT NULL,
    p_strength VARCHAR(100) DEFAULT NULL,
    p_pack_size VARCHAR(100) DEFAULT NULL,
    p_storage_conditions VARCHAR(255) DEFAULT NULL,
    p_prescription_required BOOLEAN DEFAULT FALSE,
    p_is_active BOOLEAN DEFAULT TRUE,
    p_supplier_id UUID DEFAULT NULL,
    p_organization_id UUID,
    p_created_by UUID
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    new_medicine_id UUID;
BEGIN
    -- Insert medicine directly bypassing RLS
    INSERT INTO public.medicines (
        name, generic_name, manufacturer, batch_number, selling_price, cost_price,
        gst_per_unit, gst_rate, quantity, low_stock_threshold, expiry_date,
        category, subcategory, description, dosage_form, strength, pack_size,
        storage_conditions, prescription_required, is_active, supplier_id,
        organization_id, created_by
    ) VALUES (
        p_name, p_generic_name, p_manufacturer, p_batch_number, p_selling_price, p_cost_price,
        p_gst_per_unit, p_gst_rate, p_quantity, p_low_stock_threshold, p_expiry_date,
        p_category, p_subcategory, p_description, p_dosage_form, p_strength, p_pack_size,
        p_storage_conditions, p_prescription_required, p_is_active, p_supplier_id,
        p_organization_id, p_created_by
    ) RETURNING id INTO new_medicine_id;
    
    RETURN new_medicine_id;
END;
$$;

-- Function to create supplier bypassing RLS
CREATE OR REPLACE FUNCTION create_supplier_bypass_rls(
    p_name VARCHAR(255),
    p_contact_person VARCHAR(255) DEFAULT NULL,
    p_phone VARCHAR(20) DEFAULT NULL,
    p_email VARCHAR(255) DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_city VARCHAR(100) DEFAULT NULL,
    p_state VARCHAR(100) DEFAULT NULL,
    p_country VARCHAR(100) DEFAULT NULL,
    p_postal_code VARCHAR(20) DEFAULT NULL,
    p_organization_id UUID,
    p_created_by UUID
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    new_supplier_id UUID;
BEGIN
    -- Insert supplier directly bypassing RLS
    INSERT INTO public.suppliers (
        name, contact_person, phone, email, address,
        city, state, country, postal_code, organization_id, created_by
    ) VALUES (
        p_name, p_contact_person, p_phone, p_email, p_address,
        p_city, p_state, p_country, p_postal_code, p_organization_id, p_created_by
    ) RETURNING id INTO new_supplier_id;
    
    RETURN new_supplier_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_medicine_bypass_rls TO authenticated;
GRANT EXECUTE ON FUNCTION create_supplier_bypass_rls TO authenticated;
GRANT EXECUTE ON FUNCTION create_medicine_bypass_rls TO service_role;
GRANT EXECUTE ON FUNCTION create_supplier_bypass_rls TO service_role;