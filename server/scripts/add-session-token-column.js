/**
 * Migration Script: Add session_token column to users table
 * 
 * This enables single session management where a user can only
 * be logged in from one device/browser at a time.
 */

const { query } = require('../config/database');

async function addSessionTokenColumn() {
  console.log('🔄 Starting migration: Add session_token column...');
  
  try {
    // Check if column already exists
    const checkColumn = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'session_token'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ Column session_token already exists. Skipping...');
      return;
    }

    // Add session_token column
    await query(`
      ALTER TABLE users 
      ADD COLUMN session_token TEXT,
      ADD COLUMN session_created_at TIMESTAMP
    `);

    console.log('✅ Successfully added session_token and session_created_at columns');

    // Create index for faster lookups
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_session_token 
      ON users(session_token)
    `);

    console.log('✅ Created index on session_token');

    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
if (require.main === module) {
  addSessionTokenColumn()
    .then(() => {
      console.log('✅ All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = { addSessionTokenColumn };
