#!/usr/bin/env node

const { supabase } = require("../config/supabase");
const { setupDatabase } = require("./setup-supabase");
const bcrypt = require("bcryptjs");

console.log("🚀 Starting MongoDB to Supabase Migration...\n");

async function migrateData() {
  try {
    // Step 1: Setup database structure
    console.log("📋 Step 1: Setting up database structure...");
    await setupDatabase();
    console.log("✅ Database structure ready\n");

    // Step 2: Clear existing data (if any)
    console.log("🧹 Step 2: Clearing existing data...");
    await clearExistingData();
    console.log("✅ Existing data cleared\n");

    // Step 3: Create default organization
    console.log("🏢 Step 3: Creating default organization...");
    const organizationId = await createDefaultOrganization();
    console.log("✅ Default organization created\n");

    // Step 4: Create default users
    console.log("👥 Step 4: Creating default users...");
    await createDefaultUsers(organizationId);
    console.log("✅ Default users created\n");

    // Step 5: Create sample data
    console.log("📦 Step 5: Creating sample data...");
    await createSampleData(organizationId);
    console.log("✅ Sample data created\n");

    console.log(`
🎉 Migration completed successfully!

📊 Summary:
- Database: Supabase PostgreSQL
- Organization: Moiz Medical Store (MOIZ001)
- Users: 3 (admin, counter, warehouse)
- Sample data: Medicines, suppliers

🔑 Login Credentials:
- Admin: admin / admin123
- Counter: counter / counter123
- Warehouse: warehouse / warehouse123

🌐 Next Steps:
1. Update your environment variables
2. Test the API endpoints
3. Update client-side code if needed
4. Deploy to production

📚 Documentation: See SUPABASE_MIGRATION_GUIDE.md for details
    `);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

async function clearExistingData() {
  // Delete data from tables in reverse order of dependency
  await supabase
    .from("medicines")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase
    .from("suppliers")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase
    .from("users")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase
    .from("organizations")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
}

async function createDefaultOrganization() {
  const { v4: uuidv4 } = require("uuid");
  const organizationId = uuidv4();

  const { data, error } = await supabase
    .from("organizations")
    .insert([
      {
        id: organizationId,
        name: "Moiz Medical Store",
        code: "MOIZ001",
        description: "Main medical store organization",
        address: "123 Medical Street, Healthcare City",
        phone: "+1234567890",
        email: "info@moizmedical.com",
        subscription_tier: "enterprise",
        max_users: 100,
        current_users: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return organizationId;
}

async function createDefaultUsers(organizationId) {
  const { v4: uuidv4 } = require("uuid");
  const users = [
    {
      id: uuidv4(),
      supabase_uid: "admin-" + uuidv4(),
      username: "admin",
      email: "admin@moizmedical.com",
      full_name: "System Administrator",
      role: "admin",
      role_in_pos: "admin",
      organization_id: organizationId,
      permissions: ["all"],
      is_active: true,
      is_email_verified: true,
      subscription_status: "active",
      password: await bcrypt.hash("admin123", 12),
      theme: "light",
      language: "en",
      timezone: "UTC",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      supabase_uid: "counter-" + uuidv4(),
      username: "counter",
      email: "counter@moizmedical.com",
      full_name: "Counter Staff",
      role: "user",
      role_in_pos: "counter",
      organization_id: organizationId,
      permissions: ["medicine:read", "order:create", "order:read"],
      is_active: true,
      is_email_verified: true,
      subscription_status: "active",
      password: await bcrypt.hash("counter123", 12),
      theme: "light",
      language: "en",
      timezone: "UTC",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      supabase_uid: "warehouse-" + uuidv4(),
      username: "warehouse",
      email: "warehouse@moizmedical.com",
      full_name: "Warehouse Staff",
      role: "manager",
      role_in_pos: "warehouse",
      organization_id: organizationId,
      permissions: ["inventory:all", "supplier:all", "purchase-orders:all"],
      is_active: true,
      is_email_verified: true,
      subscription_status: "active",
      password: await bcrypt.hash("warehouse123", 12),
      theme: "light",
      language: "en",
      timezone: "UTC",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const { error } = await supabase.from("users").insert(users);

  if (error) throw error;
}

async function createSampleData(organizationId) {
  const { v4: uuidv4 } = require("uuid");

  // Create supplier
  const supplierId = uuidv4();
  const { error: supplierError } = await supabase.from("suppliers").insert([
    {
      id: supplierId,
      name: "PharmaCorp Ltd",
      contact_person: "John Smith",
      phone: "+1234567891",
      email: "contact@pharmacorp.com",
      address: "456 Pharma Street, Medical District",
      organization_id: organizationId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  if (supplierError) throw supplierError;

  // Create sample medicines
  const medicines = [
    {
      id: uuidv4(),
      name: "Paracetamol 650mg",
      generic_name: "Acetaminophen",
      manufacturer: "HealthCare Pharma",
      batch_number: "BATCH001",
      selling_price: 2.5,
      cost_price: 1.8,
      gst_per_unit: 0.25,
      gst_rate: 10,
      quantity: 100,
      low_stock_threshold: 20,
      expiry_date: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      category: "Pain Relief",
      description: "For fever and pain relief",
      organization_id: organizationId,
      supplier_id: supplierId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: "Crocin Advance",
      generic_name: "Paracetamol + Caffeine",
      manufacturer: "GSK",
      batch_number: "BATCH002",
      selling_price: 15.0,
      cost_price: 10.5,
      gst_per_unit: 1.5,
      gst_rate: 10,
      quantity: 50,
      low_stock_threshold: 10,
      expiry_date: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      category: "Pain Relief",
      description: "Advanced pain relief with caffeine",
      organization_id: organizationId,
      supplier_id: supplierId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: "Cetirizine 10mg",
      generic_name: "Cetirizine Hydrochloride",
      manufacturer: "Generic Pharma",
      batch_number: "BATCH003",
      selling_price: 8.0,
      cost_price: 5.6,
      gst_per_unit: 0.8,
      gst_rate: 10,
      quantity: 75,
      low_stock_threshold: 15,
      expiry_date: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      category: "Allergy",
      description: "For allergy relief",
      organization_id: organizationId,
      supplier_id: supplierId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: "ORS Powder",
      generic_name: "Oral Rehydration Salts",
      manufacturer: "Electrolyte Corp",
      batch_number: "BATCH004",
      selling_price: 12.0,
      cost_price: 8.4,
      gst_per_unit: 1.2,
      gst_rate: 10,
      quantity: 60,
      low_stock_threshold: 12,
      expiry_date: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      category: "Hydration",
      description: "For dehydration and electrolyte balance",
      organization_id: organizationId,
      supplier_id: supplierId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: "Digene Tablet",
      generic_name: "Aluminum Hydroxide + Magnesium Hydroxide",
      manufacturer: "Digestive Health Ltd",
      batch_number: "BATCH005",
      selling_price: 18.0,
      cost_price: 12.6,
      gst_per_unit: 1.8,
      gst_rate: 10,
      quantity: 40,
      low_stock_threshold: 8,
      expiry_date: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      category: "Digestive Health",
      description: "For acidity and indigestion",
      organization_id: organizationId,
      supplier_id: supplierId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const { error: medicinesError } = await supabase
    .from("medicines")
    .insert(medicines);

  if (medicinesError) throw medicinesError;
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateData();
}

module.exports = { migrateData };
