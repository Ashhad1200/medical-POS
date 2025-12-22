import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '../utils/currency';
import api from '../services/api';

/**
 * RTV (Return-to-Vendor) Suggestions Page
 * Phase 4: Shows near-expiry stock grouped by supplier for return processing
 */
const RTVSuggestionsPage = () => {
    const [daysThreshold, setDaysThreshold] = useState(60);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['rtv-suggestions', daysThreshold],
        queryFn: async () => {
            const response = await api.get('/reports/rtv-suggestions', {
                params: { daysThreshold }
            });
            return response.data.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    const getUrgencyBadge = (urgency) => {
        const styles = {
            expired: 'bg-red-100 text-red-800 border-red-200',
            critical: 'bg-orange-100 text-orange-800 border-orange-200',
            urgent: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            warning: 'bg-blue-100 text-blue-800 border-blue-200'
        };
        return styles[urgency] || styles.warning;
    };

    const getUrgencyIcon = (urgency) => {
        const icons = {
            expired: '🚨',
            critical: '⚠️',
            urgent: '⏰',
            warning: '📋'
        };
        return icons[urgency] || '📋';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading RTV suggestions...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center text-red-600">
                    <p>Error loading RTV data: {error.message}</p>
                    <button
                        onClick={() => refetch()}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Return-to-Vendor (RTV) Suggestions
                </h1>
                <p className="text-gray-600">
                    Near-expiry stock that should be returned to suppliers to minimize losses
                </p>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">
                        Expiry Threshold:
                    </label>
                    <select
                        value={daysThreshold}
                        onChange={(e) => setDaysThreshold(Number(e.target.value))}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value={30}>30 Days</option>
                        <option value={60}>60 Days</option>
                        <option value={90}>90 Days</option>
                        <option value={180}>180 Days</option>
                    </select>
                </div>

                <button
                    onClick={() => refetch()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                    Refresh Data
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
                    <div className="text-2xl font-bold text-red-600">
                        {data?.summary?.expired || 0}
                    </div>
                    <div className="text-sm text-gray-600">Expired Batches</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
                    <div className="text-2xl font-bold text-orange-600">
                        {data?.summary?.critical || 0}
                    </div>
                    <div className="text-sm text-gray-600">Critical (14 days)</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
                    <div className="text-2xl font-bold text-yellow-600">
                        {data?.summary?.urgent || 0}
                    </div>
                    <div className="text-sm text-gray-600">Urgent (30 days)</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
                    <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(data?.summary?.totalPotentialLoss || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Potential Loss</div>
                </div>
            </div>

            {/* Supplier Groups */}
            <div className="space-y-6">
                {data?.supplierGroups?.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                        <div className="text-5xl mb-4">🎉</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No RTV Suggestions
                        </h3>
                        <p className="text-gray-600">
                            All inventory is within acceptable expiry range!
                        </p>
                    </div>
                ) : (
                    data?.supplierGroups?.map((group, idx) => (
                        <div key={idx} className="bg-white rounded-lg shadow-sm overflow-hidden">
                            {/* Supplier Header */}
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-semibold">
                                            {group.supplierName}
                                        </h3>
                                        <div className="text-purple-200 text-sm mt-1">
                                            {group.supplierPhone && (
                                                <span className="mr-4">📞 {group.supplierPhone}</span>
                                            )}
                                            {group.supplierEmail && (
                                                <span>✉️ {group.supplierEmail}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold">
                                            {formatCurrency(group.totalValue)}
                                        </div>
                                        <div className="text-purple-200 text-sm">
                                            {group.batches.length} batches
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Batch Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Product
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Batch
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                                Qty
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                                Cost
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                                Expiry
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                                Status
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                                Loss
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {group.batches.map((batch, batchIdx) => (
                                            <tr key={batchIdx} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900">
                                                        {batch.productName}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {batch.manufacturer}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {batch.batchNumber}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm font-medium">
                                                    {batch.quantity}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm text-gray-600">
                                                    {formatCurrency(batch.costPrice)}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm">
                                                    {new Date(batch.expiryDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyBadge(batch.urgency)}`}>
                                                        {getUrgencyIcon(batch.urgency)} {batch.urgency}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-medium text-red-600">
                                                    {formatCurrency(batch.potentialLoss)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Actions */}
                            <div className="p-4 bg-gray-50 border-t">
                                <div className="flex justify-end gap-3">
                                    <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
                                        Export List
                                    </button>
                                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
                                        Create RTV Request
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default RTVSuggestionsPage;
