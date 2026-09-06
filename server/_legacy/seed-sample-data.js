const { supabase } = require('./config/supabase');
const { v4: uuidv4 } = require('uuid');

async function seedSampleData() {
  console.log('🌱 Seeding sample data for AI analytics...');
  
  try {
    // Get the first organization
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1);
    
    if (orgError || !orgs?.length) {
      throw new Error('No organizations found');
    }
    
    const orgId = orgs[0].id;
    console.log(`📊 Using organization: ${orgs[0].name}`);

    // Create sample users
    console.log('👥 Creating sample users...');
    const users = [
      {
        id: uuidv4(),
        supabase_uid: uuidv4(),
        username: 'admin_demo',
        email: 'admin@demo.com',
        full_name: 'Demo Admin',
        role: 'admin',
        role_in_pos: 'admin',
        organization_id: orgId,
        is_active: true,
        is_email_verified: true,
        subscription_status: 'active'
      },
      {
        id: uuidv4(),
        supabase_uid: uuidv4(),
        username: 'cashier_demo',
        email: 'cashier@demo.com',
        full_name: 'Demo Cashier',
        role: 'user',
        role_in_pos: 'cashier',
        organization_id: orgId,
        is_active: true,
        is_email_verified: true,
        subscription_status: 'active'
      }
    ];

    const { data: createdUsers, error: userError } = await supabase
      .from('users')
      .insert(users)
      .select();
    
    if (userError) {
      console.log('⚠️ Users might already exist, continuing...');
    } else {
      console.log(`✅ Created ${createdUsers?.length || 0} users`);
    }

    // Get or use first user for creating data
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1);
    
    const userId = existingUsers?.[0]?.id || users[0].id;

    // Create sample suppliers
    console.log('🏢 Creating sample suppliers...');
    const suppliers = [
      {
        id: uuidv4(),
        name: 'PharmaCorp Ltd',
        contact_person: 'John Smith',
        phone: '+1-555-0101',
        email: 'orders@pharmacorp.com',
        address: '123 Medical District, Health City',
        organization_id: orgId,
        is_active: true
      },
      {
        id: uuidv4(),
        name: 'MediSupply Inc',
        contact_person: 'Sarah Johnson',
        phone: '+1-555-0102',
        email: 'supply@medisupply.com',
        address: '456 Pharma Avenue, Medicine Town',
        organization_id: orgId,
        is_active: true
      }
    ];

    const { data: createdSuppliers, error: supplierError } = await supabase
      .from('suppliers')
      .insert(suppliers)
      .select();
    
    if (supplierError) {
      console.log('⚠️ Suppliers might already exist, getting existing ones...');
    } else {
      console.log(`✅ Created ${createdSuppliers?.length || 0} suppliers`);
    }

    // Get suppliers for medicine creation
    const { data: allSuppliers } = await supabase
      .from('suppliers')
      .select('id')
      .eq('organization_id', orgId);
    
    const supplierId = allSuppliers?.[0]?.id || suppliers[0].id;

    // Create sample medicines
    console.log('💊 Creating sample medicines...');
    const medicines = [
      {
        id: uuidv4(),
        name: 'Paracetamol 500mg',
        generic_name: 'Acetaminophen',
        manufacturer: 'PharmaCorp Ltd',
        batch_number: 'PC001',
        selling_price: 15.00,
        cost_price: 10.00,
        gst_rate: 5.0,
        quantity: 150,
        low_stock_threshold: 20,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'Pain Relief',
        subcategory: 'Analgesics',
        description: 'Pain and fever relief',
        dosage_form: 'Tablet',
        strength: '500mg',
        pack_size: '10 tablets',
        organization_id: orgId,
        supplier_id: supplierId,
        is_active: true
      },
      {
        id: uuidv4(),
        name: 'Amoxicillin 250mg',
        generic_name: 'Amoxicillin',
        manufacturer: 'MediSupply Inc',
        batch_number: 'MS002',
        selling_price: 25.00,
        cost_price: 18.00,
        gst_rate: 5.0,
        quantity: 80,
        low_stock_threshold: 15,
        expiry_date: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'Antibiotics',
        subcategory: 'Penicillin',
        description: 'Broad-spectrum antibiotic',
        dosage_form: 'Capsule',
        strength: '250mg',
        pack_size: '14 capsules',
        organization_id: orgId,
        supplier_id: supplierId,
        is_active: true
      },
      {
        id: uuidv4(),
        name: 'Ibuprofen 400mg',
        generic_name: 'Ibuprofen',
        manufacturer: 'PharmaCorp Ltd',
        batch_number: 'PC003',
        selling_price: 20.00,
        cost_price: 14.00,
        gst_rate: 5.0,
        quantity: 120,
        low_stock_threshold: 25,
        expiry_date: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'Pain Relief',
        subcategory: 'NSAIDs',
        description: 'Anti-inflammatory pain relief',
        dosage_form: 'Tablet',
        strength: '400mg',
        pack_size: '20 tablets',
        organization_id: orgId,
        supplier_id: supplierId,
        is_active: true
      },
      {
        id: uuidv4(),
        name: 'Vitamin D3 1000IU',
        generic_name: 'Cholecalciferol',
        manufacturer: 'MediSupply Inc',
        batch_number: 'MS004',
        selling_price: 30.00,
        cost_price: 22.00,
        gst_rate: 5.0,
        quantity: 60,
        low_stock_threshold: 10,
        expiry_date: new Date(Date.now() + 500 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'Vitamins',
        subcategory: 'Fat-soluble vitamins',
        description: 'Vitamin D supplement',
        dosage_form: 'Capsule',
        strength: '1000IU',
        pack_size: '30 capsules',
        organization_id: orgId,
        supplier_id: supplierId,
        is_active: true
      },
      {
        id: uuidv4(),
        name: 'Omeprazole 20mg',
        generic_name: 'Omeprazole',
        manufacturer: 'PharmaCorp Ltd',
        batch_number: 'PC005',
        selling_price: 35.00,
        cost_price: 25.00,
        gst_rate: 5.0,
        quantity: 40,
        low_stock_threshold: 8,
        expiry_date: new Date(Date.now() + 350 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'Gastrointestinal',
        subcategory: 'Proton pump inhibitors',
        description: 'Acid reflux treatment',
        dosage_form: 'Capsule',
        strength: '20mg',
        pack_size: '14 capsules',
        organization_id: orgId,
        supplier_id: supplierId,
        is_active: true
      }
    ];

    const { data: createdMedicines, error: medicineError } = await supabase
      .from('medicines')
      .insert(medicines)
      .select();
    
    if (medicineError) {
      console.log('⚠️ Medicines might already exist, getting existing ones...');
    } else {
      console.log(`✅ Created ${createdMedicines?.length || 0} medicines`);
    }

    // Get medicines for order creation
    const { data: allMedicines } = await supabase
      .from('medicines')
      .select('id, name, selling_price')
      .eq('organization_id', orgId)
      .limit(5);

    if (!allMedicines?.length) {
      console.log('❌ No medicines available for creating orders');
      return;
    }

    // Create sample orders with realistic dates
    console.log('🛒 Creating sample orders...');
    const orders = [];
    const orderItems = [];
    
    // Get current timestamp to ensure unique order numbers
    const timestamp = Date.now();
    
    // Create orders for the last 30 days
    for (let i = 0; i < 25; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      
      const orderId = uuidv4();
      const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items per order
      let totalAmount = 0;
      let subtotal = 0;
      
      // Create order items
      for (let j = 0; j < numItems; j++) {
        const medicine = allMedicines[Math.floor(Math.random() * allMedicines.length)];
        const quantity = Math.floor(Math.random() * 5) + 1; // 1-5 quantity
        const unitPrice = medicine.selling_price;
        const itemTotal = quantity * unitPrice;
        
        orderItems.push({
          id: uuidv4(),
          order_id: orderId,
          medicine_id: medicine.id,
          quantity: quantity,
          unit_price: unitPrice,
          cost_price: unitPrice * 0.7, // 70% of selling price as cost
          total_price: itemTotal,
          discount: 0
        });
        
        subtotal += itemTotal;
      }
      
      const taxAmount = subtotal * 0.05; // 5% tax
      totalAmount = subtotal + taxAmount;
      
      orders.push({
        id: orderId,
        order_number: `ORD-${timestamp}-${String(i + 1).padStart(3, '0')}`,
        user_id: userId,
        organization_id: orgId,
        customer_name: `Customer ${i + 1}`,
        customer_phone: `+1-555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        total_amount: totalAmount,
        tax_amount: taxAmount,
        tax_percent: 5.0,
        subtotal: subtotal,
        profit: subtotal * 0.3, // 30% profit margin
        discount: 0,
        payment_method: ['cash', 'card', 'upi'][Math.floor(Math.random() * 3)],
        status: 'completed',
        created_at: orderDate.toISOString(),
        completed_at: orderDate.toISOString()
      });
    }

    // Insert orders
    const { data: createdOrders, error: orderError } = await supabase
      .from('orders')
      .insert(orders)
      .select();
    
    if (orderError) {
      console.error('❌ Error creating orders:', orderError.message);
    } else {
      console.log(`✅ Created ${createdOrders?.length || 0} orders`);
    }

    // Insert order items
    const { data: createdOrderItems, error: orderItemError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select();
    
    if (orderItemError) {
      console.error('❌ Error creating order items:', orderItemError.message);
    } else {
      console.log(`✅ Created ${createdOrderItems?.length || 0} order items`);
    }

    console.log('\n🎉 Sample data seeding completed!');
    console.log('\n📊 Summary:');
    console.log(`  Organizations: 1`);
    console.log(`  Users: ${createdUsers?.length || 'existing'}`);
    console.log(`  Suppliers: ${createdSuppliers?.length || 'existing'}`);
    console.log(`  Medicines: ${createdMedicines?.length || 'existing'}`);
    console.log(`  Orders: ${createdOrders?.length || 0}`);
    console.log(`  Order Items: ${createdOrderItems?.length || 0}`);
    
    // Run our check script to verify
    console.log('\n🔍 Verifying seeded data...');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
  }
}

seedSampleData();