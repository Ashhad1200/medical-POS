const { query, withTransaction } = require("../config/database");

async function migrateToBatches() {
    console.log("🚀 Starting Migration: Phase 1 (Products + Batches)...");

    try {
        await withTransaction(async (client) => {
            // 1. Create PRODUCTS table (Master Data)
            console.log("📦 Creating 'products' table...");
            await client.query(`
        CREATE TABLE IF NOT EXISTS products (
          id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
          name VARCHAR NOT NULL,
          generic_name VARCHAR,
          manufacturer VARCHAR NOT NULL,
          category VARCHAR,
          subcategory VARCHAR,
          description TEXT,
          dosage_form VARCHAR,
          strength VARCHAR,
          pack_size VARCHAR,
          storage_conditions VARCHAR,
          prescription_required BOOLEAN DEFAULT false,
          gst_rate NUMERIC DEFAULT 0,
          low_stock_threshold INTEGER DEFAULT 10,
          is_active BOOLEAN DEFAULT true,
          organization_id uuid NOT NULL REFERENCES organizations(id),
          created_by uuid REFERENCES users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(name, manufacturer, organization_id)
        );
      `);

            // 2. Create INVENTORY_BATCHES table (Transactional Data)
            console.log("🧪 Creating 'inventory_batches' table...");
            await client.query(`
        CREATE TABLE IF NOT EXISTS inventory_batches (
          id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
          product_id uuid NOT NULL REFERENCES products(id),
          batch_number VARCHAR,
          expiry_date DATE NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 0,
          selling_price NUMERIC NOT NULL,
          cost_price NUMERIC NOT NULL,
          mrp NUMERIC,
          supplier_id uuid REFERENCES suppliers(id),
          is_active BOOLEAN DEFAULT true,
          organization_id uuid NOT NULL REFERENCES organizations(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(product_id, batch_number, organization_id)
        );
      `);

            // 3. Migrate Data from 'medicines' to 'products' + 'inventory_batches'
            console.log("🚚 Migrating data from 'medicines'...");

            const medicinesResult = await client.query("SELECT * FROM medicines");
            const medicines = medicinesResult.rows;

            console.log(`Found ${medicines.length} medicines to migrate.`);

            for (const med of medicines) {
                // A. Migrate/Find Product
                // Check if product exists (by name + manufacturer) to avoid dups
                let productId;
                const existingProduct = await client.query(
                    "SELECT id FROM products WHERE name = $1 AND manufacturer = $2 AND organization_id = $3",
                    [med.name, med.manufacturer, med.organization_id]
                );

                if (existingProduct.rows.length > 0) {
                    productId = existingProduct.rows[0].id;
                } else {
                    // Insert new Product
                    const prodResult = await client.query(
                        `INSERT INTO products (
              name, generic_name, manufacturer, category, subcategory, description,
              dosage_form, strength, pack_size, storage_conditions, prescription_required,
              gst_rate, low_stock_threshold, is_active, organization_id, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id`,
                        [
                            med.name, med.generic_name, med.manufacturer, med.category, med.subcategory,
                            med.description, med.dosage_form, med.strength, med.pack_size,
                            med.storage_conditions, med.prescription_required, med.gst_rate,
                            med.low_stock_threshold, med.is_active, med.organization_id, med.created_by
                        ]
                    );
                    productId = prodResult.rows[0].id;
                }

                // B. Migrate Batch
                // Use existing quantity/price as the "Default Batch" (since old system was 1-row-per-med)
                // If batch_number is null, use 'DEFAULT'
                const batchNum = med.batch_number || 'DEFAULT-' + new Date().getFullYear();

                await client.query(
                    `INSERT INTO inventory_batches (
            product_id, batch_number, expiry_date, quantity, 
            selling_price, cost_price, supplier_id, is_active, organization_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (product_id, batch_number, organization_id) DO NOTHING`,
                    [
                        productId,
                        batchNum,
                        med.expiry_date,
                        med.quantity,
                        med.selling_price,
                        med.cost_price,
                        med.supplier_id,
                        med.is_active,
                        med.organization_id
                    ]
                );
            }

            console.log("✅ Migration Logic Complete.");
        });

        console.log("🎉 Transaction Committed. Database Upgraded Successfully.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration Failed:", error);
        process.exit(1);
    }
}

migrateToBatches();
