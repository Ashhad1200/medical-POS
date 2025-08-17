const { supabase } = require('./config/supabase');
const RefactoredPurchaseOrder = require('./models/RefactoredPurchaseOrder');

async function createTestPurchaseOrder() {
  console.log('🏗️ Creating test purchase order for inventory testing...');
  
  try {
    // Get organization ID and supplier
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);

    if (orgError || !orgs.length) {
      throw new Error('No organization found');
    }

    const organizationId = orgs[0].id;

    // Get a supplier
    const { data: suppliers, error: supplierError } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('organization_id', organizationId)
      .limit(1);

    if (supplierError || !suppliers.length) {
      throw new Error('No supplier found');
    }

    const supplier = suppliers[0];

    // Get some medicines to order
    const { data: medicines, error: medicineError } = await supabase
      .from('medicines')
      .select('id, name, quantity, unit_price')
      .eq('organization_id', organizationId)
      .limit(3);

    if (medicineError || !medicines.length) {
      throw new Error('No medicines found');
    }

    console.log(`\n📋 Creating PO for organization: ${organizationId}`);
    console.log(`🏢 Supplier: ${supplier.name}`);
    console.log(`💊 Medicines to order: ${medicines.length}`);

    // Create purchase order data
    const poData = {
      organizationId: organizationId,
      supplierId: supplier.id,
      status: 'pending',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      notes: 'Test purchase order for inventory testing',
      items: medicines.map((medicine, index) => ({
        medicineId: medicine.id,
        quantity: (index + 1) * 10, // Order 10, 20, 30 units
        unitPrice: medicine.unit_price || 10.00,
        totalPrice: ((index + 1) * 10) * (medicine.unit_price || 10.00)
      }))
    };

    // Create the purchase order
    const purchaseOrder = new RefactoredPurchaseOrder(poData);
    await purchaseOrder.save('test-user-id');

    console.log(`\n✅ Test purchase order created successfully!`);
    console.log(`📦 PO Number: ${purchaseOrder.poNumber}`);
    console.log(`🆔 PO ID: ${purchaseOrder.id}`);
    console.log(`📊 Items:`);
    
    purchaseOrder.items.forEach((item, index) => {
      const medicine = medicines.find(m => m.id === item.medicineId);
      console.log(`  ${medicine.name}: ${item.quantity} units @ $${item.unitPrice} each`);
      console.log(`    Current stock: ${medicine.quantity}`);
    });

    return {
      purchaseOrder,
      medicines: medicines.map(m => ({ id: m.id, name: m.name, currentStock: m.quantity }))
    };

  } catch (error) {
    console.error('❌ Failed to create test purchase order:', error.message);
    throw error;
  }
}

// Run the creation
createTestPurchaseOrder().then((result) => {
  console.log('\n🏁 Test purchase order creation completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Creation failed:', error);
  process.exit(1);
});