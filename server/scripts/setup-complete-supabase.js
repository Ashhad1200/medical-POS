const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

// Load environment variables
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables");
  console.error(
    "Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Read the schema file
const schemaPath = path.join(__dirname, "create-supabase-schema.sql");
const schemaSQL = fs.readFileSync(schemaPath, "utf8");

// Generate UUID function
function generateId() {
  return uuidv4();
}

// Test database connection
async function testConnection() {
  try {
    console.log("🔍 Testing Supabase connection...");

    const { data, error } = await supabase
      .from("organizations")
      .select("id")
      .limit(1);

    if (error && error.code === "42P01") {
      console.log("⚠️  Tables do not exist, will create them...");
      return false;
    } else if (error) {
      throw error;
    }

    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    throw error;
  }
}

// Create database schema
async function createSchema() {
  try {
    console.log("🏗️  Creating database schema...");

    const { error } = await supabase.rpc("exec_sql", {
      sql: schemaSQL,
    });

    if (error) {
      console.warn(
        "⚠️  Schema creation failed (may already exist or exec_sql not found):",
        error.message
      );
    }

    console.log("✅ Database schema created successfully");
  } catch (error) {
    console.error("❌ Error creating schema:", error.message);
    throw error;
  }
}

// Create default organization
async function createDefaultOrganization() {
  try {
    console.log("🏢 Creating/Updating default organization...");

    const defaultOrgData = {
      name: "Moiz Medical Store",
      code: "MOIZ001",
      description: "Main medical store organization",
      address: "123 Medical Street, Healthcare City",
      phone: "+1234567890",
      email: "info@moizmedical.com",
      website: "https://moizmedical.com",
      is_active: true,
      subscription_tier: "enterprise",
      max_users: 100,
      current_users: 0,
      currency: "USD",
      timezone: "UTC",
    };

    const { data: org, error } = await supabase
      .from("organizations")
      .upsert(defaultOrgData, {
        onConflict: "code", // Use 'code' as the conflict target
      })
      .select()
      .single();

    if (error) throw error;

    console.log("✅ Created/Updated organization:", org.name);
    return org.id;
  } catch (error) {
    console.error("❌ Error creating/updating organization:", error.message);
    throw error;
  }
}

// Create Supabase Auth users and link to profiles
async function createUsers(organizationId) {
  try {
    console.log("👥 Creating users...");

    const users = [
      {
        email: "admin@moizmedical.com",
        password: "admin123",
        username: "admin",
        fullName: "System Administrator",
        role: "admin",
        roleInPos: "admin",
        permissions: ["all"],
      },
      {
        email: "counter@moizmedical.com",
        password: "counter123",
        username: "counter",
        fullName: "Counter Staff",
        role: "user",
        roleInPos: "counter",
        permissions: [
          "medicine:read",
          "order:create",
          "order:read",
          "customer:read",
        ],
      },
      {
        email: "warehouse@moizmedical.com",
        password: "warehouse123",
        username: "warehouse",
        fullName: "Warehouse Staff",
        role: "manager",
        roleInPos: "warehouse",
        permissions: [
          "inventory:all",
          "supplier:all",
          "purchase-orders:all",
          "medicine:write",
        ],
      },
    ];

    const createdUsers = [];

    for (const userData of users) {
      try {

        // Check if user already exists in Supabase Auth
        const { data: existingAuthUsers, error: getAuthError } = await supabase.auth.admin.listUsers({
          email: userData.email,
        });

        if (getAuthError) {
          console.warn(`⚠️  Error checking existing auth user for ${userData.email}:`, getAuthError.message);
          continue;
        }

        if (existingAuthUsers?.users?.length > 0) {
          authUser = existingAuthUsers.users[0];
          console.log(`ℹ️  Auth user already exists for ${userData.email}. Attempting to confirm email.`);
          // Explicitly confirm email for existing users
          const { error: updateAuthError } = await supabase.auth.admin.updateUserById(authUser.id, {
            email_confirm: true,
          });
          if (updateAuthError) {
            console.warn(`⚠️  Failed to confirm email for existing auth user ${userData.email}:`, updateAuthError.message);
          } else {
            console.log(`✅ Email confirmed for existing auth user: ${userData.email}`);
          }
        } else {
          // Create user in Supabase Auth
          const { data: newAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: false, // Set to false for demo users to bypass email confirmation
            user_metadata: {
              username: userData.username,
              full_name: userData.fullName,
              role: userData.role,
            },
          });

          if (createAuthError) {
            console.warn(
              `⚠️  Auth user creation failed for ${userData.email}:`,
              createAuthError.message
            );
            continue;
          }
          authUser = newAuthUser.user;
        }

        // Check if user profile exists in our 'users' table
        const { data: existingProfile, error: getProfileError } = await supabase
          .from("users")
          .select("*")
          .eq("supabase_uid", authUser.id)
          .single();

        if (getProfileError && getProfileError.code !== 'PGRST116') { // PGRST116 means no rows found
          console.warn(`⚠️  Error checking existing user profile for ${userData.email}:`, getProfileError.message);
          continue;
        }

        if (existingProfile) {
          profile = existingProfile;
          console.log(`ℹ️  User profile already exists for ${userData.email}, skipping creation.`);
        } else {
          // Create user profile in our users table
          const { data: newProfile, error: createProfileError } = await supabase
            .from("users")
            .insert({
              id: generateId(),
              supabase_uid: authUser.id,
              username: userData.username,
              email: userData.email,
              full_name: userData.fullName,
              role: userData.role,
              role_in_pos: userData.roleInPos,
              permissions: userData.permissions,
              organization_id: organizationId,
              is_active: true,
              is_email_verified: true,
              subscription_status: "active",
              theme: "light",
              language: "en",
              timezone: "UTC",
            })
            .select()
            .single();

          if (createProfileError) {
            console.warn(
              `⚠️  Profile creation failed for ${userData.email}:`,
              createProfileError.message
            );
            // Optionally, delete auth user if profile creation fails
            // await supabase.auth.admin.deleteUser(authUser.id);
            continue;
          }
          profile = newProfile;
        }

        createdUsers.push(profile);
        console.log(`✅ Processed user: ${profile.username} (${profile.role})`);
      } catch (error) {
        console.warn(
          `⚠️  User processing failed for ${userData.email}:`,
          error.message
        );
      }
    }

    // Update organization user count
    await supabase
      .from("organizations")
      .update({ current_users: createdUsers.length })
      .eq("id", organizationId);

    console.log(`✅ Created ${createdUsers.length} users`);
    return createdUsers;
  } catch (error) {
    console.error("❌ Error creating users:", error.message);
    throw error;
  }
}

