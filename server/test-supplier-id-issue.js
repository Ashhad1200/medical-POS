const { supabase } = require('./config/supabase');
const RefactoredPurchaseOrder = require('./models/RefactoredPurchaseOrder');

async function testSupplierIdIssue() {
    try {
        console.log('Testing supplier ID issue...');
        
        // Find any purchase order to test with
        const { data: testPO, error } = await supabase
            .from('purchase_orders')
            .select('*')
            .limit(1)
            .single();
            
        if (error || !testPO) {
            console.log('No purchase order found for testing');
            return;
        }
        
        // Set it to pending first if it's not
        if (testPO.status !== 'pending') {
            await supabase
                .from('purchase_orders')
                .update({ status: 'pending' })
                .eq('id', testPO.id);
            testPO.status = 'pending';
        }
        
        console.log('Testing with PO:', testPO.po_number, testPO.id);
        console.log('Raw DB data supplier_id:', testPO.supplier_id);
        
        // Load the purchase order using the model
        const purchaseOrder = await RefactoredPurchaseOrder.findById(testPO.id, testPO.organization_id);
        
        console.log('Model supplierId:', purchaseOrder.supplierId);
        console.log('Model supplier_id:', purchaseOrder.supplier_id);
        console.log('Model supplier object:', purchaseOrder.supplier);
        
        // Test the updateStatus method
        console.log('\nTesting updateStatus to received...');
        await purchaseOrder.updateStatus('received', testPO.created_by);
        
        console.log('✅ Status update successful');
        console.log('Updated supplierId:', purchaseOrder.supplierId);
        
        // Reset status back to pending
        await purchaseOrder.updateStatus('pending', testPO.created_by);
        console.log('✅ Reset to pending successful');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testSupplierIdIssue().then(() => {
    console.log('Test completed');
    process.exit(0);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});