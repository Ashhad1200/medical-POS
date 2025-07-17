const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createLowStockFunction() {
  console.log('✨ Creating get_low_stock_medicines function...');

  try {
    const sqlFunction = `
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
    `;

    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sqlFunction
    });

    if (error) {
      console.error('❌ Error creating function:', error);
      return;
    }

    console.log('✅ get_low_stock_medicines function created successfully!');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
createLowStockFunction();