const { supabase } = require('./config/supabase');

async function checkDatabaseData() {
  console.log('🔍 Checking current database data...');
  
  try {
    // Check organizations
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(5);
    
    if (orgError) {
      console.error('❌ Error fetching organizations:', orgError.message);
    } else {
      console.log(`\n📊 Organizations (${orgs?.length || 0}):`);
      orgs?.forEach(org => console.log(`  - ${org.name} (${org.id})`));
    }

    // Get first organization for further queries
    const orgId = orgs?.[0]?.id;
    if (!orgId) {
      console.log('❌ No organizations found, cannot check other data');
      return;
    }

    // Check users
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, username, email, role')
      .eq('organization_id', orgId)
      .limit(10);
    
    if (userError) {
      console.error('❌ Error fetching users:', userError.message);
    } else {
      console.log(`\n👥 Users (${users?.length || 0}):`);
      users?.forEach(user => console.log(`  - ${user.username} (${user.email}) - ${user.role}`));
    }

    // Check medicines
    const { data: medicines, error: medError } = await supabase
      .from('medicines')
      .select('id, name, quantity, cost_price, selling_price')
      .eq('organization_id', orgId)
      .limit(10);
    
    if (medError) {
      console.error('❌ Error fetching medicines:', medError.message);
    } else {
      console.log(`\n💊 Medicines (${medicines?.length || 0}):`);
      medicines?.forEach(med => console.log(`  - ${med.name}: Qty ${med.quantity}, Cost $${med.cost_price}, Price $${med.selling_price}`));
    }

    // Check orders
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (orderError) {
      console.error('❌ Error fetching orders:', orderError.message);
    } else {
      console.log(`\n🛒 Recent Orders (${orders?.length || 0}):`);
      orders?.forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString();
        console.log(`  - Order ${order.id}: $${order.total_amount} (${order.status}) - ${date}`);
      });
    }

    // Check suppliers
    const { data: suppliers, error: supplierError } = await supabase
      .from('suppliers')
      .select('id, name, contact_person, phone')
      .eq('organization_id', orgId)
      .limit(5);
    
    if (supplierError) {
      console.error('❌ Error fetching suppliers:', supplierError.message);
    } else {
      console.log(`\n🏢 Suppliers (${suppliers?.length || 0}):`);
      suppliers?.forEach(supplier => console.log(`  - ${supplier.name} (Contact: ${supplier.contact_person})`));
    }

    // Summary
    console.log('\n📈 Database Summary:');
    console.log(`  Organizations: ${orgs?.length || 0}`);
    console.log(`  Users: ${users?.length || 0}`);
    console.log(`  Medicines: ${medicines?.length || 0}`);
    console.log(`  Orders: ${orders?.length || 0}`);
    console.log(`  Suppliers: ${suppliers?.length || 0}`);

    // Calculate some basic analytics
    if (orders?.length > 0) {
      const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      const avgOrderValue = totalRevenue / orders.length;
      console.log(`\n💰 Revenue Analytics:`);
      console.log(`  Total Revenue (last 10 orders): $${totalRevenue.toFixed(2)}`);
      console.log(`  Average Order Value: $${avgOrderValue.toFixed(2)}`);
    }

  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

checkDatabaseData();