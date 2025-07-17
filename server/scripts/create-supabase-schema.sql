-- =====================================================
-- Medical POS System - Supabase Database Schema
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to execute dynamic SQL
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT) RETURNS void AS $$
BEGIN
    EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ORGANIZATIONS TABLE
-- =====================================================
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.inventory_transactions CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.purchase_order_items CASCADE;
DROP TABLE IF EXISTS public.purchase_orders CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.medicines CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    max_users INTEGER DEFAULT 5,
    current_users INTEGER DEFAULT 0,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    billing_email VARCHAR(255),
    tax_id VARCHAR(100),
    currency VARCHAR(3) DEFAULT 'USD',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- USERS TABLE (Extended Profile)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supabase_uid UUID UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'user',
    role_in_pos VARCHAR(50),
    permissions JSONB DEFAULT '[]',
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    subscription_status VARCHAR(50) DEFAULT 'pending',
    access_valid_till TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    last_access_extension TIMESTAMP WITH TIME ZONE,
    is_trial_user BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT FALSE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    preferences JSONB DEFAULT '{}',
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    notification_settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES public.users(id),
    approved_by UUID REFERENCES public.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    deactivated_by UUID REFERENCES public.users(id),
    deactivated_at TIMESTAMP WITH TIME ZONE,
    deactivation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SUPPLIERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    website VARCHAR(255),
    tax_id VARCHAR(100),
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(15,2),
    current_balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- MEDICINES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.medicines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    manufacturer VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100),
    selling_price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2) NOT NULL,
    gst_per_unit DECIMAL(10,2) DEFAULT 0,
    gst_rate DECIMAL(5,2) DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    expiry_date DATE NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    description TEXT,
    dosage_form VARCHAR(100),
    strength VARCHAR(100),
    pack_size VARCHAR(100),
    storage_conditions VARCHAR(255),
    prescription_required BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.suppliers(id),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES public.users(id),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    total_amount DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_percent DECIMAL(5,2) DEFAULT 0,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    profit DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending',
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ORDER ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES public.medicines(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    cost_price DECIMAL(10,2) NOT NULL,
    profit DECIMAL(10,2) NOT NULL DEFAULT 0,
    gst_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PURCHASE ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    total_amount DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    discount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery DATE,
    actual_delivery DATE,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    approved_by UUID REFERENCES public.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PURCHASE ORDER ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES public.medicines(id),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(12,2) NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id UUID,
    user_id UUID NOT NULL REFERENCES public.users(id),
    target_user_id UUID REFERENCES public.users(id),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    old_values JSONB,
    new_values JSONB,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    session_id VARCHAR(255),
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INVENTORY TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_id UUID NOT NULL REFERENCES public.medicines(id),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- 'purchase', 'sale', 'adjustment', 'return'
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2),
    total_amount DECIMAL(12,2),
    reference_id UUID, -- order_id, purchase_order_id, etc.
    reference_type VARCHAR(50), -- 'order', 'purchase_order', 'adjustment'
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CUSTOMERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10),
    medical_history TEXT,
    allergies TEXT,
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_code ON public.organizations(code);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON public.organizations(is_active);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid ON public.users(supabase_uid);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role_in_pos ON public.users(role_in_pos);

-- Suppliers indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id ON public.suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON public.suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);

-- Medicines indexes
CREATE INDEX IF NOT EXISTS idx_medicines_organization_id ON public.medicines(organization_id);
CREATE INDEX IF NOT EXISTS idx_medicines_supplier_id ON public.medicines(supplier_id);
CREATE INDEX IF NOT EXISTS idx_medicines_name ON public.medicines(name);
CREATE INDEX IF NOT EXISTS idx_medicines_manufacturer ON public.medicines(manufacturer);
CREATE INDEX IF NOT EXISTS idx_medicines_category ON public.medicines(category);
CREATE INDEX IF NOT EXISTS idx_medicines_expiry_date ON public.medicines(expiry_date);
CREATE INDEX IF NOT EXISTS idx_medicines_quantity ON public.medicines(quantity);
CREATE INDEX IF NOT EXISTS idx_medicines_is_active ON public.medicines(is_active);
CREATE INDEX IF NOT EXISTS idx_medicines_batch_number ON public.medicines(batch_number);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_organization_id ON public.orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_medicine_id ON public.order_items(medicine_id);

-- Purchase orders indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_organization_id ON public.purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON public.purchase_orders(po_number);

-- Purchase order items indexes
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order_id ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_medicine_id ON public.purchase_order_items(medicine_id);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- Inventory transactions indexes
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_medicine_id ON public.inventory_transactions(medicine_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_organization_id ON public.inventory_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_transaction_type ON public.inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON public.inventory_transactions(created_at);

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medicines_updated_at BEFORE UPDATE ON public.medicines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view their own organization" ON public.organizations
    FOR SELECT USING (id IN (
        SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
    ));

-- Users policies
CREATE POLICY "Users can view users in their organization" ON public.users
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
    ));

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (supabase_uid = auth.uid());

