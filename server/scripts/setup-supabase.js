const { supabase } = require("../config/supabase");
const { v4: uuidv4 } = require("crypto");

// SQL scripts to create tables
const createTablesSQL = `
-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id text NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  address text,
  phone text,
  email text,
  isActive boolean NOT NULL DEFAULT true,
  subscriptionTier text NOT NULL DEFAULT 'basic',
  maxUsers integer NOT NULL DEFAULT 5,
  currentUsers integer NOT NULL DEFAULT 0,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id text NOT NULL,
  supabaseUid text NOT NULL UNIQUE,
  username text NOT NULL,
  email text NOT NULL,
  fullName text,
  phone text,
  avatar text,
  role text NOT NULL DEFAULT 'user',
  permissions jsonb NOT NULL DEFAULT '[]',
  selectedRole text,
  organizationId text NOT NULL,
  subscriptionStatus text NOT NULL DEFAULT 'pending',
  accessValidTill timestamp without time zone,
  trialEndsAt timestamp without time zone,
  lastAccessExtension timestamp without time zone,
  isTrialUser boolean NOT NULL DEFAULT true,
  isActive boolean NOT NULL DEFAULT false,
  isEmailVerified boolean NOT NULL DEFAULT false,
  lastLogin timestamp without time zone,
  loginAttempts integer NOT NULL DEFAULT 0,
  lockedUntil timestamp without time zone,
  passwordResetToken text,
  passwordResetExpires timestamp without time zone,
  twoFactorEnabled boolean NOT NULL DEFAULT false,
  twoFactorSecret text,
  preferences jsonb NOT NULL DEFAULT '{}',
  theme text NOT NULL DEFAULT 'light',
  language text NOT NULL DEFAULT 'en',
  timezone text NOT NULL DEFAULT 'UTC',
  notificationSettings jsonb NOT NULL DEFAULT '{}',
  createdBy text,
  approvedBy text,
  approvedAt timestamp without time zone,
  deactivatedBy text,
  deactivatedAt timestamp without time zone,
  deactivationReason text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  roleInPOS text,
  password text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_organizationId_fkey FOREIGN KEY (organizationId) REFERENCES public.organizations(id)
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id text NOT NULL,
  name text NOT NULL,
  contactPerson text,
  phone text,
  email text,
  address text,
  isActive boolean NOT NULL DEFAULT true,
  organizationId text NOT NULL,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT suppliers_pkey PRIMARY KEY (id),
  CONSTRAINT suppliers_organizationId_fkey FOREIGN KEY (organizationId) REFERENCES public.organizations(id)
);

-- Create medicines table
CREATE TABLE IF NOT EXISTS public.medicines (
  id text NOT NULL,
  name text NOT NULL,
  genericName text,
  manufacturer text NOT NULL,
  batchNumber text,
  sellingPrice double precision NOT NULL,
  costPrice double precision NOT NULL,
  gstPerUnit double precision NOT NULL DEFAULT 0,
  gstRate double precision NOT NULL DEFAULT 0,
  quantity integer NOT NULL,
  lowStockThreshold integer NOT NULL DEFAULT 10,
  expiryDate timestamp without time zone NOT NULL,
  category text,
  description text,
  isActive boolean NOT NULL DEFAULT true,
  organizationId text NOT NULL,
  supplierId text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT medicines_pkey PRIMARY KEY (id),
  CONSTRAINT medicines_organizationId_fkey FOREIGN KEY (organizationId) REFERENCES public.organizations(id),
  CONSTRAINT medicines_supplierId_fkey FOREIGN KEY (supplierId) REFERENCES public.suppliers(id)
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id text NOT NULL,
  userId text,
  organizationId text NOT NULL,
  totalAmount double precision NOT NULL,
  taxAmount double precision NOT NULL,
  taxPercent double precision NOT NULL DEFAULT 0,
  subtotal double precision NOT NULL DEFAULT 0,
  profit double precision NOT NULL DEFAULT 0,
  discount double precision NOT NULL DEFAULT 0,
  paymentMethod text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  completedAt timestamp without time zone,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_organizationId_fkey FOREIGN KEY (organizationId) REFERENCES public.organizations(id),
  CONSTRAINT orders_userId_fkey FOREIGN KEY (userId) REFERENCES public.users(id)
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id text NOT NULL,
  orderId text NOT NULL,
  medicineId text NOT NULL,
  quantity integer NOT NULL,
  unitPrice double precision NOT NULL,
  totalPrice double precision NOT NULL,
  discount double precision NOT NULL DEFAULT 0,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_orderId_fkey FOREIGN KEY (orderId) REFERENCES public.orders(id),
  CONSTRAINT order_items_medicineId_fkey FOREIGN KEY (medicineId) REFERENCES public.medicines(id)
);

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id text NOT NULL,
  supplierId text NOT NULL,
  organizationId text NOT NULL,
  totalAmount double precision NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  orderDate timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expectedDelivery timestamp without time zone,
  notes text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT purchase_orders_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_orders_supplierId_fkey FOREIGN KEY (supplierId) REFERENCES public.suppliers(id),
  CONSTRAINT purchase_orders_organizationId_fkey FOREIGN KEY (organizationId) REFERENCES public.organizations(id)
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id text NOT NULL,
  purchaseOrderId text NOT NULL,
  medicineId text NOT NULL,
  quantity integer NOT NULL,
  unitCost double precision NOT NULL,
  totalCost double precision NOT NULL,
  CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_order_items_medicineId_fkey FOREIGN KEY (medicineId) REFERENCES public.medicines(id),
  CONSTRAINT purchase_order_items_purchaseOrderId_fkey FOREIGN KEY (purchaseOrderId) REFERENCES public.purchase_orders(id)
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id text NOT NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entityId text,
  userId text NOT NULL,
  targetUserId text,
  organizationId text NOT NULL,
  oldValues jsonb,
  newValues jsonb,
  changes jsonb,
  ipAddress text,
  userAgent text,
  requestId text,
  sessionId text,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}',
  timestamp timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_organizationId_fkey FOREIGN KEY (organizationId) REFERENCES public.organizations(id),
  CONSTRAINT audit_logs_targetUserId_fkey FOREIGN KEY (targetUserId) REFERENCES public.users(id),
  CONSTRAINT audit_logs_userId_fkey FOREIGN KEY (userId) REFERENCES public.users(id)
);
`;

