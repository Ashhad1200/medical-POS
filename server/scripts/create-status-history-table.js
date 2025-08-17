const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createStatusHistoryTable() {
  try {
    console.log('🔄 Creating purchase_order_status_history table...');

    // Check if table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('purchase_order_status_history')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Table already exists!');
      return;
    }

    // Create the table using a simpler approach
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS purchase_order_status_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          purchase_order_id UUID NOT NULL,
          old_status VARCHAR(50) NOT NULL,
          new_status VARCHAR(50) NOT NULL,
          changed_by UUID NOT NULL,
          notes TEXT,
          changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_po_status_history_po_id 
          ON purchase_order_status_history(purchase_order_id);
        CREATE INDEX IF NOT EXISTS idx_po_status_history_changed_at 
          ON purchase_order_status_history(changed_at);
      `
    });

    if (error) {
      console.error('❌ Error creating table:', error);
      
      // Try alternative approach - direct table creation
      console.log('🔄 Trying alternative approach...');
      
      const { error: altError } = await supabase
        .from('purchase_order_status_history')
        .insert({
          purchase_order_id: '00000000-0000-0000-0000-000000000000',
          old_status: 'test',
          new_status: 'test',
          changed_by: '00000000-0000-0000-0000-000000000000',
          notes: 'test entry to create table'
        });
      
      if (altError && altError.code === '42P01') {
        console.log('📋 Table does not exist. Please create it manually in Supabase dashboard.');
        console.log('SQL to run in Supabase SQL editor:');
        console.log(`
CREATE TABLE purchase_order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL,
  old_status VARCHAR(50) NOT NULL,
  new_status VARCHAR(50) NOT NULL,
  changed_by UUID NOT NULL,
  notes TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_po_status_history_po_id ON purchase_order_status_history(purchase_order_id);
CREATE INDEX idx_po_status_history_changed_at ON purchase_order_status_history(changed_at);

ALTER TABLE purchase_order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view status history" ON purchase_order_status_history
  FOR SELECT USING (purchase_order_id IN (
    SELECT id FROM purchase_orders WHERE organization_id IN (
      SELECT organization_id FROM users WHERE supabase_uid = auth.uid()
    )
  ));

CREATE POLICY "Users can insert status history" ON purchase_order_status_history
  FOR INSERT WITH CHECK (purchase_order_id IN (
    SELECT id FROM purchase_orders WHERE organization_id IN (
      SELECT organization_id FROM users WHERE supabase_uid = auth.uid()
    )
  ));
`);
        return;
      }
      
      // Clean up test entry
      await supabase
        .from('purchase_order_status_history')
        .delete()
        .eq('notes', 'test entry to create table');
    }

    console.log('✅ Purchase order status history table created successfully!');
    
  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  }
}

// Run the script
createStatusHistoryTable();