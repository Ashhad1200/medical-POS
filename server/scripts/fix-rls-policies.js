const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixRLSPolicies() {
  try {
    console.log("🔄 Adding missing RLS policies...");

    // Add suppliers policies
    console.log("📋 Adding suppliers policies...");
    await supabase.rpc('exec_sql', {
      sql: `
        -- Suppliers policies
        DROP POLICY IF EXISTS "Users can view suppliers in their organization" ON public.suppliers;
        DROP POLICY IF EXISTS "Users can insert suppliers in their organization" ON public.suppliers;
        DROP POLICY IF EXISTS "Users can update suppliers in their organization" ON public.suppliers;
        
        CREATE POLICY "Users can view suppliers in their organization" ON public.suppliers
            FOR SELECT USING (organization_id IN (
                SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
            ));

        CREATE POLICY "Users can insert suppliers in their organization" ON public.suppliers
            FOR INSERT WITH CHECK (organization_id IN (
                SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
            ));

        CREATE POLICY "Users can update suppliers in their organization" ON public.suppliers
            FOR UPDATE USING (organization_id IN (
                SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
            ));
      `
    });

    // Add purchase orders policies
    console.log("📋 Adding purchase orders policies...");
    await supabase.rpc('exec_sql', {
      sql: `
        -- Purchase Orders policies
        DROP POLICY IF EXISTS "Users can view purchase orders in their organization" ON public.purchase_orders;
        DROP POLICY IF EXISTS "Users can insert purchase orders in their organization" ON public.purchase_orders;
        DROP POLICY IF EXISTS "Users can update purchase orders in their organization" ON public.purchase_orders;
        
        CREATE POLICY "Users can view purchase orders in their organization" ON public.purchase_orders
            FOR SELECT USING (organization_id IN (
                SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
            ));

        CREATE POLICY "Users can insert purchase orders in their organization" ON public.purchase_orders
            FOR INSERT WITH CHECK (organization_id IN (
                SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
            ));

        CREATE POLICY "Users can update purchase orders in their organization" ON public.purchase_orders
            FOR UPDATE USING (organization_id IN (
                SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
            ));
      `
    });

    // Add order items policies
    console.log("📋 Adding order items policies...");
    await supabase.rpc('exec_sql', {
      sql: `
        -- Order Items policies
        DROP POLICY IF EXISTS "Users can view order items in their organization" ON public.order_items;
        DROP POLICY IF EXISTS "Users can insert order items in their organization" ON public.order_items;
        DROP POLICY IF EXISTS "Users can update order items in their organization" ON public.order_items;
        
        CREATE POLICY "Users can view order items in their organization" ON public.order_items
            FOR SELECT USING (order_id IN (
                SELECT id FROM public.orders WHERE organization_id IN (
                    SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
                )
            ));

        CREATE POLICY "Users can insert order items in their organization" ON public.order_items
            FOR INSERT WITH CHECK (order_id IN (
                SELECT id FROM public.orders WHERE organization_id IN (
                    SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
                )
            ));

        CREATE POLICY "Users can update order items in their organization" ON public.order_items
            FOR UPDATE USING (order_id IN (
                SELECT id FROM public.orders WHERE organization_id IN (
                    SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
                )
            ));
      `
    });

    // Add purchase order items policies
    console.log("📋 Adding purchase order items policies...");
    await supabase.rpc('exec_sql', {
      sql: `
        -- Purchase Order Items policies
        DROP POLICY IF EXISTS "Users can view purchase order items in their organization" ON public.purchase_order_items;
        DROP POLICY IF EXISTS "Users can insert purchase order items in their organization" ON public.purchase_order_items;
        DROP POLICY IF EXISTS "Users can update purchase order items in their organization" ON public.purchase_order_items;
        
        CREATE POLICY "Users can view purchase order items in their organization" ON public.purchase_order_items
            FOR SELECT USING (purchase_order_id IN (
                SELECT id FROM public.purchase_orders WHERE organization_id IN (
                    SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
                )
            ));

        CREATE POLICY "Users can insert purchase order items in their organization" ON public.purchase_order_items
            FOR INSERT WITH CHECK (purchase_order_id IN (
                SELECT id FROM public.purchase_orders WHERE organization_id IN (
                    SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
                )
            ));

        CREATE POLICY "Users can update purchase order items in their organization" ON public.purchase_order_items
            FOR UPDATE USING (purchase_order_id IN (
                SELECT id FROM public.purchase_orders WHERE organization_id IN (
                    SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
                )
            ));
      `
    });

    // Add inventory transactions policies
    console.log("📋 Adding inventory transactions policies...");
    await supabase.rpc('exec_sql', {
      sql: `
        -- Inventory Transactions policies
        DROP POLICY IF EXISTS "Users can view inventory transactions in their organization" ON public.inventory_transactions;
        DROP POLICY IF EXISTS "Users can insert inventory transactions in their organization" ON public.inventory_transactions;
        
        CREATE POLICY "Users can view inventory transactions in their organization" ON public.inventory_transactions
            FOR SELECT USING (organization_id IN (
                SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
            ));

        CREATE POLICY "Users can insert inventory transactions in their organization" ON public.inventory_transactions
            FOR INSERT WITH CHECK (organization_id IN (
                SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
            ));
      `
    });

    // Add audit logs policies
    console.log("📋 Adding audit logs policies...");
    await supabase.rpc('exec_sql', {
      sql: `
        -- Audit Logs policies
        DROP POLICY IF EXISTS "Users can view audit logs in their organization" ON public.audit_logs;
        DROP POLICY IF EXISTS "Users can insert audit logs in their organization" ON public.audit_logs;
        
        CREATE POLICY "Users can view audit logs in their organization" ON public.audit_logs
            FOR SELECT USING (organization_id IN (
                SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
            ));

        CREATE POLICY "Users can insert audit logs in their organization" ON public.audit_logs
            FOR INSERT WITH CHECK (organization_id IN (
                SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
            ));
      `
    });

    console.log("✅ RLS policies updated successfully!");
    
  } catch (error) {
    console.error("❌ Error updating RLS policies:", error.message);
    console.error(error);
  }
}

fixRLSPolicies();