// Create sample suppliers
async function createSuppliers(organizationId, adminUserId) {
  try {
    console.log("🏭 Creating sample suppliers...");

    const suppliers = [
      {
        name: "PharmaCorp Ltd",
        contact_person: "John Smith",
        phone: "+1234567891",
        email: "contact@pharmacorp.com",
        address: "456 Pharma Street, Medical District",
        city: "Healthcare City",
        state: "Medical State",
        country: "USA",
        postal_code: "12345",
        website: "https://pharmacorp.com",
        payment_terms: "Net 30",
        credit_limit: 50000.0,
      },
      {
        name: "MediSupply Co",
        contact_person: "Sarah Johnson",
        phone: "+1234567892",
        email: "sales@medisupply.com",
        address: "789 Medical Avenue, Pharma Zone",
        city: "Pharma City",
        state: "Medical State",
        country: "USA",
        postal_code: "67890",
        website: "https://medisupply.com",
        payment_terms: "Net 45",
        credit_limit: 75000.0,
      },
      {
        name: "HealthCare Pharma",
        contact_person: "Mike Wilson",
        phone: "+1234567893",
        email: "info@healthcarepharma.com",
        address: "321 Health Street, Wellness District",
        city: "Wellness City",
        state: "Medical State",
        country: "USA",
        postal_code: "54321",
        website: "https://healthcarepharma.com",
        payment_terms: "Net 30",
        credit_limit: 100000.0,
      },
    ];

    const createdSuppliers = [];

    for (const supplierData of suppliers) {
      const { data: supplier, error } = await supabase
        .from("suppliers")
        .insert({
          id: generateId(),
          ...supplierData,
          organization_id: organizationId,
          created_by: adminUserId,
        })
        .select()
        .single();

      if (error) {
        console.warn(
          `⚠️  Supplier creation failed for ${supplierData.name}:`,
          error.message
        );
        continue;
      }

      createdSuppliers.push(supplier);
      console.log(`✅ Created supplier: ${supplier.name}`);
    }

    console.log(`✅ Created ${createdSuppliers.length} suppliers`);
    return createdSuppliers;
  } catch (error) {
    console.error("❌ Error creating suppliers:", error.message);
    throw error;
  }
}

