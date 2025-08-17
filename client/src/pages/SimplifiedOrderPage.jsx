import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { supplierServices } from "../services/api";
import { useCreatePurchaseOrder } from "../hooks/usePurchaseOrders";
import { useAuthContext } from "../contexts/AuthContext";
import OrderReceiptModal from "../components/Suppliers/OrderReceiptModal";
import { Plus, Trash2, ShoppingCart, FileText } from "lucide-react";

const SimplifiedOrderPage = () => {
  const { profile } = useAuthContext();
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [orderItems, setOrderItems] = useState([
    { medicineName: "", quantity: 1, unitCost: 0 }
  ]);
  const [notes, setNotes] = useState("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch suppliers
  const { data: suppliersData, isLoading: suppliersLoading } = useQuery({
    queryKey: ["suppliers", { limit: 100 }],
    queryFn: () => supplierServices.getAll({ limit: 100 }).then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const createPurchaseOrderMutation = useCreatePurchaseOrder();
  const suppliers = suppliersData?.data?.suppliers || [];

  const addOrderItem = () => {
    setOrderItems([...orderItems, { medicineName: "", quantity: 1, unitCost: 0 }]);
  };

  const removeOrderItem = (index) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    }
  };

  const updateOrderItem = (index, field, value) => {
    const updatedItems = orderItems.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setOrderItems(updatedItems);
  };

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => {
      return total + (parseFloat(item.unitCost) || 0) * (parseInt(item.quantity) || 0);
    }, 0);
  };

  const validateForm = () => {
    if (!selectedSupplier) {
      toast.error("Please select a supplier");
      return false;
    }

    const hasValidItems = orderItems.some(item => 
      item.medicineName.trim() && 
      item.quantity > 0 && 
      item.unitCost >= 0
    );

    if (!hasValidItems) {
      toast.error("Please add at least one valid medicine item");
      return false;
    }

    return true;
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const supplier = suppliers.find(s => s.id === selectedSupplier);
      const validItems = orderItems.filter(item => 
        item.medicineName.trim() && 
        item.quantity > 0 && 
        item.unitCost >= 0
      );

      const subtotal = calculateTotal();
      const taxAmount = subtotal * 0.18; // 18% GST
      const totalAmount = subtotal + taxAmount;

      const orderPayload = {
        supplier_id: selectedSupplier,
        items: validItems.map((item, index) => ({
          medicine_id: null, // For new medicines, we'll handle this in backend
          medicineName: item.medicineName,
          quantity: parseInt(item.quantity),
          unit_cost: parseFloat(item.unitCost),
          unit_price: parseFloat(item.unitCost),
          notes: `Item ${index + 1}`,
        })),
        tax_percent: 18,
        discount_amount: 0,
        notes: notes || `Medicine order - ${validItems.length} items`,
        expected_delivery_date: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString().split('T')[0]
      };

      const response = await createPurchaseOrderMutation.mutateAsync(orderPayload);
      
      // Show receipt modal with the created order
      setReceiptData({
        orderId: response.data.orderNumber,
        supplier: supplier,
        items: validItems.map(item => ({
          medicineName: item.medicineName,
          quantity: item.quantity,
          tradePrice: item.unitCost,
          total: item.quantity * item.unitCost
        })),
        total: totalAmount,
        orderData: response.data
      });
      setShowReceiptModal(true);
      
      // Reset form
      setSelectedSupplier("");
      setOrderItems([{ medicineName: "", quantity: 1, unitCost: 0 }]);
      setNotes("");
      
      toast.success("Order created successfully!");
    } catch (error) {
      console.error("Error creating purchase order:", error);
      toast.error("Failed to create order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseReceipt = () => {
    setShowReceiptModal(false);
    setReceiptData(null);
  };

  if (suppliersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <ShoppingCart className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Create Medicine Order</h1>
          </div>

          <form onSubmit={handleSubmitOrder} className="space-y-6">
            {/* Supplier Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Supplier *
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Choose a supplier...</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Medicine Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Medicine Items *
                </label>
                <button
                  type="button"
                  onClick={addOrderItem}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </button>
              </div>

              <div className="space-y-3">
                {orderItems.map((item, index) => (
                  <div key={index} className="flex gap-3 items-center p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Medicine name"
                        value={item.medicineName}
                        onChange={(e) => updateOrderItem(index, 'medicineName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        placeholder="Qty"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateOrderItem(index, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        placeholder="Unit Cost"
                        min="0"
                        step="0.01"
                        value={item.unitCost}
                        onChange={(e) => updateOrderItem(index, 'unitCost', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-32 text-right font-medium">
                      ₹{((item.quantity || 0) * (item.unitCost || 0)).toFixed(2)}
                    </div>
                    {orderItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOrderItem(index)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Amount:</span>
                <span className="text-blue-600">₹{calculateTotal().toFixed(2)}</span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                (Including 18% GST: ₹{(calculateTotal() * 0.18).toFixed(2)})
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add any special instructions or notes for this order..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating Order...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Create Order
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && receiptData && (
        <OrderReceiptModal
          show={showReceiptModal}
          onClose={handleCloseReceipt}
          orderData={receiptData.orderData}
          supplier={receiptData.supplier}
          items={receiptData.items}
          total={receiptData.total}
          autoPrint={true}
        />
      )}
    </div>
  );
};

export default SimplifiedOrderPage;