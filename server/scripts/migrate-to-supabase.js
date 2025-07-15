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
  await supabase.from("medicines").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("suppliers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("users").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("organizations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
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
        subscriptionTier: "enterprise",
        maxUsers: 100,
        currentUsers: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
      supabaseUid: "admin-" + uuidv4(),
      username: "admin",
      email: "admin@moizmedical.com",
      fullName: "System Administrator",
      role: "admin",
      roleInPOS: "admin",
      organizationId,
      permissions: ["all"],
      isActive: true,
      isEmailVerified: true,
      subscriptionStatus: "active",
      password: await bcrypt.hash("admin123", 12),
      theme: "light",
      language: "en",
      timezone: "UTC",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      supabaseUid: "counter-" + uuidv4(),
      username: "counter",
      email: "counter@moizmedical.com",
      fullName: "Counter Staff",
      role: "user",
      roleInPOS: "counter",
      organizationId,
      permissions: ["medicine:read", "order:create", "order:read"],
      isActive: true,
      isEmailVerified: true,
      subscriptionStatus: "active",
      password: await bcrypt.hash("counter123", 12),
      theme: "light",
      language: "en",
      timezone: "UTC",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      supabaseUid: "warehouse-" + uuidv4(),
      username: "warehouse",
      email: "warehouse@moizmedical.com",
      fullName: "Warehouse Staff",
      role: "manager",
      roleInPOS: "warehouse",
      organizationId,
      permissions: ["inventory:all", "supplier:all", "purchase-orders:all"],
      isActive: true,
      isEmailVerified: true,
      subscriptionStatus: "active",
      password: await bcrypt.hash("warehouse123", 12),
      theme: "light",
      language: "en",
      timezone: "UTC",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      contactPerson: "John Smith",
      phone: "+1234567891",
      email: "contact@pharmacorp.com",
      address: "456 Pharma Street, Medical District",
      organizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  if (supplierError) throw supplierError;

  // Create sample medicines
  const medicines = [
    {
      id: uuidv4(),
      name: "Paracetamol 650mg",
      genericName: "Acetaminophen",
      manufacturer: "HealthCare Pharma",
      batchNumber: "BATCH001",
      sellingPrice: 2.5,
      costPrice: 1.8,
      gstPerUnit: 0.25,
      gstRate: 10,
      quantity: 100,
      lowStockThreshold: 20,
      expiryDate: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      category: "Pain Relief",
      description: "For fever and pain relief",
      organizationId,
      supplierId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: "Crocin Advance",
      genericName: "Paracetamol + Caffeine",
      manufacturer: "GSK",
      batchNumber: "BATCH002",
      sellingPrice: 15.0,
      costPrice: 10.5,
      gstPerUnit: 1.5,
      gstRate: 10,
      quantity: 50,
      lowStockThreshold: 10,
      expiryDate: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      category: "Pain Relief",
      description: "Advanced pain relief with caffeine",
      organizationId,
      supplierId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: "Cetirizine 10mg",
      genericName: "Cetirizine Hydrochloride",
      manufacturer: "Generic Pharma",
      batchNumber: "BATCH003",
      sellingPrice: 8.0,
      costPrice: 5.6,
      gstPerUnit: 0.8,
      gstRate: 10,
      quantity: 75,
      lowStockThreshold: 15,
      expiryDate: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      category: "Allergy",
      description: "For allergy relief",
      organizationId,
      supplierId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: "ORS Powder",
      genericName: "Oral Rehydration Salts",
      manufacturer: "Electrolyte Corp",
      batchNumber: "BATCH004",
      sellingPrice: 12.0,
      costPrice: 8.4,
      gstPerUnit: 1.2,
      gstRate: 10,
      quantity: 60,
      lowStockThreshold: 12,
      expiryDate: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      category: "Hydration",
      description: "For dehydration and electrolyte balance",
      organizationId,
      supplierId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: "Digene Tablet",
      genericName: "Aluminum Hydroxide + Magnesium Hydroxide",
      manufacturer: "Digestive Health Ltd",
      batchNumber: "BATCH005",
      sellingPrice: 18.0,
      costPrice: 12.6,
      gstPerUnit: 1.8,
      gstRate: 10,
      quantity: 40,
      lowStockThreshold: 8,
      expiryDate: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      category: "Digestive Health",
      description: "For acidity and indigestion",
      organizationId,
      supplierId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
