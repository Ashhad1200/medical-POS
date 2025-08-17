const { createClient } = require("@supabase/supabase-js");
const path = require("path");
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

// Generate UUID function
function generateId() {
  return uuidv4();
}

// Create sample purchase orders
async function createSamplePurchaseOrders() {
  try {
    console.log("🛒 Creating sample purchase orders...");

    // Get organization
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("code", "MOIZ001")
      .single();

    if (orgError || !organization) {
      throw new Error("Organization not found. Please run setup-complete-supabase.js first.");
    }

    // Get admin user
    const { data: adminUser, error: adminError } = await supabase
      .from("users")
      .select("id")
      .eq("username", "admin")
      .eq("organization_id", organization.id)
      .single();

    if (adminError || !adminUser) {
      throw new Error("Admin user not found. Please run setup-complete-supabase.js first.");
    }

    // Get suppliers
    const { data: suppliers, error: suppliersError } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("organization_id", organization.id);

    if (suppliersError || !suppliers || suppliers.length === 0) {
      throw new Error("No suppliers found. Please run setup-complete-supabase.js first.");
    }

    // Get medicines
    const { data: medicines, error: medicinesError } = await supabase
      .from("medicines")
      .select("id, name, cost_price")
      .eq("organization_id", organization.id);

    if (medicinesError || !medicines || medicines.length === 0) {
      throw new Error("No medicines found. Please run setup-complete-supabase.js first.");
    }

    // Sample purchase orders data
    const purchaseOrdersData = [
      {
        supplier_id: suppliers[0].id,
        status: "pending",
        expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        notes: "Urgent order for pain relief medicines",
        items: [
          {
            medicine_id: medicines[0].id,
            quantity: 100,
            unit_cost: medicines[0].cost_price || 12.0,
          },
          {
            medicine_id: medicines[1].id,
            quantity: 50,
            unit_cost: medicines[1].cost_price || 10.5,
          },
        ],
      },
      {
        supplier_id: suppliers[1].id,
        status: "ordered",
        expected_delivery_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        notes: "Monthly stock replenishment",
        items: [
          {
            medicine_id: medicines[2].id,
            quantity: 75,
            unit_cost: medicines[2].cost_price || 5.6,
          },
          {
            medicine_id: medicines[3].id,
            quantity: 30,
            unit_cost: medicines[3].cost_price || 18.0,
          },
        ],
      },
      {
        supplier_id: suppliers[0].id,
        status: "received",
        expected_delivery_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        received_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        notes: "Emergency antibiotics order - completed",
        items: [
          {
            medicine_id: medicines[4].id,
            quantity: 25,
            unit_cost: medicines[4].cost_price || 32.0,
          },
        ],
      },
      {
        supplier_id: suppliers[1].id,
        status: "cancelled",
        expected_delivery_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        notes: "Cancelled due to supplier unavailability",
        items: [
          {
            medicine_id: medicines[1].id,
            quantity: 200,
            unit_cost: medicines[1].cost_price || 10.5,
          },
        ],
      },
    ];

    const createdPurchaseOrders = [];

    for (const orderData of purchaseOrdersData) {
      // Calculate totals
      const subtotal = orderData.items.reduce(
        (sum, item) => sum + item.quantity * item.unit_cost,
        0
      );
      const tax = subtotal * 0.1; // 10% tax
      const total = subtotal + tax;

      // Create purchase order
      const { data: purchaseOrder, error: orderError } = await supabase
        .from("purchase_orders")
        .insert({
          po_number: `PO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          organization_id: organization.id,
          supplier_id: orderData.supplier_id,
          status: orderData.status,
          total_amount: total,
          tax_amount: tax,
          discount: 0,
          expected_delivery: orderData.expected_delivery_date,
          actual_delivery: orderData.received_date || null,
          notes: orderData.notes,
          created_by: adminUser.id,
        })
        .select()
        .single();

      if (orderError) {
        console.warn(
          `⚠️  Purchase order creation failed:`,
          orderError.message
        );
        continue;
      }

      // Create purchase order items
      const orderItems = [];
      for (const itemData of orderData.items) {
        const { data: item, error: itemError } = await supabase
          .from("purchase_order_items")
          .insert({
            purchase_order_id: purchaseOrder.id,
            medicine_id: itemData.medicine_id,
            quantity: itemData.quantity,
            unit_cost: itemData.unit_cost,
            total_cost: itemData.quantity * itemData.unit_cost,
          })
          .select()
          .single();

        if (itemError) {
          console.warn(
            `⚠️  Purchase order item creation failed:`,
            itemError.message
          );
          continue;
        }

        orderItems.push(item);
      }

      createdPurchaseOrders.push({
        ...purchaseOrder,
        items: orderItems,
      });

      console.log(
        `✅ Created purchase order: ${purchaseOrder.id} (${purchaseOrder.status})`
      );
    }

    console.log(`✅ Created ${createdPurchaseOrders.length} purchase orders`);
    return createdPurchaseOrders;
  } catch (error) {
    console.error("❌ Error creating purchase orders:", error.message);
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log("🚀 Starting purchase orders seeding...\n");

    const purchaseOrders = await createSamplePurchaseOrders();

    console.log("\n🎉 Purchase orders seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`- Purchase Orders: ${purchaseOrders.length}`);
    console.log(`- Statuses: pending, ordered, received, cancelled`);

    console.log("\n✨ You can now view purchase orders in the application!");
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { createSamplePurchaseOrders };