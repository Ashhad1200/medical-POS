import React, { useState, useMemo, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  medicineServices,
  supplierServices,
  purchaseOrderServices,
} from "../services/api";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";

// Import components
import OutOfStockTable from "../components/Suppliers/OutOfStockTable";
import StockFilters from "../components/Suppliers/StockFilters";
import AddQuantityModal from "../components/Suppliers/AddQuantityModal";
import SelectSupplierModal from "../components/Suppliers/SelectSupplierModal";
import OrderReceiptModal from "../components/Suppliers/OrderReceiptModal";
import SupplierOrderHistory from "../components/Suppliers/SupplierOrderHistory";
import AddSupplierModal from "../components/Suppliers/AddSupplierModal";
import { useCreateSupplier } from "../hooks/useSuppliers";

const SuppliersPage = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State management
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
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
  const createOrderMutation = useMutation({
    mutationFn: (orderData) => purchaseOrderServices.create(orderData),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Purchase order created successfully!");
    },
    onError: (error) => {
      const message = error.response?.data?.message || "Failed to create order";
      toast.error(message);
      console.error("Purchase order creation error:", error);
    },
  });

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
        batchNumber: batchNumber || selectedMedicine.batchNumber,
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
    try {
      const orderPayload = {
        supplierId: supplier.id,
        items: orderCart.map((item) => ({
          medicineId: item.medicineId,
          quantity: item.quantity,
          tradePrice: item.tradePrice,
          notes: item.notes,
          expiryDate: item.expiryDate,
          batchNumber: item.batchNumber,
        })),
        expectedDate: orderData.expectedDate,
        notes: orderData.notes,
      };

      const response = await createOrderMutation.mutateAsync(orderPayload);
      setOrderCart([]);
      setOrderData({ expectedDate: "", notes: "" });
      setShowSupplierModal(false);
      setShowReceiptModal(true);
      setSelectedSupplier(supplier);
    } catch (error) {
      console.error("Error creating purchase order:", error);
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

  const handleCreateOrder = async () => {
    if (!selectedSupplier) {
      toast.error("Please select a supplier");
      return;
    }

    try {
      const orderPayload = {
        supplierId: selectedSupplier.id,
        items: orderCart.map((item) => ({
          medicineId: item.medicineId,
          quantity: item.quantity,
          tradePrice: item.tradePrice,
          notes: item.notes,
          expiryDate: item.expiryDate,
          batchNumber: item.batchNumber,
        })),
        expectedDate: orderData.expectedDate,
        notes: orderData.notes,
      };

      const response = await createOrderMutation.mutateAsync(orderPayload);
      setOrderCart([]);
      setOrderData({ expectedDate: "", notes: "" });
      setShowSupplierModal(false);
      setShowReceiptModal(true);
    } catch (error) {
      console.error("Error creating purchase order:", error);
    }
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Inventory Management
          </h1>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAddSupplierModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Add Supplier
            </button>
            <button
              onClick={() => setShowOrderHistory(true)}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Order History
            </button>
          </div>
        </div>

        {/* Stock Filters */}
        <StockFilters
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          stockFilter={stockFilter}
          onStockFilterChange={handleStockFilterChange}
        />

        {/* Order Cart Summary */}
        {orderCart.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Purchase Order Cart</h3>
              <div className="flex space-x-2">
                <button
                  onClick={handleClearCart}
                  className="text-red-600 hover:text-red-800"
                >
                  Clear Cart
                </button>
                <button
                  onClick={handleProceedToSupplier}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Proceed to Supplier ({orderCart.length} items)
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {orderCart.map((item) => (
                <div
                  key={item.medicineId}
                  className="flex justify-between items-center"
                >
                  <span>
                    {item.name} - Qty: {item.quantity}
                  </span>
                  <button
                    onClick={() => handleRemoveFromCart(item.medicineId)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="border-t pt-2">
                <strong>Total: ${calculateOrderTotal()}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Out of Stock Table */}
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

        {/* Modals */}
        <AddQuantityModal
          isOpen={showQuantityModal}
          onClose={() => setShowQuantityModal(false)}
          onSubmit={handleQuantitySubmit}
          medicine={selectedMedicine}
        />

        <SelectSupplierModal
          isOpen={showSupplierModal}
          onClose={() => setShowSupplierModal(false)}
          onSelectSupplier={handleSupplierSelect}
          suppliers={suppliers}
          orderData={orderData}
          setOrderData={setOrderData}
          onCreateOrder={handleCreateOrder}
        />

        <OrderReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          supplier={selectedSupplier}
          orderItems={orderCart}
          total={calculateOrderTotal()}
        />

        <SupplierOrderHistory
          isOpen={showOrderHistory}
          onClose={() => setShowOrderHistory(false)}
        />

        <AddSupplierModal
          isOpen={showAddSupplierModal}
          onClose={() => setShowAddSupplierModal(false)}
          onSubmit={handleAddSupplierSubmit}
          supplier={newSupplier}
          setSupplier={setNewSupplier}
        />
      </div>
    </div>
  );
};

export default SuppliersPage;