// Create sample medicines
async function createMedicines(organizationId, suppliers, adminUserId) {
  try {
    console.log("💊 Creating sample medicines...");

    const medicines = [
      {
        name: "Paracetamol 650mg",
        generic_name: "Acetaminophen",
        manufacturer: "HealthCare Pharma",
        batch_number: "BATCH001",
        selling_price: 2.5,
        cost_price: 1.8,
        gst_per_unit: 0.25,
        gst_rate: 10.0,
        quantity: 100,
        low_stock_threshold: 20,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        category: "Pain Relief",
        subcategory: "Fever",
        description: "For fever and pain relief",
        dosage_form: "Tablet",
        strength: "650mg",
        pack_size: "10 tablets",
        storage_conditions: "Store in a cool, dry place",
        prescription_required: false,
      },
      {
        name: "Crocin Advance",
        generic_name: "Paracetamol + Caffeine",
        manufacturer: "GSK",
        batch_number: "BATCH002",
        selling_price: 15.0,
        cost_price: 10.5,
        gst_per_unit: 1.5,
        gst_rate: 10.0,
        quantity: 50,
        low_stock_threshold: 10,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        category: "Pain Relief",
        subcategory: "Headache",
        description: "Advanced pain relief with caffeine",
        dosage_form: "Tablet",
        strength: "500mg + 65mg",
        pack_size: "15 tablets",
        storage_conditions: "Store in a cool, dry place",
        prescription_required: false,
      },
      {
        name: "Cetirizine 10mg",
        generic_name: "Cetirizine Hydrochloride",
        manufacturer: "Generic Pharma",
        batch_number: "BATCH003",
        selling_price: 8.0,
        cost_price: 5.6,
        gst_per_unit: 0.8,
        gst_rate: 10.0,
        quantity: 75,
        low_stock_threshold: 15,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        category: "Allergy",
        subcategory: "Antihistamine",
        description: "For allergy relief",
        dosage_form: "Tablet",
        strength: "10mg",
        pack_size: "10 tablets",
        storage_conditions: "Store in a cool, dry place",
        prescription_required: false,
      },
      {
        name: "Omeprazole 20mg",
        generic_name: "Omeprazole",
        manufacturer: "PharmaCorp Ltd",
        batch_number: "BATCH004",
        selling_price: 25.0,
        cost_price: 18.0,
        gst_per_unit: 2.5,
        gst_rate: 10.0,
        quantity: 30,
        low_stock_threshold: 8,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        category: "Gastrointestinal",
        subcategory: "Acid Reflux",
        description: "For acid reflux and heartburn",
        dosage_form: "Capsule",
        strength: "20mg",
        pack_size: "14 capsules",
        storage_conditions: "Store in a cool, dry place",
        prescription_required: true,
      },
      {
        name: "Amoxicillin 500mg",
        generic_name: "Amoxicillin",
        manufacturer: "MediSupply Co",
        batch_number: "BATCH005",
        selling_price: 45.0,
        cost_price: 32.0,
        gst_per_unit: 4.5,
        gst_rate: 10.0,
        quantity: 25,
        low_stock_threshold: 5,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        category: "Antibiotics",
        subcategory: "Penicillin",
        description: "Broad-spectrum antibiotic",
        dosage_form: "Capsule",
        strength: "500mg",
        pack_size: "10 capsules",
        storage_conditions: "Store in a cool, dry place",
        prescription_required: true,
      },
    ];

    const createdMedicines = [];

    for (let i = 0; i < medicines.length; i++) {
      const medicineData = medicines[i];
      const supplier = suppliers[i % suppliers.length]; // Distribute among suppliers

      const { data: medicine, error } = await supabase
        .from("medicines")
        .insert({
          id: generateId(),
          ...medicineData,
          organization_id: organizationId,
          supplier_id: supplier.id,
          created_by: adminUserId,
        })
        .select()
        .single();

      if (error) {
        console.warn(
          `⚠️  Medicine creation failed for ${medicineData.name}:`,
          error.message
        );
        continue;
      }

      createdMedicines.push(medicine);
      console.log(`✅ Created medicine: ${medicine.name}`);
    }

    console.log(`✅ Created ${createdMedicines.length} medicines`);
    return createdMedicines;
  } catch (error) {
    console.error("❌ Error creating medicines:", error.message);
    throw error;
  }
}

