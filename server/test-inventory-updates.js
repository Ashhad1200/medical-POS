const { supabase } = require('./config/supabase');
const RefactoredPurchaseOrder = require('./models/RefactoredPurchaseOrder');

async function testInventoryUpdates() {
  console.log('🧪 Testing inventory updates when marking purchase orders as received...');
  
  try {
    // Find a pending purchase order with items
    const { data: purchaseOrders, error: poError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        purchase_order_items (
          id,
          medicine_id,
          quantity,
          received_quantity,
          medicines (name, quantity)
        )
      `)
      .eq('status', 'pending')
      .not('purchase_order_items', 'is', null)
      .limit(1);

    if (poError) {
      throw new Error(`Error fetching purchase orders: ${poError.message}`);
    }

    if (!purchaseOrders || purchaseOrders.length === 0) {
      console.log('❌ No pending purchase orders with items found for testing');
      return;
    }

    const testPO = purchaseOrders[0];
    console.log(`\n📦 Testing with Purchase Order: ${testPO.po_number}`);
    console.log(`Status: ${testPO.status}`);
    console.log(`Items count: ${testPO.purchase_order_items.length}`);

    // Record initial medicine quantities
    const initialQuantities = {};
    for (const item of testPO.purchase_order_items) {
      initialQuantities[item.medicine_id] = {
        name: item.medicines.name,
        quantity: item.medicines.quantity,
        orderQuantity: item.quantity,
        receivedQuantity: item.received_quantity || 0
      };
    }

    console.log('\n📊 Initial Medicine Quantities:');
    Object.entries(initialQuantities).forEach(([medicineId, data]) => {
      console.log(`  ${data.name}: ${data.quantity} (ordering ${data.orderQuantity}, already received ${data.receivedQuantity})`);
    });

    // Get the RefactoredPurchaseOrder instance
    const purchaseOrder = await RefactoredPurchaseOrder.findById(
      testPO.id, 
      testPO.organization_id, 
      true
    );

    // Simulate marking as received (like the controller does)
    const itemsToReceive = purchaseOrder.items.map(item => ({
      id: item.id,
      received_quantity: item.quantity - (item.received_quantity || 0)
    })).filter(item => item.received_quantity > 0);

    console.log('\n🔄 Items to receive:');
    itemsToReceive.forEach(item => {
      const originalItem = purchaseOrder.items.find(i => i.id === item.id);
      console.log(`  Item ${item.id}: receiving ${item.received_quantity} units`);
    });

    if (itemsToReceive.length > 0) {
      // Receive items and update inventory
      await purchaseOrder.receiveItems(itemsToReceive, 'test-user-id');
      console.log('\n✅ Items received and inventory updated');
    } else {
      console.log('\n⚠️ No items to receive (all already received)');
      return;
    }

    // Check updated medicine quantities
    const { data: updatedMedicines, error: medicineError } = await supabase
      .from('medicines')
      .select('id, name, quantity')
      .in('id', Object.keys(initialQuantities));

    if (medicineError) {
      throw new Error(`Error fetching updated medicines: ${medicineError.message}`);
    }

    console.log('\n📊 Updated Medicine Quantities:');
    updatedMedicines.forEach(medicine => {
      const initial = initialQuantities[medicine.id];
      const expectedIncrease = initial.orderQuantity - initial.receivedQuantity;
      const actualIncrease = medicine.quantity - initial.quantity;
      
      console.log(`  ${medicine.name}: ${initial.quantity} → ${medicine.quantity} (expected increase: ${expectedIncrease}, actual: ${actualIncrease})`);
      
      if (actualIncrease === expectedIncrease) {
        console.log(`    ✅ Correct inventory update`);
      } else {
        console.log(`    ❌ Incorrect inventory update`);
      }
    });

    // Check inventory transactions
    const { data: transactions, error: transactionError } = await supabase
      .from('inventory_transactions')
      .select('*')
      .eq('purchase_order_id', testPO.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (transactionError) {
      console.log(`⚠️ Error fetching transactions: ${transactionError.message}`);
    } else {
      console.log(`\n📝 Recent Inventory Transactions (${transactions.length}):`);
      transactions.forEach(transaction => {
        console.log(`  ${transaction.transaction_type}: ${transaction.quantity} units of medicine ${transaction.medicine_id}`);
      });
    }

    // Check final purchase order status
    const { data: finalPO, error: finalError } = await supabase
      .from('purchase_orders')
      .select('status')
      .eq('id', testPO.id)
      .single();

    if (finalError) {
      console.log(`⚠️ Error fetching final PO status: ${finalError.message}`);
    } else {
      console.log(`\n📋 Final Purchase Order Status: ${finalPO.status}`);
      if (finalPO.status === 'received') {
        console.log('✅ Purchase order correctly marked as received');
      } else {
        console.log('❌ Purchase order status not updated correctly');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testInventoryUpdates().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});