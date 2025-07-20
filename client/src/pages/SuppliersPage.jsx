import React, { useState, useMemo, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  medicineServices,
  supplierServices,
  purchaseOrderServices,
} from "../services/api";
import { useAuthContext } from "../contexts/AuthContext";
import { useCreatePurchaseOrder } from "../hooks/usePurchaseOrders";
import api from "../services/api";

// Import components
import OutOfStockTable from "../components/Suppliers/OutOfStockTable";
import StockFilters from "../components/Suppliers/StockFilters";
import AddQuantityModal from "../components/Suppliers/AddQuantityModal";
import SelectSupplierModal from "../components/Suppliers/SelectSupplierModal";
import OrderReceiptModal from "../components/Suppliers/OrderReceiptModal";
import SupplierOrderHistory from "../components/Suppliers/SupplierOrderHistory";
import AddSupplierModal from "../components/Suppliers/AddSupplierModal";
import OrderQueueModal from "../components/Suppliers/OrderQueueModal";
import { useCreateSupplier } from "../hooks/useSuppliers";

const SuppliersPage = () => {
  const { profile } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State management
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [showOrderQueue, setShowOrderQueue] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [stockFilter, setStockFilter] = useState("out-of-stock");

  // Cart for purchase order
  const [orderCart, setOrderCart] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [orderData, setOrderData] = useState({
    expectedDate: "",
    notes: "",
  });
  const [receiptData, setReceiptData] = useState(null);

  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    website: "",
    gstNumber: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  const createSupplierMutation = useCreateSupplier();

  // Build API filters for medicines
  const filters = useMemo(() => {
    const apiFilters = {
      sortBy,
      sortOrder,
      page: currentPage,
      limit: itemsPerPage,
      includeExpired: false,
    };

    if (searchQuery.length >= 2) {
      apiFilters.search = searchQuery;
    }

    // Filter by stock status
    switch (stockFilter) {
      case "out-of-stock":
        apiFilters.outOfStock = true;
        break;
      case "low-stock":
        apiFilters.lowStock = true;
        break;
      case "all":
        apiFilters.needsRestocking = true;
        break;
      default:
        apiFilters.outOfStock = true;
    }

    return apiFilters;
  }, [searchQuery, sortBy, sortOrder, currentPage, itemsPerPage, stockFilter]);

  // React Query hooks
  const queryClient = useQueryClient();

  const {
    data: medicinesData,
    isLoading,
    error: stockError,
    refetch,
  } = useQuery({
    queryKey: ["medicines", filters],
    queryFn: () => medicineServices.getAll(filters).then((res) => res.data),
    staleTime: 2 * 60 * 1000,
    keepPreviousData: true,
  });

  // Fetch suppliers for selection
  const { data: suppliersQueryData } = useQuery({
    queryKey: ["suppliers", { limit: 100 }],
    queryFn: () =>
      supplierServices.getAll({ limit: 100 }).then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

  // Create purchase order mutation
  const createPurchaseOrderMutation = useCreatePurchaseOrder();

  // Extract data
  const medicines = medicinesData?.data?.medicines || [];
  const pagination = medicinesData?.data?.pagination || {};
  const suppliers = suppliersQueryData?.data?.suppliers || [];

  // Event handlers
  const handleAddQuantity = (medicine) => {
    setSelectedMedicine(medicine);
    setShowQuantityModal(true);
  };

  const handleQuantitySubmit = (quantity, notes, expiryDate, batchNumber) => {
    const existingItem = orderCart.find(
      (item) => item.medicineId === selectedMedicine.id
    );

    if (existingItem) {
      setOrderCart(
        orderCart.map((item) =>
          item.medicineId === selectedMedicine.id
            ? {
                ...item,
                quantity: quantity,
                notes: notes,
                expiryDate: expiryDate,
                batchNumber: batchNumber,
              }
            : item
        )
      );
      toast.success(`Updated quantity for ${selectedMedicine.name}`);
    } else {
      const newItem = {
        medicineId: selectedMedicine.id,
        name: selectedMedicine.name,
        manufacturer: selectedMedicine.manufacturer,
        batchNumber: batchNumber || selectedMedicine.batch_number,
        quantity: quantity,
        tradePrice: selectedMedicine.tradePrice || 0,
        notes: notes,
        expiryDate: expiryDate,
      };
      setOrderCart([...orderCart, newItem]);
      toast.success(`Added ${selectedMedicine.name} to cart`);
    }
    setShowQuantityModal(false);
  };

  const handleRemoveFromCart = (medicineId) => {
    setOrderCart(orderCart.filter((item) => item.medicineId !== medicineId));
  };

  const handleProceedToSupplier = () => {
    if (orderCart.length === 0) {
      toast.error("Please add items to cart first");
      return;
    }
    setShowSupplierModal(true);
  };

  const finalizePurchaseOrder = async (supplier) => {
    if (!supplier || orderCart.length === 0) {
      toast.error("Please select a supplier and add items to your order.");
      return;
    }

    try {
      // Calculate totals
      const subtotal = calculateOrderTotal();
      const taxRate = 0.18; // 18% GST
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      const orderPayload = {
        supplierId: supplier.id,
        items: orderCart.map((item) => ({
          medicineId: item.medicineId,
          quantity: item.quantity,
          unitPrice: item.tradePrice,
          notes: item.notes || "",
          expiryDate: item.expiryDate,
          batchNumber: item.batchNumber,
        })),
        subtotal: subtotal,
        taxAmount: taxAmount,
        totalAmount: totalAmount,
        notes: orderData.notes || `Stock replenishment order - ${orderCart.length} items`,
        expectedDeliveryDate: orderData.expectedDate || new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        status: "pending"
      };

      const response = await createPurchaseOrderMutation.mutateAsync(orderPayload);
      
      // Show receipt modal with the created order
      setReceiptData({
        orderId: response.data.orderNumber,
        supplier: selectedSupplier,
        items: orderCart,
        total: totalAmount,
        orderData: response.data
      });
      setShowReceiptModal(true);
      
      // Clear the cart after successful order creation
      setOrderCart([]);
      setSelectedSupplier(null);
      setShowSupplierModal(false);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      toast.error("Failed to create purchase order. Please try again.");
    }
  };

  const handleSupplierSelect = (supplier) => {
    setSelectedSupplier(supplier);
    finalizePurchaseOrder(supplier);
  };

  const calculateOrderTotal = () => {
    return orderCart.reduce(
      (total, item) => total + item.tradePrice * item.quantity,
      0
    );
  };



  const handleClearCart = () => {
    setOrderCart([]);
    setOrderData({ expectedDate: "", notes: "" });
    toast.success("Cart cleared");
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleNextPage = () => {
    if (pagination.hasNextPage) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (pagination.hasPrevPage) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleSortChange = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setCurrentPage(1);
  };

  const handleStockFilterChange = (filter) => {
    setStockFilter(filter);
    setCurrentPage(1);
  };

  const handleAddSupplierSubmit = async (e) => {
    e.preventDefault();
    try {
      await createSupplierMutation.mutateAsync(newSupplier);
      setShowAddSupplierModal(false);
      setNewSupplier({
        name: "",
        contactPerson: "",
        phone: "",
        email: "",
        website: "",
        gstNumber: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
      });
      toast.success("Supplier added successfully!");
    } catch (error) {
      console.error("Error adding supplier:", error);
    }
  };

  // Error state
  if (stockError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error Loading Inventory
          </h3>
          <p className="text-red-600 mt-1">{stockError.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Supplier Management
              </h1>
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
                <span>•</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setShowAddSupplierModal(true);
                }}
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-2 rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2"
              >
                <span className="text-lg">🏢</span>
                <span>Add Supplier</span>
              </button>
              <button
                onClick={() => {
                  setShowOrderQueue(true);
                }}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2"
              >
                <span className="text-lg">📋</span>
                <span>Order Queue</span>
              </button>
              <button
                onClick={() => {
                  setShowOrderHistory(true);
                }}
                className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-2 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2"
              >
                <span className="text-lg">📊</span>
                <span>Order History</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border hover:shadow-xl transition-all duration-300">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                    📦
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Items in Cart
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {orderCart.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border hover:shadow-xl transition-all duration-300">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                    💰
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Cart Total
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      Rs. {calculateOrderTotal().toFixed(2)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border hover:shadow-xl transition-all duration-300">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                    ⚠️
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Out of Stock
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {medicines.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border hover:shadow-xl transition-all duration-300">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                    🏢
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Suppliers
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {suppliers.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Filters */}
        <div className="bg-white rounded-xl shadow-lg border mb-6">
          <div className="p-6">
            <StockFilters
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              stockFilter={stockFilter}
              onStockFilterChange={handleStockFilterChange}
            />
          </div>
        </div>

        {/* Order Cart Summary */}
        {orderCart.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl shadow-lg border border-green-200 mb-6">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                    🛒
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Purchase Order Cart</h3>
                    <p className="text-sm text-gray-600">{orderCart.length} items ready for order</p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleClearCart}
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2"
                  >
                    <span>🗑️</span>
                    <span>Clear Cart</span>
                  </button>
                  <button
                    onClick={handleProceedToSupplier}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2"
                  >
                    <span>🚀</span>
                    <span>Proceed to Supplier ({orderCart.length} items)</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orderCart.map((item) => (
                  <div
                    key={item.medicineId}
                    className="bg-white rounded-lg p-4 shadow-md border hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                        <p className="text-xs text-gray-600">{item.manufacturer}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-sm font-medium text-blue-600">Qty: {item.quantity}</span>
                          <span className="text-sm font-medium text-green-600">Rs. {(item.tradePrice * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFromCart(item.medicineId)}
                        className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-full hover:bg-red-50"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-green-200 pt-4 mt-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-700">Order Total:</span>
                  <span className="text-2xl font-bold text-green-600">Rs. {calculateOrderTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Table */}
        <div className="bg-white rounded-xl shadow-lg border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                📋
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {stockFilter === 'out-of-stock' ? 'Out of Stock Items' : 
                 stockFilter === 'low-stock' ? 'Low Stock Items' : 
                 'Items Needing Restocking'}
              </h2>
            </div>
          </div>
          <OutOfStockTable
            medicines={medicines}
            isLoading={isLoading}
            onAddQuantity={handleAddQuantity}
            orderCart={orderCart}
            onRemoveFromCart={handleRemoveFromCart}
            pagination={pagination}
            onPageChange={handlePageChange}
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
            stockFilter={stockFilter}
          />
        </div>

      </div>

      {/* Modals */}
      <AddQuantityModal
        show={showQuantityModal}
        onClose={() => setShowQuantityModal(false)}
        onSubmit={handleQuantitySubmit}
        medicine={selectedMedicine}
      />

      <SelectSupplierModal
        show={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        onSelect={handleSupplierSelect}
        suppliers={suppliers}
        orderItems={orderCart}
      />

      <OrderReceiptModal
        show={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        supplier={receiptData?.supplier}
        items={receiptData?.items || []}
        total={receiptData?.total || 0}
        orderData={receiptData?.orderData}
      />

      <SupplierOrderHistory
        show={showOrderHistory}
        onClose={() => setShowOrderHistory(false)}
      />

      <AddSupplierModal
        show={showAddSupplierModal}
        onClose={() => setShowAddSupplierModal(false)}
        onSubmit={handleAddSupplierSubmit}
        newSupplier={newSupplier}
        setNewSupplier={setNewSupplier}
      />

      <OrderQueueModal
        show={showOrderQueue}
        onClose={() => setShowOrderQueue(false)}
      />
    </div>
  );
};

export default SuppliersPage;
