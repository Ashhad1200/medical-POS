const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Supabase configuration with service role
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createReceiveFunction() {
  try {
    console.log('🔧 Creating receive_purchase_order_items function...');

    const functionSQL = `
CREATE OR REPLACE FUNCTION receive_purchase_order_items(
    p_purchase_order_id UUID,
    p_items JSONB,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    item JSONB;
    po_record RECORD;
    total_received INTEGER := 0;
    total_ordered INTEGER := 0;
    result JSONB := '{"success": true, "message": "Items received successfully"}'::JSONB;
BEGIN
    -- Get purchase order details
    SELECT * INTO po_record FROM public.purchase_orders WHERE id = p_purchase_order_id;
    
    IF NOT FOUND THEN
        RETURN '{"success": false, "message": "Purchase order not found"}'::JSONB;
    END IF;
    
    -- Check if purchase order can be received
    IF po_record.status NOT IN ('ordered', 'partially_received') THEN
        RETURN '{"success": false, "message": "Purchase order cannot be received in current status"}'::JSONB;
    END IF;
    
    -- Process each item
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Update purchase order item with received quantity
        UPDATE public.purchase_order_items 
        SET 
            received_quantity = COALESCE(received_quantity, 0) + (item->>'received_quantity')::INTEGER,
            updated_at = NOW()
        WHERE id = (item->>'id')::UUID;
        
        -- Update medicine stock
        UPDATE public.medicines 
        SET 
            quantity = quantity + (item->>'received_quantity')::INTEGER,
            updated_at = NOW()
        WHERE id = (
            SELECT medicine_id FROM public.purchase_order_items 
            WHERE id = (item->>'id')::UUID
        );
        
        -- Create inventory transaction
        INSERT INTO public.inventory_transactions (
            medicine_id,
            organization_id,
            transaction_type,
            quantity,
            unit_cost,
            total_cost,
            reference_id,
            reference_type,
            created_by
        )
        SELECT 
            poi.medicine_id,
            po_record.organization_id,
            'purchase_receive',
            (item->>'received_quantity')::INTEGER,
            poi.unit_cost,
            poi.unit_cost * (item->>'received_quantity')::INTEGER,
            p_purchase_order_id,
            'purchase_order',
            p_user_id
        FROM public.purchase_order_items poi
        WHERE poi.id = (item->>'id')::UUID;
    END LOOP;
    
    -- Calculate totals to determine new status
    SELECT 
        SUM(COALESCE(received_quantity, 0)),
        SUM(quantity)
    INTO total_received, total_ordered
    FROM public.purchase_order_items
    WHERE purchase_order_id = p_purchase_order_id;
    
    -- Update purchase order status
    IF total_received >= total_ordered THEN
        UPDATE public.purchase_orders 
        SET 
            status = 'received',
            actual_delivery_date = NOW(),
            updated_at = NOW()
        WHERE id = p_purchase_order_id;
    ELSE
        UPDATE public.purchase_orders 
        SET 
            status = 'partially_received',
            updated_at = NOW()
        WHERE id = p_purchase_order_id;
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error processing items: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { data, error } = await supabase.rpc('exec_sql', {
      sql: functionSQL
    });

    if (error) {
      console.error('❌ Error creating function:', error);
      throw error;
    }

    console.log('✅ Function created successfully');
    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

if (require.main === module) {
  createReceiveFunction()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = createReceiveFunction;