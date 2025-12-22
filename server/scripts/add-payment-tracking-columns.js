/**
 * Migration: Add Partial Payment Tracking Columns to Orders Table
 * 
 * Adds: amount_paid, amount_due, change_given columns
 * Updates: payment_status to support 'partial' and 'unpaid' values
 */

const { query } = require('../config/database');

async function runMigration() {
  console.log('🚀 Starting payment tracking columns migration...\n');

  try {
    // Check if columns already exist
    const checkColumns = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name IN ('amount_paid', 'amount_due', 'change_given')
    `);

    const existingColumns = checkColumns.rows.map(r => r.column_name);
    console.log('Existing payment columns:', existingColumns.length ? existingColumns : 'none');

    // Add amount_paid column
    if (!existingColumns.includes('amount_paid')) {
      console.log('✅ Adding amount_paid column...');
      await query(`
        ALTER TABLE orders 
        ADD COLUMN amount_paid DECIMAL(10, 2) DEFAULT 0
      `);
    } else {
      console.log('⏭️  amount_paid column already exists');
    }

    // Add amount_due column
    if (!existingColumns.includes('amount_due')) {
      console.log('✅ Adding amount_due column...');
      await query(`
        ALTER TABLE orders 
        ADD COLUMN amount_due DECIMAL(10, 2) DEFAULT 0
      `);
    } else {
      console.log('⏭️  amount_due column already exists');
    }

    // Add change_given column
    if (!existingColumns.includes('change_given')) {
      console.log('✅ Adding change_given column...');
      await query(`
        ALTER TABLE orders 
        ADD COLUMN change_given DECIMAL(10, 2) DEFAULT 0
      `);
    } else {
      console.log('⏭️  change_given column already exists');
    }

    // Update existing orders: set amount_paid = total_amount for paid orders
    console.log('\n📊 Backfilling existing orders...');
    const backfillResult = await query(`
      UPDATE orders 
      SET 
        amount_paid = COALESCE(total_amount, 0),
        amount_due = 0,
        change_given = 0
      WHERE payment_status = 'paid' 
        AND (amount_paid IS NULL OR amount_paid = 0)
    `);
    console.log(`   Updated ${backfillResult.rowCount} existing paid orders`);

    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const verifyResult = await query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name IN ('amount_paid', 'amount_due', 'change_given')
      ORDER BY column_name
    `);

    console.log('\nNew columns added:');
    verifyResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (default: ${row.column_default})`);
    });

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

runMigration().then(() => {
  console.log('Done.');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
