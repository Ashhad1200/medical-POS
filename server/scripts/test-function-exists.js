const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Supabase configuration with service role
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Initialize Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testFunction() {
  try {
    console.log('🔍 Testing if receive_purchase_order_items function exists...');

    // Try to call the function with dummy data to see if it exists
    const { data, error } = await supabase.rpc('receive_purchase_order_items', {
      p_purchase_order_id: '00000000-0000-0000-0000-000000000000',
      p_items: [],
      p_user_id: '00000000-0000-0000-0000-000000000000'
    });

    if (error) {
      if (error.message.includes('Could not find the function')) {
        console.log('❌ Function does not exist in database');
        console.log('Error:', error.message);
      } else {
        console.log('✅ Function exists but failed with expected error (dummy data)');
        console.log('Error:', error.message);
      }
    } else {
      console.log('✅ Function exists and returned:', data);
    }

    // Also try to check exec_sql function
    console.log('\n🔍 Testing exec_sql function...');
    const { data: execData, error: execError } = await supabase.rpc('exec_sql', {
      sql: 'SELECT 1 as test;'
    });

    if (execError) {
      console.log('❌ exec_sql function error:', execError.message);
    } else {
      console.log('✅ exec_sql function works:', execData);
    }

  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

testFunction();