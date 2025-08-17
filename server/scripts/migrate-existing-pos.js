const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateExistingPurchaseOrders() {
  try {
    console.log('🔄 Migrating existing purchase orders to new status system...');
    
    // Get all purchase orders with old statuses
    const { data: purchaseOrders, error: fetchError } = await supabase
      .from('purchase_orders')
      .select('id, po_number, status')
      .in('status', ['draft', 'ordered', 'approved', 'partially_received']);
    
    if (fetchError) {
      console.error('❌ Error fetching purchase orders:', fetchError.message);
      return;
    }
    
    console.log(`📋 Found ${purchaseOrders.length} purchase orders to migrate`);
    
    // Migration mapping
    const statusMapping = {
      'draft': 'pending',
      'approved': 'pending', 
      'ordered': 'pending',
      'partially_received': 'received'
    };
    
    let migratedCount = 0;
    
    for (const po of purchaseOrders) {
      const newStatus = statusMapping[po.status];
      
      if (newStatus) {
        const { error: updateError } = await supabase
          .from('purchase_orders')
          .update({ status: newStatus })
          .eq('id', po.id);
        
        if (updateError) {
          console.error(`❌ Error updating PO ${po.po_number}:`, updateError.message);
        } else {
          console.log(`✅ Migrated ${po.po_number}: ${po.status} → ${newStatus}`);
          migratedCount++;
        }
      }
    }
    
    console.log(`\n🎉 Migration completed! Updated ${migratedCount} purchase orders`);
    
    // Show final status distribution
    const { data: finalStatus, error: statusError } = await supabase
      .from('purchase_orders')
      .select('status')
      .then(result => {
        if (result.error) return result;
        
        const statusCounts = result.data.reduce((acc, po) => {
          acc[po.status] = (acc[po.status] || 0) + 1;
          return acc;
        }, {});
        
        return { data: statusCounts, error: null };
      });
    
    if (!statusError) {
      console.log('\n📊 Final status distribution:');
      Object.entries(finalStatus).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
migrateExistingPurchaseOrders();