-- Medicines policies
CREATE POLICY "Users can view medicines in their organization" ON public.medicines
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
    ));

CREATE POLICY "Users can insert medicines in their organization" ON public.medicines
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
    ));

CREATE POLICY "Users can update medicines in their organization" ON public.medicines
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
    ));

-- Orders policies
CREATE POLICY "Users can view orders in their organization" ON public.orders
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
    ));

CREATE POLICY "Users can insert orders in their organization" ON public.orders
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
    ));

CREATE POLICY "Users can update orders in their organization" ON public.orders
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
    ));

-- Similar policies for other tables...
-- (Add policies for suppliers, purchase_orders, etc.)

-- =====================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- =====================================================

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number(org_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    next_number INTEGER;
    order_number VARCHAR(50);
BEGIN
    -- Get the next number for this organization
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INTEGER)), 0) + 1
    INTO next_number
    FROM public.orders
    WHERE organization_id = org_id;
    
    -- Format: ORG-YYYYMMDD-XXXXX
    order_number := 'ORG-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(next_number::TEXT, 5, '0');
    
    RETURN order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate PO number
CREATE OR REPLACE FUNCTION generate_po_number(org_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    next_number INTEGER;
    po_number VARCHAR(50);
BEGIN
    -- Get the next number for this organization
    SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 9) AS INTEGER)), 0) + 1
    INTO next_number
    FROM public.purchase_orders
    WHERE organization_id = org_id;
    
    -- Format: PO-YYYYMMDD-XXXXX
    po_number := 'PO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(next_number::TEXT, 5, '0');
    
    RETURN po_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update medicine quantity after order
CREATE OR REPLACE FUNCTION update_medicine_quantity_after_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrease medicine quantity
    UPDATE public.medicines 
    SET quantity = quantity - NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.medicine_id;
    
    -- Insert inventory transaction
    INSERT INTO public.inventory_transactions (
        medicine_id,
        organization_id,
        transaction_type,
        quantity,
        unit_price,
        total_amount,
        reference_id,
        reference_type,
        created_by
    ) VALUES (
        NEW.medicine_id,
        (SELECT organization_id FROM public.orders WHERE id = NEW.order_id),
        'sale',
        -NEW.quantity,
        NEW.unit_price,
        NEW.total_price,
        NEW.order_id,
        'order',
        (SELECT user_id FROM public.orders WHERE id = NEW.order_id)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for order items
CREATE TRIGGER trigger_update_medicine_quantity_after_order
    AFTER INSERT ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_medicine_quantity_after_order();

-- Function to update medicine quantity after purchase order
CREATE OR REPLACE FUNCTION update_medicine_quantity_after_purchase()
RETURNS TRIGGER AS $$
BEGIN
    -- Increase medicine quantity
    UPDATE public.medicines 
    SET quantity = quantity + NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.medicine_id;
    
    -- Insert inventory transaction
    INSERT INTO public.inventory_transactions (
        medicine_id,
        organization_id,
        transaction_type,
        quantity,
        unit_price,
        total_amount,
        reference_id,
        reference_type,
        created_by
    ) VALUES (
        NEW.medicine_id,
        (SELECT organization_id FROM public.purchase_orders WHERE id = NEW.purchase_order_id),
        'purchase',
        NEW.quantity,
        NEW.unit_cost,
        NEW.total_cost,
        NEW.purchase_order_id,
        'purchase_order',
        (SELECT created_by FROM public.purchase_orders WHERE id = NEW.purchase_order_id)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for purchase order items
CREATE TRIGGER trigger_update_medicine_quantity_after_purchase
    AFTER INSERT ON public.purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_medicine_quantity_after_purchase();

-- Function to get low stock medicines
CREATE OR REPLACE FUNCTION get_low_stock_medicines(org_id UUID)
RETURNS TABLE(
    id UUID,
    name VARCHAR(255),
    generic_name VARCHAR(255),
    manufacturer VARCHAR(255),
    batch_number VARCHAR(100),
    selling_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    gst_per_unit DECIMAL(10,2),
    gst_rate DECIMAL(5,2),
    quantity INTEGER,
    low_stock_threshold INTEGER,
    expiry_date DATE,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    description TEXT,
    dosage_form VARCHAR(50),
    strength VARCHAR(50),
    prescription_required BOOLEAN,
    supplier_id UUID,
    organization_id UUID,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT m.*
    FROM public.medicines m
    WHERE m.organization_id = org_id
      AND m.is_active = true
      AND m.quantity <= m.low_stock_threshold
    ORDER BY m.quantity ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
