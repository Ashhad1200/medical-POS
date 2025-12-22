import React from 'react';
import { formatCurrency } from '../../utils/currency';

/**
 * BatchSelector Component (Phase 4 - FEFO)
 * Displays available batches for a product, sorted by expiry date (oldest first)
 * The oldest batch is pre-selected and marked as "Recommended (FEFO)"
 */
const BatchSelector = ({
    batches = [],
    selectedBatchId,
    onBatchSelect,
    disabled = false
}) => {
    if (!batches || batches.length === 0) {
        return null;
    }

    // If only one batch, don't show selector
    if (batches.length === 1) {
        return (
            <div className="text-xs text-gray-500 mt-1">
                Batch: {batches[0].batchNumber} |
                Exp: {new Date(batches[0].expiryDate).toLocaleDateString()}
            </div>
        );
    }

    return (
        <div className="mt-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
                Select Batch (FEFO)
            </label>
            <select
                value={selectedBatchId || batches[0]?.batchId || ''}
                onChange={(e) => onBatchSelect(e.target.value)}
                disabled={disabled}
                className={`w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
                    ${batches.some(b => b.isOldest && b.batchId === selectedBatchId)
                        ? 'border-green-400' : ''}`}
            >
                {batches.map((batch, idx) => {
                    const expiryDate = new Date(batch.expiryDate);
                    const now = new Date();
                    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

                    let expiryLabel = '';
                    let bgClass = '';

                    if (daysUntilExpiry <= 0) {
                        expiryLabel = '⚠️ EXPIRED';
                        bgClass = 'text-red-600';
                    } else if (daysUntilExpiry <= 7) {
                        expiryLabel = `🔴 ${daysUntilExpiry}d left`;
                        bgClass = 'text-orange-600';
                    } else if (daysUntilExpiry <= 30) {
                        expiryLabel = `🟡 ${daysUntilExpiry}d left`;
                        bgClass = 'text-yellow-600';
                    } else {
                        expiryLabel = `✓ ${daysUntilExpiry}d`;
                    }

                    return (
                        <option
                            key={batch.batchId}
                            value={batch.batchId}
                            className={bgClass}
                        >
                            {batch.isOldest ? '★ ' : ''}
                            {batch.batchNumber} |
                            Qty: {batch.quantity} |
                            {formatCurrency(batch.sellingPrice)} |
                            {expiryLabel}
                            {batch.isOldest ? ' (FEFO)' : ''}
                        </option>
                    );
                })}
            </select>

            {/* FEFO Hint */}
            <p className="text-xs text-green-600 mt-1">
                ★ = Recommended (First-Expired, First-Out)
            </p>
        </div>
    );
};

export default BatchSelector;