// Create indexes for better performance
const createIndexesSQL = `
-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_code ON public.organizations(code);
CREATE INDEX IF NOT EXISTS idx_organizations_isActive ON public.organizations(isActive);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_supabaseUid ON public.users(supabaseUid);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_organizationId ON public.users(organizationId);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_isActive ON public.users(isActive);

-- Suppliers indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_organizationId ON public.suppliers(organizationId);
CREATE INDEX IF NOT EXISTS idx_suppliers_isActive ON public.suppliers(isActive);

-- Medicines indexes
CREATE INDEX IF NOT EXISTS idx_medicines_organizationId ON public.medicines(organizationId);
CREATE INDEX IF NOT EXISTS idx_medicines_supplierId ON public.medicines(supplierId);
CREATE INDEX IF NOT EXISTS idx_medicines_name ON public.medicines(name);
CREATE INDEX IF NOT EXISTS idx_medicines_manufacturer ON public.medicines(manufacturer);
CREATE INDEX IF NOT EXISTS idx_medicines_category ON public.medicines(category);
CREATE INDEX IF NOT EXISTS idx_medicines_expiryDate ON public.medicines(expiryDate);
CREATE INDEX IF NOT EXISTS idx_medicines_quantity ON public.medicines(quantity);
CREATE INDEX IF NOT EXISTS idx_medicines_isActive ON public.medicines(isActive);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_organizationId ON public.orders(organizationId);
CREATE INDEX IF NOT EXISTS idx_orders_userId ON public.orders(userId);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON public.orders(createdAt);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_orderId ON public.order_items(orderId);
CREATE INDEX IF NOT EXISTS idx_order_items_medicineId ON public.order_items(medicineId);

-- Purchase orders indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_organizationId ON public.purchase_orders(organizationId);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplierId ON public.purchase_orders(supplierId);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);

-- Purchase order items indexes
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchaseOrderId ON public.purchase_order_items(purchaseOrderId);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_medicineId ON public.purchase_order_items(medicineId);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_organizationId ON public.audit_logs(organizationId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_userId ON public.audit_logs(userId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity);
`;

// Function to generate UUID
function generateId() {
  return uuidv4();
}

