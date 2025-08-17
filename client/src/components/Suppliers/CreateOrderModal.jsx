import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { medicineServices } from "../../services/api";
import { useCreatePurchaseOrder } from "../../hooks/usePurchaseOrders";

const CreateOrderModal = ({ show, onClose, supplier }) => {
  // Early return must be before any hooks to avoid hooks order violation
  if (!show || !supplier) return null;

  const [searchQuery, setSearchQuery] = useState("");
  const [currentOrder, setCurrentOrder] = useState([]);
  const [orderData, setOrderData] = useState({
    expectedDate: "",
    notes: "",
  });

  // Fetch medicines for selection
  const { data: medicinesData, isLoading: medicinesLoading } = useQuery({
    queryKey: ["medicines", { limit: 100 }],
    queryFn: () =>
      medicineServices.getAll({ limit: 100 }).then((res) => res.data),
    enabled: show,
    staleTime: 5 * 60 * 1000,
  });

  // Create purchase order mutation
  const createOrderMutation = useCreatePurchaseOrder();

  const medicines = medicinesData?.data?.medicines || [];

  // Filter medicines based on search
  const filteredMedicines = useMemo(() => {
    if (!searchQuery) return medicines;
    const query = searchQuery.toLowerCase();
    return medicines.filter(
      (medicine) =>
        medicine.name?.toLowerCase().includes(query) ||
        medicine.manufacturer?.toLowerCase().includes(query) ||
        medicine.batch_number?.toLowerCase().includes(query)
    );
  }, [medicines, searchQuery]);

  const addMedicineToOrder = (medicine) => {
    const existingItem = currentOrder.find(
      (item) => item.medicineId === medicine.id
    );

    if (existingItem) {
      setCurrentOrder(
        currentOrder.map((item) =>
          item.medicineId === medicine.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCurrentOrder([
        ...currentOrder,
        {
          medicineId: medicine.id,
          name: medicine.name,
          manufacturer: medicine.manufacturer,
          quantity: 1,
          cost_price: medicine.cost_price || 0,
          notes: "",
        },
      ]);
    }
  };

  const updateOrderItem = (medicineId, field, value) => {
    setCurrentOrder(
      currentOrder.map((item) =>
        item.medicineId === medicineId ? { ...item, [field]: value } : item
      )
    );
  };

  const removeFromOrder = (medicineId) => {
    setCurrentOrder(
      currentOrder.filter((item) => item.medicineId !== medicineId)
    );
  };

  const calculateOrderTotal = () => {
    return currentOrder.reduce((total, item) => {
      return total + item.quantity * item.cost_price;
    }, 0);
  };

  const handleSubmitOrder = async () => {
    console.log('Create order button clicked');
    
    if (currentOrder.length === 0) {
      toast.error("Please add medicines to the order");
      return;
    }

    if (!orderData.expectedDate) {
      toast.error("Please select an expected delivery date");
      return;
    }

    // Transform the order items to match server expectations
    const transformedItems = currentOrder.map(item => ({
      medicineId: item.medicineId,
      quantity: item.quantity,
      unitCost: item.cost_price || 0,
    }));

    const orderPayload = {
      supplierId: supplier.id,
      items: transformedItems,
      expectedDeliveryDate: orderData.expectedDate,
      notes: orderData.notes,
      taxAmount: 0,
      discountAmount: 0,
    };

    console.log('Order payload:', orderPayload);

    try {
      const result = await createOrderMutation.mutateAsync(orderPayload);
      console.log('Order creation result:', result);
      // Handle success manually since we're not using the hook's onSuccess
      toast.success("Purchase order created successfully!");
      onClose();
      resetOrder();
    } catch (error) {
      console.error('Order creation error:', error);
      console.error('Error details:', error.response?.data);
      // Error toast is already handled by the hook
    }
  };

  const resetOrder = () => {
    setCurrentOrder([]);
    setOrderData({
      expectedDate: "",
      notes: "",
    });
    setSearchQuery("");
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-400/30 rounded-lg backdrop-blur-sm">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Create Purchase Order
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Supplier: <span className="font-medium text-blue-600">{supplier.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
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

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Available Medicines */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Available Medicines
                </h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search medicines..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 pl-10 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-4 w-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-3">
                {medicinesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : filteredMedicines.length > 0 ? (
                  filteredMedicines.map((medicine) => (
                    <div
                      key={medicine.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {medicine.name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {medicine.manufacturer}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-sm text-gray-500">
                              Batch: {medicine.batch_number}
                            </span>
                            <span className="text-sm font-medium text-green-600">
                              Rs. {medicine.cost_price?.toFixed(2) || "0.00"}
                            </span>
                            <span className="text-sm text-gray-500">
                              Stock: {medicine.quantity}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => addMedicineToOrder(medicine)}
                          className="ml-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-2 rounded-full hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
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
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No medicines found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Order Items ({currentOrder.length})
              </h3>

              <div className="space-y-4 max-h-64 overflow-y-auto mb-6">
                {currentOrder.length > 0 ? (
                  currentOrder.map((item) => (
                    <div
                      key={item.medicineId}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {item.name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {item.manufacturer}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromOrder(item.medicineId)}
                          className="text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-red-500/10"
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

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateOrderItem(
                                item.medicineId,
                                "quantity",
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-full px-2 py-1 bg-white border border-gray-300 rounded text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Trade Price
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.cost_price}
                            onChange={(e) =>
                              updateOrderItem(
                                item.medicineId,
                                "cost_price",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1 bg-white border border-gray-300 rounded text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) =>
                            updateOrderItem(
                              item.medicineId,
                              "notes",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 bg-white border border-gray-300 rounded text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          placeholder="Optional notes"
                        />
                      </div>

                      <div className="mt-3 text-right">
                        <span className="font-semibold text-gray-900">
                          Subtotal: Rs.
                          {(item.quantity * item.cost_price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No items added to order</p>
                  </div>
                )}
              </div>

              {/* Order Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={orderData.expectedDate}
                    onChange={(e) =>
                      setOrderData({
                        ...orderData,
                        expectedDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order Notes
                  </label>
                  <textarea
                    value={orderData.notes}
                    onChange={(e) =>
                      setOrderData({ ...orderData, notes: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Additional notes for this order"
                  />
                </div>

                {/* Order Total */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold text-gray-900">
                      Total Amount:
                    </span>
                    <span className="text-xl font-bold text-blue-600">
                      Rs. {calculateOrderTotal().toFixed(2)}
                    </span>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitOrder}
                      disabled={
                        currentOrder.length === 0 ||
                        createOrderMutation.isLoading
                      }
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 border border-transparent rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                    >
                      {createOrderMutation.isLoading ? (
                        <div className="flex items-center justify-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                          Creating Order...
                        </div>
                      ) : (
                        "Create Purchase Order"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateOrderModal;
