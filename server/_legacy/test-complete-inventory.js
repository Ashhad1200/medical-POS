const { supabase } = require('./config/supabase');
const RefactoredPurchaseOrder = require('./models/RefactoredPurchaseOrder');

async function testCompleteInventoryFlow() {
  console.log('🧪 Testing complete inventory update flow...');
  
  try {
    // Get organization ID from existing medicines
    const { data: medicineData, error: medError } = await supabase
      .from('medicines')
      .select('organization_id')
      .limit(1);

    if (medError || !medicineData.length) {
      throw new Error('No medicines found in database');
    }

    const organizationId = medicineData[0].organization_id;
    console.log(`📋 Using organization: ${organizationId}`);

    // Get a valid user ID from the organization
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', organizationId)
      .limit(1);

    let userId = 'test-user-id';
    if (users && users.length > 0) {
      userId = users[0].id;
      console.log(`👤 Using existing user: ${userId}`);
    } else {
      console.log(`👤 Using default test user ID: ${userId}`);
    }

    // Create a test supplier if none exists
    let supplier;
    const { data: existingSuppliers } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('organization_id', organizationId)
      .limit(1);

    if (existingSuppliers && existingSuppliers.length > 0) {
      supplier = existingSuppliers[0];
      console.log(`🏢 Using existing supplier: ${supplier.name}`);
    } else {
      const { data: newSupplier, error: supplierError } = await supabase
        .from('suppliers')
        .insert({
          name: 'Test Supplier for Inventory',
          contact_person: 'Test Contact',
          phone: '123-456-7890',
          email: 'test@supplier.com',
          organization_id: organizationId
        })
        .select()
        .single();

      if (supplierError) {
        throw new Error(`Failed to create supplier: ${supplierError.message}`);
      }
      
      supplier = newSupplier;
      console.log(`🏢 Created new supplier: ${supplier.name}`);
    }

    // Get existing medicines from the same organization and reset their quantities
    const { data: existingMedicines, error: medicineError } = await supabase
      .from('medicines')
      .select('id, name, quantity, cost_price, selling_price')
      .eq('organization_id', organizationId)
      .limit(3);

    if (medicineError || !existingMedicines.length) {
      throw new Error('No medicines found for this organization');
    }

    // Reset medicine quantities to a known baseline for testing
    const baselineQuantity = 100;
    for (const medicine of existingMedicines) {
      await supabase
        .from('medicines')
        .update({ quantity: baselineQuantity })
        .eq('id', medicine.id);
      medicine.quantity = baselineQuantity; // Update local copy
    }

    const medicines = existingMedicines;
    console.log(`💊 Found ${medicines.length} existing medicines (reset to baseline):`);
    medicines.forEach(med => {
      console.log(`  ${med.name} (stock: ${med.quantity}, cost: $${med.cost_price})`);
    });

    // Record initial quantities
    const initialQuantities = {};
    medicines.forEach(med => {
      initialQuantities[med.id] = {
        name: med.name,
        quantity: med.quantity
      };
    });

    console.log('\n📊 Initial Medicine Quantities:');
    Object.values(initialQuantities).forEach(med => {
      console.log(`  ${med.name}: ${med.quantity} units`);
    });

    // Create purchase order
    const poData = {
      organizationId: organizationId,
      supplierId: supplier.id,
      status: 'pending',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: 'Test purchase order for inventory testing',
      items: medicines.map((medicine, index) => {
        const qty = (index + 1) * 5;
        const cost = medicine.cost_price || 10.00;
        return {
          medicineId: medicine.id,
          quantity: qty,
          unitCost: cost,
          totalCost: qty * cost
        };
      })
    };

    console.log('\n🏗️ Creating purchase order...');
    console.log('PO Data:', JSON.stringify(poData, null, 2));
    const purchaseOrder = new RefactoredPurchaseOrder(poData);
    purchaseOrder.createdBy = userId; // Set the user ID
    
    try {
      await purchaseOrder.save(userId);
      console.log('✅ Purchase order saved successfully');
      console.log('PO ID after save:', purchaseOrder.id);
      console.log('Items in PO after save:', purchaseOrder.items?.length || 0);
      
      // Force reload the purchase order to check if items were saved
      const reloadedPO = await RefactoredPurchaseOrder.findById(purchaseOrder.id, organizationId, true);
      console.log('Items in reloaded PO:', reloadedPO.items?.length || 0);
      
      if (reloadedPO.items && reloadedPO.items.length > 0) {
        // Update our reference to use the reloaded PO
        Object.assign(purchaseOrder, reloadedPO);
      }
    } catch (saveError) {
      console.error('❌ Failed to save purchase order:', saveError.message);
      throw saveError;
    }

    console.log(`✅ Purchase order created: ${purchaseOrder.poNumber}`);
    console.log('📦 Items ordered:');
    if (purchaseOrder.items && purchaseOrder.items.length > 0) {
      purchaseOrder.items.forEach((item, index) => {
        const medicine = medicines.find(m => m.id === (item.medicine_id || item.medicineId));
        console.log(`  ${medicine.name}: ${item.quantity} units @ $${item.unit_cost || item.unitCost}`);
      });
    } else {
      console.log('  ⚠️ No items found in purchase order');
      // Reload the purchase order with items
      const reloadedPO = await RefactoredPurchaseOrder.findById(purchaseOrder.id, organizationId, true);
      if (reloadedPO.items && reloadedPO.items.length > 0) {
        console.log('  📦 Reloaded items:');
        reloadedPO.items.forEach((item, index) => {
          const medicine = medicines.find(m => m.id === item.medicineId);
          console.log(`    ${medicine.name}: ${item.quantity} units`);
        });
        // Update the purchaseOrder reference
        purchaseOrder.items = reloadedPO.items;
      }
    }

    // Now test the markAsReceived functionality
    console.log('\n🔄 Testing markAsReceived functionality...');
    
    // Simulate the controller logic
    const itemsToReceive = purchaseOrder.items.map(item => ({
      id: item.id,
      received_quantity: item.quantity - (item.received_quantity || 0)
    })).filter(item => item.received_quantity > 0);

    console.log('Items to receive:');
    itemsToReceive.forEach(item => {
      const originalItem = purchaseOrder.items.find(i => i.id === item.id);
      const medicine = medicines.find(m => m.id === (originalItem.medicine_id || originalItem.medicineId));
      console.log(`  ${medicine.name}: receiving ${item.received_quantity} units`);
    });

    // Receive items and update inventory
    await purchaseOrder.receiveItems(itemsToReceive, userId);
    console.log('\n✅ Items received and inventory updated');

    // Check updated medicine quantities
    const { data: updatedMedicines, error: updateError } = await supabase
      .from('medicines')
      .select('id, name, quantity')
      .in('id', medicines.map(m => m.id));

    if (updateError) {
      throw new Error(`Error fetching updated medicines: ${updateError.message}`);
    }

    console.log('\n📊 Updated Medicine Quantities:');
    let allCorrect = true;
    updatedMedicines.forEach(medicine => {
      const initial = initialQuantities[medicine.id];
      const orderedItem = purchaseOrder.items.find(item => (item.medicine_id || item.medicineId) === medicine.id);
      const expectedIncrease = orderedItem.quantity;
      const actualIncrease = medicine.quantity - initial.quantity;
      
      console.log(`  ${medicine.name}: ${initial.quantity} → ${medicine.quantity} (expected +${expectedIncrease}, actual +${actualIncrease})`);
      
      if (actualIncrease === expectedIncrease) {
        console.log(`    ✅ Correct inventory update`);
      } else {
        console.log(`    ❌ Incorrect inventory update`);
        allCorrect = false;
      }
    });

    // Check inventory transactions
    const { data: transactions, error: transactionError } = await supabase
      .from('inventory_transactions')
      .select('*')
      .eq('purchase_order_id', purchaseOrder.id)
      .order('created_at', { ascending: false });

    if (transactionError) {
      console.log(`⚠️ Error fetching transactions: ${transactionError.message}`);
    } else {
      console.log(`\n📝 Inventory Transactions Created (${transactions.length}):`);
      transactions.forEach(transaction => {
        const medicine = medicines.find(m => m.id === transaction.medicine_id);
        console.log(`  ${transaction.transaction_type}: ${transaction.quantity} units of ${medicine?.name || 'Unknown Medicine'}`);
      });
    }

    // Check final purchase order status
    const updatedPO = await RefactoredPurchaseOrder.findById(purchaseOrder.id, organizationId);
    console.log(`\n📋 Final Purchase Order Status: ${updatedPO.status}`);
    
    if (updatedPO.status === 'received') {
      console.log('✅ Purchase order correctly marked as received');
    } else {
      console.log('❌ Purchase order status not updated correctly');
      allCorrect = false;
    }

    console.log(`\n🎯 Overall Test Result: ${allCorrect ? '✅ PASSED' : '❌ FAILED'}`);
    
    return allCorrect;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test
testCompleteInventoryFlow().then((success) => {
  console.log('\n🏁 Test completed');
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});