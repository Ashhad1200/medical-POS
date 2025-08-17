import React, { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supplierServices } from "../services/api";
import { useAuthContext } from "../contexts/AuthContext";
import { useSuppliers, useDeleteSupplier, useUpdateSupplier, useCreateSupplier } from "../hooks/useSuppliers";

// Import components
import SuppliersTable from "../components/Suppliers/SuppliersTable";
import SuppliersFilters from "../components/Suppliers/SuppliersFilters";
import AddSupplierModal from "../components/Suppliers/AddSupplierModal";
import SupplierDetailsModal from "../components/Suppliers/SupplierDetailsModal";
import CreateOrderModal from "../components/Suppliers/CreateOrderModal";

const SuppliersListPage = () => {
  const { profile } = useAuthContext();
  const queryClient = useQueryClient();

  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    phone: "",
    address: "",
  });

  // Build API filters
  const filters = useMemo(() => {
    const apiFilters = {
      sortBy,
      sortOrder,
      page: currentPage,
      limit: itemsPerPage,
    };

    if (searchQuery.length >= 2) {
      apiFilters.search = searchQuery;
    }

    return apiFilters;
  }, [searchQuery, sortBy, sortOrder, currentPage, itemsPerPage]);

  // React Query hooks
  const {
    data: suppliersData,
    isLoading,
    error,
    refetch,
  } = useSuppliers(filters);

  const deleteSupplierMutation = useDeleteSupplier();
  const updateSupplierMutation = useUpdateSupplier();
  const createSupplierMutation = useCreateSupplier();

  // Extract data - Updated for refactored API response
  const suppliers = suppliersData?.data || [];
  const pagination = suppliersData?.meta?.pagination || {};

  // Event handlers
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

  const handleViewDetails = (supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailsModal(true);
  };

  const handleCreateOrder = (supplier) => {
    setSelectedSupplier(supplier);
    setShowCreateOrderModal(true);
  };

  const handleDeleteSupplier = async (supplierId, supplierName) => {
    if (window.confirm(`Are you sure you want to delete ${supplierName}?`)) {
      try {
        await deleteSupplierMutation.mutateAsync(supplierId);
        toast.success(`${supplierName} deleted successfully`);
        refetch();
      } catch (error) {
        toast.error(`Failed to delete ${supplierName}`);
      }
    }
  };

  const handleUpdateSupplier = async (supplierData) => {
    try {
      await updateSupplierMutation.mutateAsync({
        id: selectedSupplier.id,
        data: supplierData,
      });
    } catch (error) {
      console.error("Error updating supplier:", error);
    }
  };

  const handleAddSupplier = () => {
    setShowAddSupplierModal(true);
  };

  const handleAddSupplierSubmit = async (e) => {
    e.preventDefault();
    try {
      await createSupplierMutation.mutateAsync(newSupplier);
      setShowAddSupplierModal(false);
      setNewSupplier({
        name: "",
        phone: "",
        address: "",
      });
      toast.success("Supplier added successfully!");
    } catch (error) {
      console.error("Error adding supplier:", error);
      toast.error("Failed to add supplier. Please try again.");
    }
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error Loading Suppliers
          </h3>
          <p className="text-red-600 mt-1">{error.message}</p>
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
                Suppliers Management
              </h1>
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
                <span>•</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleAddSupplier}
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-2 rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2"
              >
                <span className="text-lg">🏢</span>
                <span>Add Supplier</span>
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
                  <div className="h-12 w-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                    🏢
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Suppliers
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {pagination.total || 0}
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
                  <div className="h-12 w-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                    ✅
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Suppliers
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {suppliers.filter(s => s.status === 'active').length}
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
                    📋
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Current Page
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {currentPage} of {pagination.totalPages || 1}
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
                  <div className="h-12 w-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                    🔍
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Showing Results
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

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg border mb-6">
          <div className="p-6">
            <SuppliersFilters
              searchQuery={searchQuery}
              setSearchQuery={handleSearchChange}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
            />
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="bg-white rounded-xl shadow-lg border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                🏢
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Suppliers Directory
              </h2>
            </div>
          </div>
          <SuppliersTable
            suppliers={suppliers}
            isLoading={isLoading}
            onViewDetails={handleViewDetails}
            onCreateOrder={handleCreateOrder}
            onDeleteSupplier={handleDeleteSupplier}
            deleteSupplierMutation={deleteSupplierMutation}
            pagination={pagination}
            onPageChange={handlePageChange}
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
          />
        </div>
      </div>

      {/* Modals */}
      <AddSupplierModal
        show={showAddSupplierModal}
        onClose={() => setShowAddSupplierModal(false)}
        onSubmit={handleAddSupplierSubmit}
        newSupplier={newSupplier}
        setNewSupplier={setNewSupplier}
        isLoading={createSupplierMutation.isPending}
      />

      <SupplierDetailsModal
        show={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        supplier={selectedSupplier}
        onUpdate={handleUpdateSupplier}
        isLoading={updateSupplierMutation.isPending}
      />

      <CreateOrderModal
        show={showCreateOrderModal}
        onClose={() => setShowCreateOrderModal(false)}
        supplier={selectedSupplier}
      />
    </div>
  );
};

export default SuppliersListPage;