require('dotenv').config();
const { supabase } = require('../config/supabase');

async function fixPurchaseOrders() {
  try {
    console.log('🔧 Fixing purchase orders with correct totals...');

    // Get all purchase orders
    const { data: purchaseOrders, error: poError } = await supabase
      .from('purchase_orders')
      .select('id, total_amount');

    if (poError) {
      throw new Error(`Error fetching purchase orders: ${poError.message}`);
    }

    console.log(`Found ${purchaseOrders.length} purchase orders to fix`);

    for (const po of purchaseOrders) {
      // Get items for this purchase order
      const { data: items, error: itemsError } = await supabase
        .from('purchase_order_items')
        .select('quantity, unit_cost')
        .eq('purchase_order_id', po.id);

      if (itemsError) {
        console.warn(`⚠️  Error fetching items for PO ${po.id}: ${itemsError.message}`);
        continue;
      }

      if (!items || items.length === 0) {
        console.log(`📝 PO ${po.id} has no items, skipping`);
        continue;
      }

      // Calculate correct total
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
      const taxAmount = subtotal * 0.1; // 10% tax
      const totalAmount = subtotal + taxAmount;

      // Update purchase order with correct total
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({
          total_amount: totalAmount,
          tax_amount: taxAmount
        })
        .eq('id', po.id);

      if (updateError) {
        console.warn(`⚠️  Error updating PO ${po.id}: ${updateError.message}`);
        continue;
      }

      console.log(`✅ Updated PO ${po.id}: $${po.total_amount} → $${totalAmount.toFixed(2)}`);
    }

    console.log('🎉 Purchase orders fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing purchase orders:', error.message);
    throw error;
  }
}

// Run the fix
fixPurchaseOrders()
  .then(() => {
    console.log('✨ Fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error.message);
    process.exit(1);
  });