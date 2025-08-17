import React, { useState } from "react";
import { usePurchaseOrders, useCreatePurchaseOrder, useReceivePurchaseOrder, useCancelPurchaseOrder, useMarkAsOrderedPurchaseOrder, useMarkAsReceivedPurchaseOrder } from "../hooks/usePurchaseOrders";
import { toast } from "react-hot-toast";
import { useSuppliers } from "../hooks/useSuppliers";
import { useMedicines } from "../hooks/useMedicines";

const PurchaseOrdersPage = () => {
  const [filters, setFilters] = useState({
    status: "",
    supplierId: "",
    page: 1,
    limit: 10,
  });
  const [isCreatingSample, setIsCreatingSample] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'

  const { data: purchaseOrdersData, isLoading, error } = usePurchaseOrders(filters);
  const { data: suppliersData } = useSuppliers({ page: 1, limit: 100 });
  const { data: medicinesData } = useMedicines({ page: 1, limit: 100 });
  const createPurchaseOrderMutation = useCreatePurchaseOrder();
  const receivePurchaseOrderMutation = useReceivePurchaseOrder();
  const cancelPurchaseOrderMutation = useCancelPurchaseOrder();
  // Approve functionality removed as part of simplified status system
  const markAsOrderedPurchaseOrderMutation = useMarkAsOrderedPurchaseOrder();
  const markAsReceivedPurchaseOrderMutation = useMarkAsReceivedPurchaseOrder();

  const statusConfig = {
    draft: { color: 'bg-gray-100 text-gray-800', icon: '📝', label: 'Draft' },
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: '⏳', label: 'Pending' },
    approved: { color: 'bg-purple-100 text-purple-800', icon: '✅', label: 'Approved' },
    ordered: { color: 'bg-blue-100 text-blue-800', icon: '📦', label: 'Ordered' },
    partially_received: { color: 'bg-orange-100 text-orange-800', icon: '📥', label: 'Partially Received' },
    received: { color: 'bg-green-100 text-green-800', icon: '✔️', label: 'Received' },
    cancelled: { color: 'bg-red-100 text-red-800', icon: '❌', label: 'Cancelled' }
  };

  const getStatusConfig = (status) => {
    return statusConfig[status?.toLowerCase()] || statusConfig.draft;
  };

  const formatDate = (dateString) => {
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

  const handleStatusFilter = (status) => {
    setFilters(prev => ({ ...prev, status, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleBulkAction = async (action) => {
    if (selectedOrders.length === 0) {
      toast.error("Please select orders first");
      return;
    }

    const confirmMessage = `Are you sure you want to ${action} ${selectedOrders.length} order(s)?`;
    if (!window.confirm(confirmMessage)) return;

    try {
      for (const orderId of selectedOrders) {
        await handleUpdateStatus(orderId, action);
      }
      setSelectedOrders([]);
      toast.success(`Successfully ${action}d ${selectedOrders.length} order(s)`);
    } catch (error) {
      toast.error(`Failed to ${action} orders`);
    }
  };

  const handleReceiveOrder = async (orderId, orderStatus) => {
    try {
      if (orderStatus === 'pending' || orderStatus === 'draft') {
        await markAsReceivedPurchaseOrderMutation.mutateAsync(orderId);
      } else {
        await receivePurchaseOrderMutation.mutateAsync(orderId);
      }
    } catch (error) {
      toast.error(error.message || "Failed to receive purchase order");
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (window.confirm("Are you sure you want to cancel this purchase order?")) {
      try {
        await cancelPurchaseOrderMutation.mutateAsync(orderId);
        toast.success("Purchase order cancelled successfully!");
      } catch (error) {
        toast.error(error.message || "Failed to cancel purchase order");
      }
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      switch (newStatus) {
        case 'pending':
          toast.success("Status update to pending - implement general update if needed");
          break;
        case 'approved':
          // Approve functionality no longer available - use receive, cancel, or apply instead
          break;
        case 'ordered':
          await markAsOrderedPurchaseOrderMutation.mutateAsync(orderId);
          break;
        default:
          toast.error("Invalid status transition");
      }
    } catch (error) {
      toast.error(error.message || `Failed to update purchase order status to ${newStatus}`);
    }
  };

  const getAvailableActions = (status) => {
    const actions = {
      draft: [
        { action: 'receive', label: 'Received', color: 'bg-green-600 hover:bg-green-700', icon: '✅' }
      ],
      pending: [
        { action: 'receive', label: 'Mark as Received', color: 'bg-green-600 hover:bg-green-700', icon: '✅' },
        { action: 'approved', label: 'Approve', color: 'bg-purple-600 hover:bg-purple-700', icon: '✅' },
        { action: 'cancel', label: 'Cancel', color: 'bg-red-600 hover:bg-red-700', icon: '❌' }
      ],
      approved: [
        { action: 'ordered', label: 'Mark as Ordered', color: 'bg-indigo-600 hover:bg-indigo-700', icon: '📦' },
        { action: 'cancel', label: 'Cancel', color: 'bg-red-600 hover:bg-red-700', icon: '❌' }
      ],
      ordered: [
        { action: 'receive', label: 'Receive', color: 'bg-green-600 hover:bg-green-700', icon: '📥' },
        { action: 'cancel', label: 'Cancel', color: 'bg-red-600 hover:bg-red-700', icon: '❌' }
      ],
      partially_received: [
        { action: 'receive', label: 'Complete Receipt', color: 'bg-green-600 hover:bg-green-700', icon: '✔️' },
        { action: 'cancel', label: 'Cancel', color: 'bg-red-600 hover:bg-red-700', icon: '❌' }
      ]
    };
    return actions[status] || [];
  };

  const createSamplePurchaseOrders = async () => {
    if (!suppliersData?.suppliers?.length || !medicinesData?.medicines?.length) {
      toast.error("Please ensure suppliers and medicines are available first");
      return;
    }

    setIsCreatingSample(true);
    const suppliers = suppliersData.suppliers;
    const medicines = medicinesData.medicines;

    const sampleOrders = [
      {
        supplierId: suppliers[0]?.id,
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        notes: "Urgent order for pain relief medicines",
        taxPercent: 0,
        discountAmount: 0,
        items: [
          {
            medicineId: medicines[0]?.id,
            quantity: 100,
            unitPrice: 12.0,
          },
          {
            medicineId: medicines[1]?.id,
            quantity: 50,
            unitPrice: 10.5,
          },
        ],
      },
      {
        supplierId: suppliers[1]?.id || suppliers[0]?.id,
        expectedDeliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        notes: "Monthly stock replenishment",
        taxPercent: 0,
        discountAmount: 0,
        items: [
          {
            medicineId: medicines[2]?.id || medicines[0]?.id,
            quantity: 75,
            unitPrice: 5.6,
          },
        ],
      },
    ];

    try {
      for (const orderData of sampleOrders) {
        await createPurchaseOrderMutation.mutateAsync(orderData);
      }
      toast.success("Sample purchase orders created successfully!");
    } catch (error) {
      toast.error("Failed to create sample purchase orders");
    } finally {
      setIsCreatingSample(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading purchase orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Purchase Orders</h3>
          <p className="text-gray-500">{error.message || "Failed to load purchase orders"}</p>
        </div>
      </div>
    );
  }

  const purchaseOrders = purchaseOrdersData?.data || [];
  const pagination = purchaseOrdersData?.meta?.pagination || {};

  const StatusCard = ({ order }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={selectedOrders.includes(order.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedOrders([...selectedOrders, order.id]);
              } else {
                setSelectedOrders(selectedOrders.filter(id => id !== order.id));
              }
            }}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{order.poNumber}</h3>
            <p className="text-sm text-gray-500">{order.supplier?.name || "N/A"}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusConfig(order.status).color}`}>
            <span className="mr-1">{getStatusConfig(order.status).icon}</span>
            {getStatusConfig(order.status).label}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500">Created</p>
          <p className="text-sm font-medium text-gray-900">{formatDate(order.createdAt)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Expected Delivery</p>
          <p className="text-sm font-medium text-gray-900">{order.expectedDelivery ? formatDate(order.expectedDelivery) : "N/A"}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-lg font-semibold text-gray-900">{formatCurrency(order.total || order.totalAmount || 0)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Created By</p>
          <p className="text-sm font-medium text-gray-900">{order.createdByUser?.fullName || order.createdByUser?.username || "N/A"}</p>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {getAvailableActions(order.status).map((actionConfig, index) => (
          <button
            key={index}
            onClick={() => {
              if (actionConfig.action === 'cancel') {
                handleCancelOrder(order.id);
              } else if (actionConfig.action === 'receive') {
                handleReceiveOrder(order.id, order.status);
              } else {
                handleUpdateStatus(order.id, actionConfig.action);
              }
            }}
            className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white ${actionConfig.color} focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors`}
          >
            <span className="mr-1">{actionConfig.icon}</span>
            {actionConfig.label}
          </button>
        ))}
        {getAvailableActions(order.status).length === 0 && (
          <span className="text-gray-500 text-sm italic">No actions available</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
              <p className="mt-1 text-sm text-gray-500">Manage and track all purchase orders efficiently</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg ${viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18m-9 8h9" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-2 rounded-lg ${viewMode === 'cards' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
              </div>
              <button
                onClick={createSamplePurchaseOrders}
                disabled={isCreatingSample}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingSample ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Sample Orders
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusConfig).map(([status, config]) => (
                <button
                  key={status}
                  onClick={() => handleStatusFilter(status === 'draft' ? '' : status)}
                  className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filters.status === (status === 'draft' ? '' : status)
                      ? `${config.color} ring-2 ring-blue-500 ring-opacity-50`
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <span className="mr-2">{config.icon}</span>
                  {status === 'draft' ? 'All' : config.label}
                </button>
              ))}
            </div>
            
            {selectedOrders.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{selectedOrders.length} selected</span>
                <button
                  onClick={() => handleBulkAction('approved')}
                  className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                >
                  Bulk Approve
                </button>
                <button
                  onClick={() => handleBulkAction('cancel')}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                >
                  Bulk Cancel
                </button>
                <button
                  onClick={() => setSelectedOrders([])}
                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {purchaseOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No purchase orders found</h3>
            <p className="text-gray-500 mb-6">No purchase orders match your current filters.</p>
            {filters.status === "" && (
              <button
                onClick={createSamplePurchaseOrders}
                disabled={isCreatingSample}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingSample ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Sample Data...
                  </>
                ) : (
                  <>
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Sample Purchase Orders
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {purchaseOrders.map((order) => (
                  <StatusCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left">
                          <input
                            type="checkbox"
                            checked={selectedOrders.length === purchaseOrders.length && purchaseOrders.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrders(purchaseOrders.map(order => order.id));
                              } else {
                                setSelectedOrders([]);
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PO Details
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supplier
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dates
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {purchaseOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedOrders.includes(order.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOrders([...selectedOrders, order.id]);
                                } else {
                                  setSelectedOrders(selectedOrders.filter(id => id !== order.id));
                                }
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{order.poNumber}</div>
                            <div className="text-sm text-gray-500">by {order.createdByUser?.fullName || order.createdByUser?.username || "N/A"}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{order.supplier?.name || "N/A"}</div>
                            <div className="text-sm text-gray-500">{order.supplier?.contact_person || ""}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">Created: {formatDate(order.createdAt)}</div>
                            <div className="text-sm text-gray-500">Expected: {order.expectedDelivery ? formatDate(order.expectedDelivery) : "N/A"}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-lg font-semibold text-gray-900">{formatCurrency(order.total || order.totalAmount || 0)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusConfig(order.status).color}`}>
                              <span className="mr-1">{getStatusConfig(order.status).icon}</span>
                              {getStatusConfig(order.status).label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              {getAvailableActions(order.status).map((actionConfig, index) => (
                                <button
                                  key={index}
                                  onClick={() => {
                                    if (actionConfig.action === 'cancel') {
                                      handleCancelOrder(order.id);
                                    } else if (actionConfig.action === 'receive') {
                                      handleReceiveOrder(order.id, order.status);
                                    } else {
                                      handleUpdateStatus(order.id, actionConfig.action);
                                    }
                                  }}
                                  className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-lg text-white ${actionConfig.color} focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors`}
                                >
                                  <span className="mr-1">{actionConfig.icon}</span>
                                  {actionConfig.label}
                                </button>
                              ))}
                              {getAvailableActions(order.status).length === 0 && (
                                <span className="text-gray-500 text-xs italic">No actions available</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Enhanced Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4 mt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(pagination.currentPage - 1) * pagination.limit + 1}</span> to{" "}
                      <span className="font-medium">{Math.min(pagination.currentPage * pagination.limit, pagination.total)}</span> of{" "}
                      <span className="font-medium">{pagination.total}</span> results
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange((pagination.currentPage || 1) - 1)}
                      disabled={(pagination.currentPage || 1) <= 1}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages || 1) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                              (pagination.currentPage || 1) === page
                                ? "bg-blue-600 text-white"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange((pagination.currentPage || 1) + 1)}
                      disabled={(pagination.currentPage || 1) >= (pagination.totalPages || 1)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrdersPage;