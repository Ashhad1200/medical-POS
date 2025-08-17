import React, { useState, useEffect } from "react";
import { usePurchaseOrdersBySupplier } from "../../hooks/usePurchaseOrders";

const SupplierDetailsModal = ({
  show,
  onClose,
  supplier,
  onUpdate,
  isLoading,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [expandedOrders, setExpandedOrders] = useState(new Set());

  // Fetch purchase orders for this supplier
  const { data: ordersData, isLoading: ordersLoading } = usePurchaseOrdersBySupplier(supplier?.id);

  useEffect(() => {
    if (supplier) {
      setEditData({
        name: supplier.name || "",
        contact_person: supplier.contact_person || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
        tax_id: supplier.tax_id || "",
        city: supplier.city || "",
        state: supplier.state || "",
        postal_code: supplier.postal_code || "",
        website: supplier.website || "",
        notes: supplier.notes || "",
      });
    }
  }, [supplier]);

  if (!show || !supplier) return null;

  const orders = ordersData?.purchaseOrders || [];

  const toggleOrderExpansion = (orderId) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const formatCurrency = (amount) => {
    return `Rs. ${(amount || 0).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleInputChange = (field, value) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    await onUpdate(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      name: supplier.name || "",
      contact_person: supplier.contact_person || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      tax_id: supplier.tax_id || "",
      city: supplier.city || "",
      state: supplier.state || "",
      postal_code: supplier.postal_code || "",
      website: supplier.website || "",
      notes: supplier.notes || "",
    });
    setIsEditing(false);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "received":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">
              {supplier.name}
            </h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Active
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Edit
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : "Save"}
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
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
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Supplier Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Supplier Information
              </h3>
              <div className="space-y-4">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{supplier.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Person
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.contact_person}
                        onChange={(e) =>
                          handleInputChange("contact_person", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">
                        {supplier.contact_person || "N/A"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editData.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{supplier.phone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{supplier.email || "N/A"}</p>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editData.address}
                      onChange={(e) =>
                        handleInputChange("address", e.target.value)
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{supplier.address || "N/A"}</p>
                  )}
                </div>

                {/* City, State, PIN */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.city}
                        onChange={(e) =>
                          handleInputChange("city", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{supplier.city || "N/A"}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.state}
                        onChange={(e) =>
                          handleInputChange("state", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{supplier.state || "N/A"}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PIN Code
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.postal_code}
                        onChange={(e) =>
                          handleInputChange("postal_code", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">
                        {supplier.postal_code || "N/A"}
                      </p>
                    )}
                  </div>
                </div>

                {/* GST and Website */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GST Number
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.tax_id}
                        onChange={(e) =>
                          handleInputChange("tax_id", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">
                        {supplier.tax_id || "N/A"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    {isEditing ? (
                      <input
                        type="url"
                        value={editData.website}
                        onChange={(e) =>
                          handleInputChange("website", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">
                        {supplier.website ? (
                          <a
                            href={supplier.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {supplier.website}
                          </a>
                        ) : (
                          "N/A"
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editData.notes}
                      onChange={(e) =>
                        handleInputChange("notes", e.target.value)
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{supplier.notes || "N/A"}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Purchase Order History */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Purchase Order History
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {ordersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : orders.length > 0 ? (
                  orders.map((order) => {
                    const isExpanded = expandedOrders.has(order.id);
                    const items = order.purchase_order_items || [];
                    
                    return (
                      <div
                        key={order.id}
                        className="border rounded-lg overflow-hidden"
                      >
                        {/* Order Header */}
                        <div 
                          className="p-4 hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleOrderExpansion(order.id)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900">
                                  {order.po_number || `Order #${order.id?.slice(-8)}`}
                                </h4>
                                <svg
                                  className={`w-4 h-4 text-gray-500 transition-transform ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </div>
                              <p className="text-sm text-gray-600">
                                {formatDate(order.created_at)}
                              </p>
                              {order.expected_delivery_date && (
                                <p className="text-xs text-gray-500">
                                  Expected: {formatDate(order.expected_delivery_date)}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                  order.status
                                )}`}
                              >
                                {order.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              {items.length} item{items.length !== 1 ? 's' : ''}
                            </span>
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(order.total_amount)}
                            </span>
                          </div>
                        </div>

                        {/* Expanded Order Details */}
                        {isExpanded && (
                          <div className="border-t bg-gray-50">
                            <div className="p-4">
                              {order.notes && (
                                <div className="mb-4">
                                  <h5 className="text-sm font-medium text-gray-700 mb-1">Notes:</h5>
                                  <p className="text-sm text-gray-600">{order.notes}</p>
                                </div>
                              )}
                              
                              <h5 className="text-sm font-medium text-gray-700 mb-3">Order Items:</h5>
                              
                              {items.length > 0 ? (
                                <div className="space-y-2">
                                  {items.map((item, index) => (
                                    <div
                                      key={index}
                                      className="bg-white rounded-lg p-3 border border-gray-200"
                                    >
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <h6 className="font-medium text-gray-900">
                                            {item.medicine?.name || 'Unknown Medicine'}
                                          </h6>
                                          {item.medicine?.manufacturer && (
                                            <p className="text-sm text-gray-600">
                                              {item.medicine.manufacturer}
                                            </p>
                                          )}
                                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                            {item.medicine?.category && (
                                              <span>Category: {item.medicine.category}</span>
                                            )}
                                            {item.medicine?.unit && (
                                              <span>Unit: {item.medicine.unit}</span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="text-right ml-4">
                                          <div className="text-sm text-gray-600">
                                            Qty: {item.quantity}
                                          </div>
                                          <div className="text-sm text-gray-600">
                                            Unit Cost: {formatCurrency(item.unit_cost)}
                                          </div>
                                          <div className="font-medium text-gray-900">
                                            Total: {formatCurrency(item.total_cost)}
                                          </div>
                                          {item.received_quantity !== undefined && (
                                            <div className="text-xs text-green-600 mt-1">
                                              Received: {item.received_quantity}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 italic">No items found</p>
                              )}
                              
                              {/* Order Summary */}
                              <div className="mt-4 pt-3 border-t border-gray-200">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-700">Order Total:</span>
                                  <span className="text-lg font-semibold text-gray-900">
                                    {formatCurrency(order.total_amount)}
                                  </span>
                                </div>
                                {order.tax_amount && order.tax_amount > 0 && (
                                  <div className="flex justify-between items-center text-sm text-gray-600">
                                    <span>Tax:</span>
                                    <span>{formatCurrency(order.tax_amount)}</span>
                                  </div>
                                )}
                                {order.discount_amount && order.discount_amount > 0 && (
                                  <div className="flex justify-between items-center text-sm text-gray-600">
                                    <span>Discount:</span>
                                    <span>-{formatCurrency(order.discount_amount)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
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
                    <p className="mt-2 text-sm text-gray-500">
                      No purchase orders found
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierDetailsModal;
