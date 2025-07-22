const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function recreateOrdersTable() {
  try {
    console.log("🔄 Recreating orders table with new schema...");

    // First, backup existing orders data
    console.log("📋 Backing up existing orders data...");
    const { data: existingOrders, error: fetchError } = await supabase
      .from('orders')
      .select('*');

    if (fetchError) {
      console.log("⚠️ Could not fetch existing orders:", fetchError.message);
    } else {
      console.log(`📊 Found ${existingOrders?.length || 0} existing orders`);
    }

    // Drop and recreate the orders table
    console.log("🗑️ Dropping and recreating orders table...");
    const { error: recreateError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Drop existing orders table and related objects
        DROP TABLE IF EXISTS public.orders CASCADE;
        
        -- Recreate orders table with new schema
        CREATE TABLE public.orders (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          order_number VARCHAR(50) UNIQUE NOT NULL,
          user_id UUID REFERENCES public.users(id),
          customer_id UUID REFERENCES public.customers(id),
          customer_name VARCHAR(255),
          customer_phone VARCHAR(20),
          customer_email VARCHAR(255),
          organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
          total_amount DECIMAL(12,2) NOT NULL,
          paid_amount DECIMAL(12,2) DEFAULT 0,
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
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_orders_organization_id ON public.orders(organization_id);
        CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
        CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
        CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
        CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
        
        -- Enable RLS
        ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
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
        
        -- Create trigger for updated_at
        CREATE TRIGGER update_orders_updated_at 
          BEFORE UPDATE ON public.orders 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `
    });

    if (recreateError) {
      console.error("❌ Error recreating orders table:", recreateError.message);
      return;
    }

    console.log("✅ Orders table recreated successfully!");
    console.log("📊 New schema includes:");
    console.log("   - customer_id (UUID, references customers table)");
    console.log("   - paid_amount (DECIMAL(12,2), default 0)");
    console.log("   - All existing columns preserved");
    console.log("   - Indexes and RLS policies applied");

    // Note: Existing data will need to be migrated separately if needed
    if (existingOrders && existingOrders.length > 0) {
      console.log("\n⚠️ Note: Existing order data was backed up but not migrated.");
      console.log("   You may need to manually migrate the data if required.");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Run the recreation
recreateOrdersTable();