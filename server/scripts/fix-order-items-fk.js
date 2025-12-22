/**
 * Migration: Fix order_items FK constraint (v2)
 * Option 1: Drop FK (for new installations or when data is OK to lose integrity)
 * Option 2: Keep FK but make it ON DELETE SET NULL
 */

const { query } = require('../config/database');

async function fixOrderItemsFK() {
    console.log('🔄 Fixing order_items foreign key constraint (v2)...');

    try {
        // Check existing data
        const dataCheck = await query(`SELECT COUNT(*) as count FROM order_items`);
        console.log(`  Found ${dataCheck.rows[0].count} existing order items`);

        // 1. Drop the old FK constraint
        console.log('  1. Dropping old FK constraint...');
        await query(`
      ALTER TABLE order_items 
      DROP CONSTRAINT IF EXISTS order_items_medicine_id_fkey
    `);
        console.log('     ✓ Old constraint dropped');

        // 2. Check if orphan IDs exist (IDs in order_items not matching products)
        const orphanCheck = await query(`
      SELECT COUNT(*) as orphans 
      FROM order_items oi 
      LEFT JOIN products p ON oi.medicine_id = p.id 
      WHERE p.id IS NULL
    `);
        const orphanCount = parseInt(orphanCheck.rows[0].orphans);

        if (orphanCount > 0) {
            console.log(`  ⚠️  Found ${orphanCount} orphan order items (referencing non-existent products)`);
            console.log('  2. Setting orphan medicine_id to NULL...');

            // Allow NULL on medicine_id first
            await query(`
        ALTER TABLE order_items 
        ALTER COLUMN medicine_id DROP NOT NULL
      `);

            // Set orphans to NULL
            await query(`
        UPDATE order_items SET medicine_id = NULL 
        WHERE medicine_id NOT IN (SELECT id FROM products)
      `);
            console.log('     ✓ Orphan records updated');
        }

        // 3. Add new FK constraint (allowing NULL to avoid blocking inserts for orphans)
        console.log('  3. Adding new FK constraint to products table...');
        await query(`
      ALTER TABLE order_items 
      ADD CONSTRAINT order_items_medicine_id_fkey 
      FOREIGN KEY (medicine_id) REFERENCES products(id) ON DELETE SET NULL
    `);
        console.log('     ✓ New constraint added');

        console.log('✅ Migration complete! order_items.medicine_id now references products(id)');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    }
}

// Run migration
fixOrderItemsFK().then(() => {
    console.log('Done.');
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
