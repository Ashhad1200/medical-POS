-- =====================================================
-- PURCHASE ORDER STATUS HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.purchase_order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    old_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.users(id),
    notes TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_order_status_history_purchase_order_id 
    ON public.purchase_order_status_history(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_status_history_changed_at 
    ON public.purchase_order_status_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_purchase_order_status_history_changed_by 
    ON public.purchase_order_status_history(changed_by);

-- Enable RLS
ALTER TABLE public.purchase_order_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view status history for purchase orders in their organization" 
    ON public.purchase_order_status_history
    FOR SELECT USING (purchase_order_id IN (
        SELECT id FROM public.purchase_orders WHERE organization_id IN (
            SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
        )
    ));

CREATE POLICY "Users can insert status history for purchase orders in their organization" 
    ON public.purchase_order_status_history
    FOR INSERT WITH CHECK (purchase_order_id IN (
        SELECT id FROM public.purchase_orders WHERE organization_id IN (
            SELECT organization_id FROM public.users WHERE supabase_uid = auth.uid()
        )
    ));

COMMIT;