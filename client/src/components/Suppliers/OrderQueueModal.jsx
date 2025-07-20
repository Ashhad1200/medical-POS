import React, { useState } from "react";
import { usePurchaseOrders, useReceivePurchaseOrder, useUpdatePurchaseOrder } from "../../hooks/usePurchaseOrders";
import { toast } from "react-hot-toast";

const OrderQueueModal = ({ show, onClose }) => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrders, setSelectedOrders] = useState([]);

  const {
    data: ordersData,
    isLoading,
    error,
    refetch
  } = usePurchaseOrders({
    status: statusFilter === "all" ? undefined : statusFilter,
    page: 1,
    limit: 50
  });

  const receivePurchaseOrder = useReceivePurchaseOrder();
  const updatePurchaseOrder = useUpdatePurchaseOrder();

  if (!show) return null;

  const orders = ordersData?.purchaseOrders || [];

  // Filter orders based on search query
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.supplier?.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "ordered":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "shipped":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "received":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "⏳";
      case "ordered":
        return "📋";
      case "shipped":
        return "🚚";
      case "received":
        return "✅";
      case "cancelled":
        return "❌";
      default:
        return "📦";
    }
  };

  const handleMarkAsReceived = async (orderId) => {
    try {
      await receivePurchaseOrder.mutateAsync(orderId);
      toast.success("Order marked as received and inventory updated!");
      refetch();
    } catch (error) {
      toast.error(`Failed to mark order as received: ${error.message}`);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await updatePurchaseOrder.mutateAsync({
        id: orderId,
        data: { status: newStatus }
      });
      toast.success(`Order status updated to ${newStatus}!`);
      refetch();
    } catch (error) {
      toast.error(`Failed to update order status: ${error.message}`);
    }
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedOrders.length === 0) {
      toast.error("Please select orders to update");
      return;
    }

    try {
      await Promise.all(
        selectedOrders.map(orderId => 
          updatePurchaseOrder.mutateAsync({
            id: orderId,
            data: { status: newStatus }
          })
        )
      );
      toast.success(`${selectedOrders.length} orders updated to ${newStatus}!`);
      setSelectedOrders([]);
      refetch();
    } catch (error) {
      toast.error(`Failed to update orders: ${error.message}`);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isOverdue = (expectedDate, status) => {
    if (status === "received" || status === "cancelled") return false;
    return new Date(expectedDate) < new Date();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Purchase Order Queue
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage and track all purchase orders
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters and Actions */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Orders
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by order number, supplier name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="ordered">Ordered</option>
                <option value="shipped">Shipped</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedOrders.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium text-blue-800">
                {selectedOrders.length} orders selected
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBulkStatusUpdate("ordered")}
                  className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 border border-blue-200 rounded hover:bg-blue-200"
                >
                  Mark as Ordered
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate("shipped")}
                  className="px-3 py-1 text-xs font-medium text-purple-600 bg-purple-100 border border-purple-200 rounded hover:bg-purple-200"
                >
                  Mark as Shipped
                </button>
                <button
                  onClick={() => setSelectedOrders([])}
                  className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded hover:bg-gray-200"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">Error loading orders: {error.message}</p>
            </div>
          )}

          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No orders found</h3>
              <p className="mt-2 text-gray-500">
                {statusFilter === "all" 
                  ? "No purchase orders have been created yet."
                  : `No orders with status "${statusFilter}" found.`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const isOrderOverdue = isOverdue(order.expectedDeliveryDate, order.status);
                
                return (
                  <div
                    key={order.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      selectedOrders.includes(order.id)
                        ? "border-blue-500 bg-blue-50"
                        : isOrderOverdue
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              {order.orderNumber}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)} {order.status?.toUpperCase()}
                            </span>
                            {isOrderOverdue && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                🚨 OVERDUE
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <h4 className="font-medium text-gray-900 mb-1">Supplier</h4>
                              <p className="text-gray-600">{order.supplier?.name}</p>
                              <p className="text-gray-500">{order.supplier?.contactPerson}</p>
                              <p className="text-gray-500">{order.supplier?.phone}</p>
                            </div>

                            <div>
                              <h4 className="font-medium text-gray-900 mb-1">Order Details</h4>
                              <p className="text-gray-600">Created: {formatDate(order.createdAt)}</p>
                              <p className="text-gray-600">Expected: {formatDate(order.expectedDeliveryDate)}</p>
                              <p className="text-gray-600">Items: {order.items?.length || 0}</p>
                            </div>

                            <div>
                              <h4 className="font-medium text-gray-900 mb-1">Order Value</h4>
                              <p className="text-gray-600">Subtotal: Rs. {order.subtotal?.toFixed(2)}</p>
                              <p className="text-gray-600">Tax: Rs. {order.taxAmount?.toFixed(2)}</p>
                              <p className="text-lg font-semibold text-green-600">Total: Rs. {order.totalAmount?.toFixed(2)}</p>
                            </div>
                          </div>

                          {order.notes && (
                            <div className="mt-3 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                              <p className="text-sm text-yellow-800">
                                <span className="font-medium">Note:</span> {order.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col space-y-2 ml-4">
                        {order.status === "pending" && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, "ordered")}
                            className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 border border-blue-200 rounded hover:bg-blue-200"
                          >
                            Mark as Ordered
                          </button>
                        )}
                        
                        {order.status === "ordered" && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, "shipped")}
                            className="px-3 py-1 text-xs font-medium text-purple-600 bg-purple-100 border border-purple-200 rounded hover:bg-purple-200"
                          >
                            Mark as Shipped
                          </button>
                        )}
                        
                        {(order.status === "shipped" || order.status === "ordered") && (
                          <button
                            onClick={() => handleMarkAsReceived(order.id)}
                            className="px-3 py-1 text-xs font-medium text-green-600 bg-green-100 border border-green-200 rounded hover:bg-green-200"
                          >
                            ✅ Mark as Received
                          </button>
                        )}
                        
                        {order.status !== "cancelled" && order.status !== "received" && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, "cancelled")}
                            className="px-3 py-1 text-xs font-medium text-red-600 bg-red-100 border border-red-200 rounded hover:bg-red-200"
                          >
                            Cancel Order
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderQueueModal;