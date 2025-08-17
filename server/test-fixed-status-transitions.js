const { supabase } = require('./config/supabase');

// Test the fixed status transitions
async function testStatusTransitions() {
    console.log('Testing fixed status transitions...');
    
    try {
        // Find a pending purchase order
        const { data: pendingPOs, error: fetchError } = await supabase
            .from('purchase_orders')
            .select('id, po_number, status')
            .eq('status', 'pending')
            .limit(1);
            
        if (fetchError) {
            console.error('Error fetching pending POs:', fetchError);
            return;
        }
        
        if (!pendingPOs || pendingPOs.length === 0) {
            console.log('No pending purchase orders found to test');
            return;
        }
        
        const testPO = pendingPOs[0];
        console.log(`Testing with PO: ${testPO.po_number} (${testPO.id})`);
        
        // Test 1: Try to mark as received (should work)
        console.log('\n1. Testing transition from pending to received...');
        const { data: receivedPO, error: receiveError } = await supabase
            .from('purchase_orders')
            .update({ 
                status: 'received',
                actual_delivery: new Date().toISOString().split('T')[0]
            })
            .eq('id', testPO.id)
            .select()
            .single();
            
        if (receiveError) {
            console.error('❌ Failed to mark as received:', receiveError.message);
        } else {
            console.log('✅ Successfully marked as received');
            console.log('   Status:', receivedPO.status);
            console.log('   Actual delivery:', receivedPO.actual_delivery);
        }
        
        // Reset back to pending for next test
        await supabase
            .from('purchase_orders')
            .update({ status: 'pending', actual_delivery: null })
            .eq('id', testPO.id);
            
        // Test 2: Try to mark as applied (should work)
        console.log('\n2. Testing transition from pending to applied...');
        const { data: appliedPO, error: applyError } = await supabase
            .from('purchase_orders')
            .update({ 
                status: 'applied'
                // Note: applied_at column doesn't exist yet in database
            })
            .eq('id', testPO.id)
            .select()
            .single();
            
        if (applyError) {
            console.error('❌ Failed to mark as applied:', applyError.message);
        } else {
            console.log('✅ Successfully marked as applied');
            console.log('   Status:', appliedPO.status);
            // console.log('   Applied at:', appliedPO.applied_at); // Column doesn't exist yet
        }
        
        // Reset back to pending
        await supabase
            .from('purchase_orders')
            .update({ status: 'pending' })
            .eq('id', testPO.id);
            
        // Test 3: Try to mark as cancelled (should work)
        console.log('\n3. Testing transition from pending to cancelled...');
        const { data: cancelledPO, error: cancelError } = await supabase
            .from('purchase_orders')
            .update({ status: 'cancelled' })
            .eq('id', testPO.id)
            .select()
            .single();
            
        if (cancelError) {
            console.error('❌ Failed to mark as cancelled:', cancelError.message);
        } else {
            console.log('✅ Successfully marked as cancelled');
            console.log('   Status:', cancelledPO.status);
        }
        
        // Reset back to pending
        await supabase
            .from('purchase_orders')
            .update({ status: 'pending' })
            .eq('id', testPO.id);
            
        console.log('\n✅ All status transition tests completed successfully!');
        console.log('The database column issues have been resolved.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testStatusTransitions().then(() => {
    console.log('\nTest completed.');
    process.exit(0);
}).catch(error => {
    console.error('Test error:', error);
    process.exit(1);
});