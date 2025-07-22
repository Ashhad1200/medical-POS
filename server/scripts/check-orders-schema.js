const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOrdersSchema() {
  try {
    console.log("🔍 Checking orders table schema...");

    // Check if customer_id column exists
    const { data: customerIdCheck, error: customerIdError } = await supabase
      .from('orders')
      .select('customer_id')
      .limit(1);

    // Check if paid_amount column exists
    const { data: paidAmountCheck, error: paidAmountError } = await supabase
      .from('orders')
      .select('paid_amount')
      .limit(1);

    console.log("🔍 Checking required columns:");
    console.log(`   customer_id: ${customerIdError ? '❌ MISSING' : '✅ EXISTS'}`);
    console.log(`   paid_amount: ${paidAmountError ? '❌ MISSING' : '✅ EXISTS'}`);

    if (customerIdError) {
      console.log(`   customer_id error: ${customerIdError.message}`);
    }
    if (paidAmountError) {
      console.log(`   paid_amount error: ${paidAmountError.message}`);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Run the check
checkOrdersSchema();