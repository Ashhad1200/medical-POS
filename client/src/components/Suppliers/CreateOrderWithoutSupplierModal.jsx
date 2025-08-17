import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { medicineServices } from "../../services/api";
import { useAuthContext } from "../../contexts/AuthContext";

const CreateOrderWithoutSupplierModal = ({ 
  show, 
  onClose, 
  onOrderCreated,
  orderItems = []
}) => {
  const { profile } = useAuthContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Search medicines
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["medicines", "search", searchQuery],
    queryFn: () => medicineServices.search(searchQuery).then((res) => res.data),
    enabled: !!searchQuery && searchQuery.length >= 2,
    staleTime: 2 * 60 * 1000,
  });

  // Handle adding medicine to order
  const handleAddMedicine = (medicine) => {
    const existingItem = selectedMedicines.find(item => item.medicineId === medicine.id);
    if (existingItem) {
      toast.error(`${medicine.name} is already added to the order`);
      return;
    }

    const newItem = {
      medicineId: medicine.id,
      name: medicine.name,
      manufacturer: medicine.manufacturer,
      quantity: 1,
      cost_price: medicine.cost_price || 0,
      batchNumber: medicine.batch_number || "",
      expiryDate: medicine.expiry_date || "",
      notes: ""
    };

    setSelectedMedicines([...selectedMedicines, newItem]);
    toast.success(`${medicine.name} added to order`);
  };

  // Handle quantity change
  const handleQuantityChange = (medicineId, newQuantity) => {
    setSelectedMedicines(prev => 
      prev.map(item => 
        item.medicineId === medicineId 
          ? { ...item, quantity: Math.max(1, parseInt(newQuantity) || 1) }
          : item
      )
    );
  };

  // Handle remove from order
  const handleRemoveMedicine = (medicineId) => {
    setSelectedMedicines(prev => prev.filter(item => item.medicineId !== medicineId));
    toast.success("Medicine removed from order");
  };

  // Calculate total
  const calculateTotal = () => {
    return selectedMedicines.reduce((total, item) => total + (item.cost_price * item.quantity), 0);
  };

  // Create order
  const handleCreateOrder = async () => {
    if (selectedMedicines.length === 0) {
      toast.error("Please add at least one medicine to the order");
      return;
    }

    setCreatingOrder(true);
    try {
      const orderData = {
        items: selectedMedicines.map(item => ({
          medicineId: item.medicineId,
          quantity: item.quantity,
          unitCost: item.cost_price,
          notes: item.notes || "",
          expiryDate: item.expiryDate,
          batchNumber: item.batchNumber
        })),
        status: "Ordered",
        notes: "Direct order without supplier",
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      await onOrderCreated(orderData);
      setSelectedMedicines([]);
      setSearchQuery("");
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order");
    } finally {
      setCreatingOrder(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create Order Without Supplier</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Search Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Medicine
              </label>
              <input
                type="text"
                placeholder="Type medicine name to search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Search Results */}
            {searchQuery.length >= 2 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Available Medicines</h3>
                {isSearching ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Searching...</p>
                  </div>
                ) : searchResults?.medicines?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.medicines.map((medicine) => (
                      <div key={medicine.id} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900">{medicine.name}</h4>
                        <p className="text-sm text-gray-600">{medicine.manufacturer}</p>
                        <p className="text-sm text-gray-500">Stock: {medicine.quantity}</p>
                        <p className="text-sm font-semibold text-green-600">
                          Rs. {medicine.cost_price?.toFixed(2) || "0.00"}
                        </p>
                        <button
                          onClick={() => handleAddMedicine(medicine)}
                          className="mt-2 w-full bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 text-sm"
                        >
                          Add to Order
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No medicines found</p>
                )}
              </div>
            )}

            {/* Selected Medicines */}
            {selectedMedicines.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Items ({selectedMedicines.length})</h3>
                <div className="space-y-3">
                  {selectedMedicines.map((item) => (
                    <div key={item.medicineId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-600">{item.manufacturer}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveMedicine(item.medicineId)}
                          className="text-red-500 hover:text-red-700 text-xl"
                        >
                          ×
                        </button>
                      </div>
                      <div className="mt-3 flex items-center space-x-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.medicineId, e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Price</label>
                          <p className="text-sm font-semibold">Rs. {item.cost_price?.toFixed(2) || "0.00"}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Total</label>
                          <p className="text-sm font-semibold text-green-600">
                            Rs. {(item.cost_price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Order Amount:</span>
                    <span className="text-xl font-bold text-green-600">Rs. {calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 mr-3"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateOrder}
            disabled={selectedMedicines.length === 0 || creatingOrder}
            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {creatingOrder ? "Creating..." : "Create Order"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateOrderWithoutSupplierModal;