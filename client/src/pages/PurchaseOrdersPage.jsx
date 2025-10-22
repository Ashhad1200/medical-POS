import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  usePurchaseOrders,
  useCreatePurchaseOrder,
  useReceivePurchaseOrder,
  useCancelPurchaseOrder,
} from "../hooks/usePurchaseOrders";
import { useSuppliers } from "../hooks/useSuppliers";
import { useMedicines } from "../hooks/useMedicines";
import OrderReceiptModal from "../components/Suppliers/OrderReceiptModal";
import ReceiveOrderModal from "../components/Suppliers/ReceiveOrderModal";
import { toast } from "react-hot-toast";
import api from "../services/api";

// ============================================================================
// MODAL: Create Purchase Order
// ============================================================================

const CreatePurchaseOrderModal = ({
  isOpen,
  onClose,
  suppliers,
  medicines,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState({
    supplierId: "",
    expectedDeliveryDate: "",
    notes: "",
    items: [{ medicineId: "", quantity: 1, unitCost: 0 }],
  });

  const handleSupplierChange = (e) => {
    setFormData({ ...formData, supplierId: e.target.value });
  };

  const handleDateChange = (e) => {
    setFormData({ ...formData, expectedDeliveryDate: e.target.value });
  };

  const handleNotesChange = (e) => {
    setFormData({ ...formData, notes: e.target.value });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];

    if (field === "medicineId") {
      // When medicine is selected, get its cost_price
      const selectedMedicine = medicines.find((m) => m.id === value);
      newItems[index].medicineId = value;
      newItems[index].unitCost = selectedMedicine?.cost_price || 0;
    } else {
      newItems[index][field] =
        field === "quantity" ? parseInt(value) || 0 : parseFloat(value) || 0;
    }

    setFormData({ ...formData, items: newItems });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { medicineId: "", quantity: 1, unitCost: 0 }],
    });
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.supplierId) {
      toast.error("Please select a supplier");
      return;
    }

    if (!formData.expectedDeliveryDate) {
      toast.error("Please select expected delivery date");
      return;
    }

    if (formData.items.length === 0) {
      toast.error("Please add at least one medicine item");
      return;
    }

    const hasInvalidItems = formData.items.some(
      (item) => !item.medicineId || item.quantity <= 0
    );
    if (hasInvalidItems) {
      toast.error("Please fill all medicine details with valid quantities");
      return;
    }

    await onSubmit(formData);

    // Reset form
    setFormData({
      supplierId: "",
      expectedDeliveryDate: "",
      notes: "",
      items: [{ medicineId: "", quantity: 1, unitCost: 0 }],
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Create Purchase Order</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-white hover:bg-blue-800 p-1 rounded disabled:opacity-50"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Supplier Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supplier <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.supplierId}
              onChange={handleSupplierChange}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              required
            >
              <option value="">Select a supplier...</option>
              {suppliers?.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name} ({supplier.code || "N/A"})
                </option>
              ))}
            </select>
          </div>

          {/* Expected Delivery Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected Delivery Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.expectedDeliveryDate}
              onChange={handleDateChange}
              disabled={isLoading}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={handleNotesChange}
              disabled={isLoading}
              placeholder="Add any notes or special instructions..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          {/* Medicine Items */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Items <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                disabled={isLoading}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div
                  key={index}
                  className="flex gap-3 items-end p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  {/* Medicine */}
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Medicine
                    </label>
                    <select
                      value={item.medicineId}
                      onChange={(e) =>
                        handleItemChange(index, "medicineId", e.target.value)
                      }
                      disabled={isLoading}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                      required
                    >
                      <option value="">Select medicine...</option>
                      {medicines?.map((medicine) => (
                        <option key={medicine.id} value={medicine.id}>
                          {medicine.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="w-20">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Qty
                    </label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, "quantity", e.target.value)
                      }
                      disabled={isLoading}
                      min="1"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                      required
                    />
                  </div>

                  {/* Unit Cost */}
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Cost
                    </label>
                    <input
                      type="number"
                      value={item.unitCost}
                      onChange={(e) =>
                        handleItemChange(index, "unitCost", e.target.value)
                      }
                      disabled={isLoading}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                      required
                    />
                  </div>

                  {/* Total */}
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Total
                    </label>
                    <div className="px-3 py-2 text-sm bg-white border border-gray-300 rounded font-semibold text-gray-900">
                      {(item.quantity * item.unitCost).toFixed(2)}
                    </div>
                  </div>

                  {/* Remove Button */}
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      disabled={isLoading}
                      className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Total Amount:</span>
              <span className="font-bold text-blue-600">
                PKR{" "}
                {formData.items
                  .reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
                  .toFixed(2)}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Create Purchase Order
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Purchase Order Table Component
 */
const PurchaseOrderTable = ({
  orders,
  onReceive,
  onCancel,
  onGenerateReceipt,
  isLoading,
}) => {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { bg: "bg-gray-100", text: "text-gray-800", icon: "📝" },
      pending: { bg: "bg-yellow-100", text: "text-yellow-800", icon: "⏳" },
      approved: { bg: "bg-purple-100", text: "text-purple-800", icon: "✅" },
      ordered: { bg: "bg-blue-100", text: "text-blue-800", icon: "📦" },
      partially_received: {
        bg: "bg-orange-100",
        text: "text-orange-800",
        icon: "📥",
      },
      received: { bg: "bg-green-100", text: "text-green-800", icon: "✔️" },
      cancelled: { bg: "bg-red-100", text: "text-red-800", icon: "❌" },
    };

    const config = statusConfig[status?.toLowerCase()] || statusConfig.draft;
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}
      >
        <span className="mr-2">{config.icon}</span>
        {status?.charAt(0).toUpperCase() + status?.slice(1).replace("_", " ")}
      </span>
    );
  };

  const getAvailableActions = (status) => {
    const actionMap = {
      draft: ["receipt", "receive", "cancel"],
      pending: ["receipt", "receive", "cancel"],
      approved: ["receipt", "receive", "cancel"],
      ordered: ["receipt", "receive", "cancel"],
      partially_received: ["receipt", "receive", "cancel"],
      received: ["receipt"],
      cancelled: [],
    };
    return actionMap[status?.toLowerCase()] || [];
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!orders?.length) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="mt-4 text-gray-600">No purchase orders found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              PO Number
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Supplier
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Expected Delivery
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {order.po_number || "N/A"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {order.supplier_name || "N/A"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {formatDate(order.order_date)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {formatDate(order.expected_delivery_date)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                {formatCurrency(order.total_amount)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(order.status)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                {getAvailableActions(order.status).map((action) => (
                  <button
                    key={action}
                    onClick={() => {
                      if (action === "receipt") onGenerateReceipt(order);
                      else if (action === "cancel") onCancel(order.id);
                      else if (action === "receive") onReceive(order);
                    }}
                    className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      action === "receipt"
                        ? "text-white bg-green-600 hover:bg-green-700"
                        : action === "cancel"
                        ? "text-white bg-red-600 hover:bg-red-700"
                        : "text-white bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {action === "receipt" && "📄 Receipt"}
                    {action === "receive" && "✅ Receive"}
                    {action === "cancel" && "❌ Cancel"}
                  </button>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Filter & Search Component
 */
const FilterBar = ({ filters, onFilterChange, onSearch, statuses }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) =>
              onFilterChange({ ...filters, status: e.target.value, page: 1 })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() +
                  status.slice(1).replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search PO Number
          </label>
          <input
            type="text"
            placeholder="e.g., PO-001"
            value={filters.search}
            onChange={(e) =>
              onFilterChange({ ...filters, search: e.target.value, page: 1 })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sort By
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) =>
              onFilterChange({ ...filters, sortBy: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="order_date">Date (Newest)</option>
            <option value="total_amount">Amount (High to Low)</option>
            <option value="created_at">Created Date</option>
          </select>
        </div>
      </div>

      {/* Clear Filters */}
      {(filters.status || filters.search) && (
        <div>
          <button
            onClick={() =>
              onFilterChange({
                status: "",
                search: "",
                page: 1,
                sortBy: "order_date",
                sortOrder: "desc",
              })
            }
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

const PageHeader = ({
  totalOrders,
  onCreateOrder,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Purchase Orders
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage and track all purchase orders
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
            >
              {isRefreshing ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg
                    className="-ml-1 mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh
                </>
              )}
            </button>
            <button
              onClick={onCreateOrder}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <svg
                className="-ml-1 mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Create Purchase Order
            </button>
          </div>
        </div>
        {totalOrders > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            Total Orders:{" "}
            <span className="font-semibold text-gray-900">{totalOrders}</span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Pagination Component
 */
const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.pages <= 1) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="text-sm text-gray-600">
        Page <span className="font-semibold">{pagination.page}</span> of{" "}
        <span className="font-semibold">{pagination.pages}</span> (
        {pagination.total} total)
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        {Array.from(
          { length: Math.min(5, pagination.pages) },
          (_, i) => i + 1
        ).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pagination.page === page
                ? "bg-blue-600 text-white"
                : "border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.pages}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

const PurchaseOrdersPage = () => {
  // State Management
  const [filters, setFilters] = useState({
    status: "",
    search: "",
    page: 1,
    limit: 10,
    sortBy: "order_date",
    sortOrder: "desc",
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveData, setReceiveData] = useState(null);

  // Data Fetching (MUST be before useEffect)
  const {
    data: purchaseOrdersData,
    isLoading: poLoading,
    refetch: refetchPurchaseOrders,
    isFetching: isPOFetching,
  } = usePurchaseOrders(filters);
  const { data: suppliersData, isLoading: suppliersLoading } = useSuppliers({
    page: 1,
    limit: 100,
  });
  const { data: medicinesData, isLoading: medicinesLoading } = useMedicines({
    page: 1,
    limit: 100,
  });
  const createPurchaseOrderMutation = useCreatePurchaseOrder();
  const receivePurchaseOrderMutation = useReceivePurchaseOrder();
  const cancelPurchaseOrderMutation = useCancelPurchaseOrder();

  // Debug: Log API responses
  useEffect(() => {
    console.log("🔍 Full purchaseOrdersData:", purchaseOrdersData);
    console.log(
      "🔍 purchaseOrdersData.purchaseOrders:",
      purchaseOrdersData?.purchaseOrders
    );
    console.log(
      "🔍 purchaseOrdersData.pagination:",
      purchaseOrdersData?.pagination
    );
  }, [purchaseOrdersData, suppliersData, medicinesData]);

  // Memoized computations
  const purchaseOrders = useMemo(() => {
    return Array.isArray(purchaseOrdersData?.purchaseOrders)
      ? purchaseOrdersData.purchaseOrders
      : [];
  }, [purchaseOrdersData]);

  const pagination = useMemo(() => {
    return purchaseOrdersData?.pagination || {};
  }, [purchaseOrdersData]);

  const totalOrders = useMemo(() => pagination.total || 0, [pagination]);

  // Available status options
  const statuses = [
    "pending",
    "approved",
    "ordered",
    "partially_received",
    "received",
    "cancelled",
  ];

  // Handle Filter Changes
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  // Handle Page Change
  const handlePageChange = useCallback((newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  }, []);

  // Handle Modal Open/Close
  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Handle Manual Refresh
  const handleRefresh = useCallback(() => {
    console.log("🔄 Manual refresh triggered");
    refetchPurchaseOrders();
  }, [refetchPurchaseOrders]);

  // Handle Create Order from Modal
  const handleCreateOrder = useCallback(
    async (formData) => {
      try {
        console.log(
          "📤 Creating order from modal:",
          JSON.stringify(formData, null, 2)
        );

        const response = await createPurchaseOrderMutation.mutateAsync(
          formData
        );
        console.log("✅ Mutation response:", response);

        if (response && response.data.purchaseOrder) {
          toast.success("✅ Purchase order created successfully!");

          const purchaseOrder = response.data.purchaseOrder;
          const supplier = suppliersData?.data?.find(
            (s) => s.id === formData.supplierId
          );

          // Get the items with medicine details
          const items = formData.items.map((item) => {
            const medicine = medicinesData?.data?.medicines?.find(
              (m) => m.id === item.medicineId
            );
            return {
              id: item.medicineId,
              medicine_name: medicine?.name || "Unknown",
              quantity: item.quantity,
              unit_cost: item.unitCost,
              total_cost: item.quantity * item.unitCost,
            };
          });

          // Prepare receipt data
          setReceiptData({
            purchaseOrder,
            supplier,
            items,
            orderId:
              purchaseOrder.po_number || `PO-${purchaseOrder.id?.slice(-8)}`,
            total: purchaseOrder.total_amount,
          });

          // Show receipt modal
          setShowReceiptModal(true);

          // Close creation modal
          handleCloseModal();

          // Force refetch with a small delay to ensure server has processed
          console.log("🔄 Refetching purchase orders...");
          setTimeout(() => {
            setFilters((prev) => ({
              ...prev,
              page: 1,
              status: "",
              search: "",
            }));
            refetchPurchaseOrders();
          }, 500);
        }
      } catch (error) {
        console.error("❌ Failed to create order:", error);
        console.error("Error response data:", error.response?.data);
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error?.message ||
          "Failed to create purchase order";
        toast.error(errorMessage);
      }
    },
    [
      createPurchaseOrderMutation,
      refetchPurchaseOrders,
      handleCloseModal,
      suppliersData,
      medicinesData,
      setFilters,
    ]
  );

  // Handle Receive Order - Show Receive Modal
  const handleReceiveOrder = useCallback(
    async (order) => {
      console.log(`📥 Opening receive modal for order:`, order);

      try {
        const supplier = suppliersData?.data?.find(
          (s) => s.id === order.supplier_id
        );

        // Fetch full order details
        console.log("🔄 Fetching full order details...");
        try {
          const response = await api.get(`/purchase-orders/${order.id}`);
          const apiData = response.data;
          const fullOrder =
            apiData.data?.purchaseOrder || apiData.data || order;

          // Get items
          let items = [];

          if (
            fullOrder.items &&
            Array.isArray(fullOrder.items) &&
            fullOrder.items.length > 0
          ) {
            items = fullOrder.items
              .map((item) => {
                const medicine = medicinesData?.data?.medicines?.find(
                  (m) => m.id === item.medicine_id
                );
                return {
                  id: item.medicine_id || item.id,
                  name:
                    medicine?.name ||
                    item.medicine_name ||
                    item.name ||
                    "Unknown",
                  quantity: item.quantity,
                  tradePrice:
                    item.unit_price || item.cost_price || item.price || 0,
                  manufacturer: medicine?.manufacturer || "N/A",
                  batch_number: item.batch_number || "N/A",
                  expiry_date: item.expiry_date,
                  notes: item.notes,
                };
              })
              .filter((item) => item.name && item.name !== "No items loaded");
          } else if (
            fullOrder.po_items &&
            Array.isArray(fullOrder.po_items) &&
            fullOrder.po_items.length > 0
          ) {
            items = fullOrder.po_items
              .map((item) => {
                const medicine = medicinesData?.data?.medicines?.find(
                  (m) => m.id === item.medicine_id
                );
                return {
                  id: item.medicine_id || item.id,
                  name:
                    medicine?.name ||
                    item.medicine_name ||
                    item.name ||
                    "Unknown",
                  quantity: item.quantity,
                  tradePrice:
                    item.unit_price || item.cost_price || item.price || 0,
                  manufacturer: medicine?.manufacturer || "N/A",
                  batch_number: item.batch_number || "N/A",
                  expiry_date: item.expiry_date,
                  notes: item.notes,
                };
              })
              .filter((item) => item.name && item.name !== "No items loaded");
          }

          // Set receive data
          setReceiveData({
            order: fullOrder,
            supplier,
            items: items.length > 0 ? items : [],
            orderId: fullOrder.po_number || `PO-${fullOrder.id?.slice(-8)}`,
            total: fullOrder.total_amount || fullOrder.total || 0,
          });

          // Show receive modal
          setShowReceiveModal(true);
        } catch (fetchError) {
          console.error("❌ Error fetching order details:", fetchError);
          toast.error("Failed to load order details. Please try again.");
        }
      } catch (error) {
        console.error("❌ Error preparing receive modal:", error);
        toast.error("Failed to prepare receive modal.");
      }
    },
    [suppliersData, medicinesData]
  );

  // Handle All Items Received
  const handleAllItemsReceived = useCallback(
    (items) => {
      if (receiveData?.order?.id) {
        console.log(
          `✅ Marking order ${receiveData.order.id} as fully received with all ordered quantities`
        );

        // Build items with full ordered quantities for confirmation
        const allItems = items.map((item) => ({
          id: item.id,
          received_quantity: item.quantity, // Full ordered quantity = full receipt
        }));

        console.log("📤 Sending full receipt with all quantities:", allItems);

        // Call API to record full receipt
        api
          .patch(`/purchase-orders/${receiveData.order.id}/receive`, {
            items: allItems,
          })
          .then((response) => {
            console.log("✅ Full receipt recorded:", response.data);
            setShowReceiveModal(false);
            setReceiveData(null);
            refetchPurchaseOrders();
            toast.success("✅ All items marked as received successfully!");
          })
          .catch((error) => {
            console.error("❌ Failed to record full receipt:", error);
            toast.error(
              error.response?.data?.message || "Failed to record full receipt"
            );
          });
      }
    },
    [receiveData]
  );

  // Handle Partial Receipt
  const handleEditItems = useCallback(
    (items) => {
      console.log("💾 Partial receipt items:", items);
      if (receiveData?.order?.id) {
        // Send partial receipt data to API
        const partialItems = items
          .filter((item) => item.receivedQuantity > 0)
          .map((item) => ({
            id: item.id,
            received_quantity: item.receivedQuantity, // ← Use received_quantity (snake_case as expected by validator)
          }));

        console.log(
          "📤 Sending partial receipt with received quantities:",
          partialItems
        );

        // Call API to record partial receipt with items data
        api
          .patch(`/purchase-orders/${receiveData.order.id}/receive`, {
            items: partialItems,
          })
          .then((response) => {
            console.log("✅ Partial receipt recorded:", response.data);
            setShowReceiveModal(false);
            setReceiveData(null);
            refetchPurchaseOrders();
            toast.success("✅ Partial receipt recorded successfully!");
          })
          .catch((error) => {
            console.error("❌ Failed to record partial receipt:", error);
            toast.error(
              error.response?.data?.message ||
                "Failed to record partial receipt"
            );
          });
      }
    },
    [receiveData]
  );

  // Handle Cancel Order
  const handleCancelOrder = useCallback(
    (orderId) => {
      console.log(`❌ Cancelling order ${orderId}`);
      if (
        window.confirm("Are you sure you want to cancel this purchase order?")
      ) {
        cancelPurchaseOrderMutation.mutate(orderId, {
          onSuccess: () => {
            console.log("✅ Order cancelled");
          },
        });
      }
    },
    [cancelPurchaseOrderMutation]
  );

  // Handle Generate Receipt
  const handleGenerateReceipt = useCallback(
    async (order) => {
      try {
        console.log("📄 Generating receipt for order:", order);

        const supplier = suppliersData?.data?.find(
          (s) => s.id === order.supplier_id
        );

        // Always fetch the full order details to get items
        console.log("🔄 Fetching full order details for receipt from API...");
        try {
          const response = await api.get(`/purchase-orders/${order.id}`);
          const apiData = response.data;
          console.log("✅ API Response:", apiData);

          // Handle different possible response structures
          const fullOrder =
            apiData.data?.purchaseOrder || apiData.data || order;
          console.log("📊 Full order data:", fullOrder);

          // Get items - they might come from the order object in different formats
          let items = [];

          // Check if items exist directly on the order
          if (
            fullOrder.items &&
            Array.isArray(fullOrder.items) &&
            fullOrder.items.length > 0
          ) {
            console.log("📦 Found items in fullOrder.items:", fullOrder.items);
            items = fullOrder.items
              .map((item) => {
                console.log("Processing item:", item);
                const medicine = medicinesData?.data?.medicines?.find(
                  (m) => m.id === item.medicine_id
                );
                return {
                  id: item.medicine_id || item.id,
                  name:
                    medicine?.name ||
                    item.medicine_name ||
                    item.name ||
                    "Unknown",
                  quantity: item.quantity,
                  tradePrice:
                    item.unit_price || item.cost_price || item.price || 0,
                  manufacturer: medicine?.manufacturer || "N/A",
                  batch_number: item.batch_number || "N/A",
                  expiry_date: item.expiry_date,
                  notes: item.notes,
                };
              })
              .filter((item) => item.name && item.name !== "No items loaded");
          }
          // Check alternative names
          else if (
            fullOrder.po_items &&
            Array.isArray(fullOrder.po_items) &&
            fullOrder.po_items.length > 0
          ) {
            console.log(
              "📦 Found items in fullOrder.po_items:",
              fullOrder.po_items
            );
            items = fullOrder.po_items
              .map((item) => {
                const medicine = medicinesData?.data?.medicines?.find(
                  (m) => m.id === item.medicine_id
                );
                return {
                  id: item.medicine_id || item.id,
                  name:
                    medicine?.name ||
                    item.medicine_name ||
                    item.name ||
                    "Unknown",
                  quantity: item.quantity,
                  tradePrice:
                    item.unit_price || item.cost_price || item.price || 0,
                  manufacturer: medicine?.manufacturer || "N/A",
                  batch_number: item.batch_number || "N/A",
                  expiry_date: item.expiry_date,
                  notes: item.notes,
                };
              })
              .filter((item) => item.name && item.name !== "No items loaded");
          }
          // Check for line_items
          else if (
            fullOrder.line_items &&
            Array.isArray(fullOrder.line_items) &&
            fullOrder.line_items.length > 0
          ) {
            console.log(
              "📦 Found items in fullOrder.line_items:",
              fullOrder.line_items
            );
            items = fullOrder.line_items
              .map((item) => {
                const medicine = medicinesData?.data?.medicines?.find(
                  (m) => m.id === item.medicine_id
                );
                return {
                  id: item.medicine_id || item.id,
                  name:
                    medicine?.name ||
                    item.medicine_name ||
                    item.name ||
                    "Unknown",
                  quantity: item.quantity,
                  tradePrice:
                    item.unit_price || item.cost_price || item.price || 0,
                  manufacturer: medicine?.manufacturer || "N/A",
                  batch_number: item.batch_number || "N/A",
                  expiry_date: item.expiry_date,
                  notes: item.notes,
                };
              })
              .filter((item) => item.name && item.name !== "No items loaded");
          }

          console.log("📊 Final items array for receipt:", items);

          // Prepare receipt data
          setReceiptData({
            purchaseOrder: fullOrder,
            supplier,
            items: items.length > 0 ? items : [],
            orderId:
              fullOrder.po_number ||
              fullOrder.order_id ||
              `PO-${fullOrder.id?.slice(-8)}`,
            total: fullOrder.total_amount || fullOrder.total || 0,
          });

          // Show receipt modal
          setShowReceiptModal(true);
        } catch (fetchError) {
          console.error("❌ Error fetching from API:", fetchError);
          // Fallback: use the order as-is without full details
          toast.warn(
            "Could not load full order details, showing available information"
          );

          setReceiptData({
            purchaseOrder: order,
            supplier,
            items: [],
            orderId: order.po_number || `PO-${order.id?.slice(-8)}`,
            total: order.total_amount || 0,
          });
          setShowReceiptModal(true);
        }
      } catch (error) {
        console.error("❌ Error generating receipt:", error);
        toast.error("Failed to load receipt data. Please try again.");
      }
    },
    [suppliersData, medicinesData]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        totalOrders={totalOrders}
        onCreateOrder={handleOpenModal}
        onRefresh={handleRefresh}
        isRefreshing={isPOFetching}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Filters */}
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          statuses={statuses}
        />

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <PurchaseOrderTable
            orders={purchaseOrders}
            onReceive={handleReceiveOrder}
            onCancel={handleCancelOrder}
            onGenerateReceipt={handleGenerateReceipt}
            isLoading={poLoading}
          />
        </div>

        {/* Pagination */}
        {purchaseOrders.length > 0 && (
          <Pagination pagination={pagination} onPageChange={handlePageChange} />
        )}
      </div>

      {/* Modal */}
      <CreatePurchaseOrderModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        suppliers={suppliersData?.data || []}
        medicines={medicinesData?.data?.medicines || []}
        onSubmit={handleCreateOrder}
        isLoading={createPurchaseOrderMutation.isPending}
      />

      {/* Receipt Modal */}
      {showReceiptModal && receiptData && (
        <OrderReceiptModal
          show={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setReceiptData(null);
          }}
          supplier={receiptData.supplier}
          items={receiptData.items.map((item) => ({
            name: item.medicine_name || item.name || "Unknown",
            quantity: item.quantity,
            tradePrice: item.unit_cost || item.tradePrice || 0,
            manufacturer: item.manufacturer || "N/A",
            batch_number: item.batch_number || "N/A",
            expiry_date: item.expiry_date,
          }))}
          total={receiptData.total}
          orderData={receiptData}
          autoPrint={false}
        />
      )}

      {/* Receive Order Modal */}
      {showReceiveModal && receiveData && (
        <ReceiveOrderModal
          show={showReceiveModal}
          onClose={() => {
            setShowReceiveModal(false);
            setReceiveData(null);
          }}
          orderData={receiveData.order}
          supplier={receiveData.supplier}
          items={receiveData.items}
          onAllItemsReceived={handleAllItemsReceived}
          onEditItems={handleEditItems}
        />
      )}
    </div>
  );
};

export default PurchaseOrdersPage;