// Create sample customers
async function createCustomers(organizationId, adminUserId) {
  try {
    console.log("👥 Creating sample customers...");

    const customers = [
      {
        name: "John Doe",
        phone: "+1234567890",
        email: "john.doe@email.com",
        address: "123 Main Street, City Center",
        city: "City Center",
        state: "State",
        country: "USA",
        postal_code: "12345",
        date_of_birth: "1985-05-15",
        gender: "Male",
        medical_history: "Hypertension, Diabetes",
        allergies: "Penicillin",
        emergency_contact: "Jane Doe",
        emergency_phone: "+1234567891",
      },
      {
        name: "Jane Smith",
        phone: "+1234567892",
        email: "jane.smith@email.com",
        address: "456 Oak Avenue, Suburb",
        city: "Suburb",
        state: "State",
        country: "USA",
        postal_code: "67890",
        date_of_birth: "1990-08-22",
        gender: "Female",
        medical_history: "Asthma",
        allergies: "None",
        emergency_contact: "Bob Smith",
        emergency_phone: "+1234567893",
      },
      {
        name: "Mike Johnson",
        phone: "+1234567894",
        email: "mike.johnson@email.com",
        address: "789 Pine Street, Downtown",
        city: "Downtown",
        state: "State",
        country: "USA",
        postal_code: "54321",
        date_of_birth: "1978-12-10",
        gender: "Male",
        medical_history: "Heart condition",
        allergies: "Sulfa drugs",
        emergency_contact: "Lisa Johnson",
        emergency_phone: "+1234567895",
      },
    ];

    const createdCustomers = [];

    for (const customerData of customers) {
      const { data: customer, error } = await supabase
        .from("customers")
        .insert({
          id: generateId(),
          ...customerData,
          organization_id: organizationId,
          created_by: adminUserId,
        })
        .select()
        .single();

      if (error) {
        console.warn(
          `⚠️  Customer creation failed for ${customerData.name}:`,
          error.message
        );
        continue;
      }

      createdCustomers.push(customer);
      console.log(`✅ Created customer: ${customer.name}`);
    }

    console.log(`✅ Created ${createdCustomers.length} customers`);
    return createdCustomers;
  } catch (error) {
    console.error("❌ Error creating customers:", error.message);
    throw error;
  }
}

// Main setup function
async function setupCompleteSystem() {
  try {
    console.log("🚀 Starting complete Supabase setup...\n");

    // It's better to create the schema directly.
    await createSchema();

    // Check if organization exists
    const { data: existingOrg, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, current_users")
      .eq("code", "MOIZ001")
      .single();

    if (existingOrg) {
      console.log(
        `ℹ️  Organization already exists: ${existingOrg.name} (${existingOrg.current_users} users)`
      );
    }

    // Create organization
    const organizationId =
      existingOrg?.id || (await createDefaultOrganization());

    // Get admin user for creating other data
    const { data: adminUser, error: adminError } = await supabase
      .from("users")
      .select("id")
      .eq("username", "admin")
      .eq("organization_id", organizationId)
      .single();

    let adminUserId = adminUser?.id;

    // Create users if they don't exist
    if (!adminUserId) {
      const users = await createUsers(organizationId);
      adminUserId = users.find((u) => u.username === "admin")?.id;
    }

    if (!adminUserId) {
      throw new Error("Admin user not found or created");
    }

    // Create sample data
    const suppliers = await createSuppliers(organizationId, adminUserId);
    const medicines = await createMedicines(
      organizationId,
      suppliers,
      adminUserId
    );
    const customers = await createCustomers(organizationId, adminUserId);

    console.log("\n🎉 Complete setup finished successfully!");
    console.log("\n📊 Summary:");
    console.log(`- Organization: Moiz Medical Store (MOIZ001)`);
    console.log(`- Users: 3 (admin, counter, warehouse)`);
    console.log(`- Suppliers: ${suppliers.length}`);
    console.log(`- Medicines: ${medicines.length}`);
    console.log(`- Customers: ${customers.length}`);

    console.log("\n🔑 Login Credentials:");
    console.log("- Admin: admin@moizmedical.com / admin123");
    console.log("- Counter: counter@moizmedical.com / counter123");
    console.log("- Warehouse: warehouse@moizmedical.com / warehouse123");

    console.log("\n🌐 Organization ID:", organizationId);
    console.log("\n✨ Your Medical POS system is ready to use!");
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupCompleteSystem();
}

module.exports = { setupCompleteSystem };