// Seed initial data
async function seedInitialData() {
  try {
    console.log("🌱 Seeding initial data...");

    // Create default organization
    const organizationId = generateId();
    const { data: org, error: orgError } = await supabase
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
        },
      ])
      .select()
      .single();

    if (orgError) throw orgError;
    console.log("✅ Created organization:", org.name);

    // Create default admin user
    const bcrypt = require("bcryptjs");
    const adminPassword = await bcrypt.hash("admin123", 12);

    const adminUserId = generateId();
    const { data: admin, error: adminError } = await supabase
      .from("users")
      .insert([
        {
          id: adminUserId,
          supabaseUid: "admin-" + generateId(),
          username: "admin",
          email: "admin@moizmedical.com",
          fullName: "System Administrator",
          role: "admin",
          roleInPOS: "admin",
          organizationId: organizationId,
          permissions: ["all"],
          isActive: true,
          isEmailVerified: true,
          subscriptionStatus: "active",
          password: adminPassword,
          theme: "light",
          language: "en",
          timezone: "UTC",
        },
      ])
      .select()
      .single();

    if (adminError) throw adminError;
    console.log("✅ Created admin user:", admin.username);

    // Create default counter user
    const counterUserId = generateId();
    const counterPassword = await bcrypt.hash("counter123", 12);

    const { data: counter, error: counterError } = await supabase
      .from("users")
      .insert([
        {
          id: counterUserId,
          supabaseUid: "counter-" + generateId(),
          username: "counter",
          email: "counter@moizmedical.com",
          fullName: "Counter Staff",
          role: "user",
          roleInPOS: "counter",
          organizationId: organizationId,
          permissions: ["medicine:read", "order:create", "order:read"],
          isActive: true,
          isEmailVerified: true,
          subscriptionStatus: "active",
          password: counterPassword,
          theme: "light",
          language: "en",
          timezone: "UTC",
        },
      ])
      .select()
      .single();

    if (counterError) throw counterError;
    console.log("✅ Created counter user:", counter.username);

    // Create default warehouse user
    const warehouseUserId = generateId();
    const warehousePassword = await bcrypt.hash("warehouse123", 12);

    const { data: warehouse, error: warehouseError } = await supabase
      .from("users")
      .insert([
        {
          id: warehouseUserId,
          supabaseUid: "warehouse-" + generateId(),
          username: "warehouse",
          email: "warehouse@moizmedical.com",
          fullName: "Warehouse Staff",
          role: "manager",
          roleInPOS: "warehouse",
          organizationId: organizationId,
          permissions: ["inventory:all", "supplier:all", "purchase-orders:all"],
          isActive: true,
          isEmailVerified: true,
          subscriptionStatus: "active",
          password: warehousePassword,
          theme: "light",
          language: "en",
          timezone: "UTC",
        },
      ])
      .select()
      .single();

    if (warehouseError) throw warehouseError;
    console.log("✅ Created warehouse user:", warehouse.username);

    // Create default supplier
    const supplierId = generateId();
    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .insert([
        {
          id: supplierId,
          name: "PharmaCorp Ltd",
          contactPerson: "John Smith",
          phone: "+1234567891",
          email: "contact@pharmacorp.com",
          address: "456 Pharma Street, Medical District",
          organizationId: organizationId,
        },
      ])
      .select()
      .single();

    if (supplierError) throw supplierError;
    console.log("✅ Created supplier:", supplier.name);

    // Create sample medicines
    const medicines = [
      {
        id: generateId(),
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
        organizationId: organizationId,
        supplierId: supplierId,
      },
      {
        id: generateId(),
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
        organizationId: organizationId,
        supplierId: supplierId,
      },
      {
        id: generateId(),
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
        organizationId: organizationId,
        supplierId: supplierId,
      },
    ];

    const { data: createdMedicines, error: medicinesError } = await supabase
      .from("medicines")
      .insert(medicines)
      .select();

    if (medicinesError) throw medicinesError;
    console.log("✅ Created", createdMedicines.length, "sample medicines");

    console.log(`
🎉 Database setup completed successfully!

📊 Summary:
- Organization: ${org.name} (${org.code})
- Users: 3 (admin, counter, warehouse)
- Supplier: ${supplier.name}
- Medicines: ${createdMedicines.length} sample items

🔑 Login Credentials:
- Admin: admin / admin123
- Counter: counter / counter123
- Warehouse: warehouse / warehouse123

🌐 Organization ID: ${organizationId}
    `);
  } catch (error) {
    console.error("❌ Error seeding initial data:", error);
    throw error;
  }
}

// Main setup function
async function setupDatabase() {
  try {
    console.log("🚀 Starting Supabase database setup...");

    // Test connection
    const { data, error } = await supabase
      .from("organizations")
      .select("id")
      .limit(1);

    if (error) {
      console.log("⚠️  Tables may not exist, creating them...");

      // Execute table creation SQL
      const { error: createError } = await supabase.rpc("exec_sql", {
        sql: createTablesSQL,
      });

      if (createError) {
        console.error("❌ Error creating tables:", createError);
        throw createError;
      }

      // Execute index creation SQL
      const { error: indexError } = await supabase.rpc("exec_sql", {
        sql: createIndexesSQL,
      });

      if (indexError) {
        console.error("❌ Error creating indexes:", indexError);
        throw indexError;
      }

      console.log("✅ Tables and indexes created successfully");
    } else {
      console.log("✅ Database connection and tables verified");
    }

    // Check if we need to seed data
    const { count, error: countError } = await supabase
      .from("organizations")
      .select("*", { count: "exact", head: true });

    if (countError) throw countError;

    if (count === 0) {
      await seedInitialData();
    } else {
      console.log("ℹ️  Database already has data, skipping seeding");
    }

    console.log("🎉 Database setup completed successfully!");
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
