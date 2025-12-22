import React from "react";
import { getStockStatus } from "../../hooks/useInventory";
import { formatCurrency, safeMultiply } from "../../utils/currency";

// Add CSS for animations
const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out forwards;
  }
  
  .table-row-hover {
    transition: all 0.2s ease;
  }
  
  .table-row-hover:hover {
    background-color: #eff6ff;
  }
  
  .inventory-table-container {
    transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
  }
  
  .action-button {
    transition: all 0.2s ease;
  }
  
  .action-button:hover {
    transform: scale(1.1);
  }
  
  .pagination-button {
    transition: all 0.2s ease;
  }
  
  .pagination-button:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
`;

// Inject styles
if (typeof document !== 'undefined' && !document.getElementById('inventory-table-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'inventory-table-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4">
          <div className="w-8 h-8 bg-gray-200 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/6"></div>
          </div>
          <div className="w-20 h-4 bg-gray-200 rounded"></div>
          <div className="w-16 h-4 bg-gray-200 rounded"></div>
          <div className="w-24 h-4 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  </div>
);

const EmptyState = () => (
  <div className="text-center py-16">
    <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
      <svg
        className="w-12 h-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      No medicines found
    </h3>
    <p className="text-gray-500 mb-6">
      No medicines match your current filters. Try adjusting your search
      criteria.
    </p>
    <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
      <svg
        className="w-4 h-4 mr-2"
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
      Add Medicine
    </button>
  </div>
);

const StatusBadge = ({ status }) => {
  const statusConfig = {
    "in-stock": {
      bg: "bg-green-100",
      text: "text-green-800",
      label: "In Stock",
    },
    "low-stock": {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      label: "Low Stock",
    },
    "out-of-stock": {
      bg: "bg-red-100",
      text: "text-red-800",
      label: "Out of Stock",
    },
    expired: {
      bg: "bg-red-100",
      text: "text-red-800",
      label: "Expired",
    },
  };

  const config = statusConfig[status] || statusConfig["in-stock"];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
};

const TableRow = ({
  medicine,
  editingMedicine,
  setEditingMedicine,
  onUpdateQuantity,
  onDeleteMedicine,
  updateStockMutation,
  index = 0,
}) => {
  const stockStatus = getStockStatus(medicine);
  // Safe handling for Product aggregates (expiry_date is now on batches, not products)
  const hasExpiry = medicine.expiry_date && medicine.expiry_date !== null;
  const isExpired = hasExpiry ? new Date(medicine.expiry_date) <= new Date() : false;
  const daysUntilExpiry = hasExpiry ? Math.ceil(
    (new Date(medicine.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
  ) : null;

  const handleQuantitySubmit = (e) => {
    e.preventDefault();
    const newQuantity = parseInt(e.target.value);
    if (
      newQuantity !== medicine.quantity &&
      !isNaN(newQuantity) &&
      newQuantity >= 0
    ) {
      onUpdateQuantity(medicine.id, newQuantity);
    }
    setEditingMedicine(null);
  };

  const profitMargin =
    medicine.selling_price > 0 && medicine.cost_price > 0
      ? (
        ((medicine.selling_price - medicine.cost_price) / medicine.cost_price) *
        100
      ).toFixed(1)
      : 0;

  return (
    <tr
      className="table-row-hover animate-fadeIn"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Medicine Details */}
      <td className="px-6 py-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold ${isExpired
                  ? "bg-red-500"
                  : stockStatus.status === "low-stock"
                    ? "bg-yellow-500"
                    : "bg-blue-500"
                }`}
            >
              {medicine.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-sm font-medium text-gray-900 truncate"
              title={medicine.name}
            >
              {medicine.name}
            </p>
            <p
              className="text-sm text-gray-500 truncate"
              title={medicine.manufacturer}
            >
              {medicine.manufacturer}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs text-gray-500">
                {medicine.batch_number ? `Batch: ${medicine.batch_number}` : 'Multi-Batch / Master'}
              </span>
            </div>
          </div>
        </div>
      </td>

      {/* Pricing */}
      <td className="px-6 py-4">
        <div className="text-right space-y-1">
          <div className="text-base font-semibold text-gray-900">
            {formatCurrency(medicine.selling_price)}
          </div>
          {medicine.cost_price > 0 && (
            <div className="text-sm text-gray-500">
              Cost: {formatCurrency(medicine.cost_price)}
            </div>
          )}
          <div className="text-xs text-green-600 font-medium">
            {profitMargin > 0 ? `+${profitMargin}% margin` : ''}
          </div>
        </div>
      </td>

      {/* Stock Management */}
      <td className="px-6 py-4">
        <div className="flex items-center space-x-2">
          {editingMedicine === medicine.id ? (
            <input
              type="number"
              min="0"
              defaultValue={medicine.quantity}
              onBlur={handleQuantitySubmit}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleQuantitySubmit(e);
                }
              }}
              className="w-20 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setEditingMedicine(medicine.id)}
              className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
              title="Click to edit quantity"
            >
              {medicine.quantity || 0}
            </button>
          )}

          {updateStockMutation.isLoading && (
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <StatusBadge status={stockStatus.status} />
      </td>

      {/* Expiry Information */}
      <td className="px-6 py-4">
        <div className="space-y-1">
          <div className="text-sm text-gray-900">
            {/* If no specific expiry (Product Master), show generic text or range if we had it */}
            {medicine.expiry_date ? new Date(medicine.expiry_date).toLocaleDateString() : 'See Batches'}
          </div>
          {daysUntilExpiry !== null && (
            <div
              className={`text-xs ${isExpired
                  ? "text-red-600"
                  : daysUntilExpiry <= 30
                    ? "text-yellow-600"
                    : "text-gray-500"
                }`}
            >
              {isExpired
                ? "Expired"
                : daysUntilExpiry <= 30
                  ? `${daysUntilExpiry} days left`
                  : "Valid"}
            </div>
          )}
        </div>
      </td>

      {/* Total Value */}
      <td className="px-6 py-4">
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            {formatCurrency(safeMultiply(medicine.quantity, medicine.selling_price))}
          </div>
          <div className="text-xs text-gray-500">Retail value</div>
        </div>
      </td>

      {/* Actions */}
      <td className="px-6 py-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setEditingMedicine(medicine.id)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded action-button"
            title="Edit quantity"
          >
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>

          <button
            onClick={() => onDeleteMedicine(medicine.id, medicine.name)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded action-button"
            title="Delete medicine"
          >
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
};

const InventoryTable = ({
  medicines,
  isLoading,
  viewMode,
  editingMedicine,
  setEditingMedicine,
  onUpdateQuantity,
  onDeleteMedicine,
  updateStockMutation,
  deleteMedicineMutation,
  pagination,
  onPageChange,
  onNextPage,
  onPrevPage,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (!medicines?.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Medicines ({pagination?.totalItems || medicines.length})
          </h3>
          <div className="text-sm text-gray-500">
            {viewMode === "table" ? "Table View" : "Grid View"}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="inventory-table-container overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Medicine Details
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Pricing
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Expiry
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Total Value
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {medicines.map((medicine, index) => (
              <TableRow
                key={medicine.id}
                medicine={medicine}
                editingMedicine={editingMedicine}
                setEditingMedicine={setEditingMedicine}
                onUpdateQuantity={onUpdateQuantity}
                onDeleteMedicine={onDeleteMedicine}
                updateStockMutation={updateStockMutation}
                index={index}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing{" "}
              <span className="font-semibold text-blue-600">
                {pagination.totalItems === 0 ? 0 : (pagination.currentPage - 1) * pagination.itemsPerPage + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-blue-600">
                {Math.min(
                  pagination.currentPage * pagination.itemsPerPage,
                  pagination.totalItems
                )}
              </span>{" "}
              of <span className="font-semibold text-blue-600">{pagination.totalItems}</span> results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onPrevPage}
                disabled={!pagination.hasPrevPage}
                className="pagination-button px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Previous
              </button>

              {/* Page Numbers */}
              <div className="flex items-center space-x-1">
                {(() => {
                  const pages = [];
                  const currentPage = pagination.currentPage;
                  const totalPages = pagination.totalPages;
                  const maxVisiblePages = 7;

                  if (totalPages <= maxVisiblePages) {
                    // Show all pages if total is small
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => onPageChange(i)}
                          className={`pagination-button px-4 py-2 text-sm rounded-lg ${i === currentPage
                              ? "bg-blue-600 text-white border border-blue-600 shadow-lg"
                              : "border border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                            }`}
                        >
                          {i}
                        </button>
                      );
                    }
                  } else {
                    // Always show first page
                    pages.push(
                      <button
                        key={1}
                        onClick={() => onPageChange(1)}
                        className={`pagination-button px-4 py-2 text-sm rounded-lg ${1 === currentPage
                            ? "bg-blue-600 text-white border border-blue-600 shadow-lg"
                            : "border border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                          }`}
                      >
                        1
                      </button>
                    );

                    let startPage, endPage;

                    if (currentPage <= 3) {
                      // Near the beginning
                      startPage = 2;
                      endPage = 4;
                    } else if (currentPage >= totalPages - 2) {
                      // Near the end
                      startPage = totalPages - 3;
                      endPage = totalPages - 1;
                    } else {
                      // In the middle
                      startPage = currentPage - 1;
                      endPage = currentPage + 1;
                    }

                    // Add ellipsis after first page if needed
                    if (startPage > 2) {
                      pages.push(
                        <span key="ellipsis1" className="px-4 py-2 text-sm text-gray-500">
                          •••
                        </span>
                      );
                    }

                    // Add middle pages
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => onPageChange(i)}
                          className={`pagination-button px-4 py-2 text-sm rounded-lg ${i === currentPage
                              ? "bg-blue-600 text-white border border-blue-600 shadow-lg"
                              : "border border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                            }`}
                        >
                          {i}
                        </button>
                      );
                    }

                    // Add ellipsis before last page if needed
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <span key="ellipsis2" className="px-4 py-2 text-sm text-gray-500">
                          •••
                        </span>
                      );
                    }

                    // Always show last page
                    if (totalPages > 1) {
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => onPageChange(totalPages)}
                          className={`pagination-button px-4 py-2 text-sm rounded-lg ${totalPages === currentPage
                              ? "bg-blue-600 text-white border border-blue-600 shadow-lg"
                              : "border border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                            }`}
                        >
                          {totalPages}
                        </button>
                      );
                    }
                  }

                  return pages;
                })()}
              </div>

              <button
                onClick={onNextPage}
                disabled={!pagination.hasNextPage}
                className="pagination-button px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTable;
