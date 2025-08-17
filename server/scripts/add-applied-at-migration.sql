-- Add applied_at column to purchase_orders table
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN purchase_orders.applied_at IS 'Timestamp when the purchase order was applied to inventory';