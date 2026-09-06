-- =====================================================================
-- 003 - medicines.reorder_level
-- Referenced by inventoryController and routes/dashboard.js (ai-insights,
-- smart-alerts) but never created by 001. Missing it 500s those endpoints.
-- =====================================================================
ALTER TABLE public.medicines
  ADD COLUMN IF NOT EXISTS reorder_level integer DEFAULT 10;

-- keep it aligned with the existing threshold column where one is set
UPDATE public.medicines
SET reorder_level = low_stock_threshold
WHERE reorder_level IS NULL AND low_stock_threshold IS NOT NULL;
