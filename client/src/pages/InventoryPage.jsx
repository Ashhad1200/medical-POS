import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { medicineServices } from '../services/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import InventoryTable from '../components/Inventory/InventoryTable';
import InventoryFilters from '../components/Inventory/InventoryFilters';
import InventoryStats from '../components/Inventory/InventoryStats';
import AddMedicineModal from '../components/Inventory/AddMedicineModal';
import '../styles/inventory-animations.css';

const InventoryPage = () => {
  const [filters, setFilters] = useState({
    search: '',
    stockFilter: 'all',
    category: '',
    manufacturer: '',
    sortBy: 'name',
    sortOrder: 'asc',
    page: 1,
    limit: 10
  });
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMedicine, setNewMedicine] = useState({
    name: '',
    generic_name: '',
    manufacturer: '',
    batch_number: '',
    selling_price: '',
    cost_price: '',
    gst_per_unit: '',
    gst_rate: '',
    quantity: '',
    low_stock_threshold: '',
    expiry_date: '',
    category: '',
    description: '',
    is_active: true
  });
  const queryClient = useQueryClient();

  const { data: inventoryData, isLoading, refetch } = useQuery({
    queryKey: ['inventory', filters],
    queryFn: () => medicineServices.getAll({
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      stockFilter: filters.stockFilter,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      category: filters.category,
      manufacturer: filters.manufacturer
    }),
    keepPreviousData: true
  });

  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: () => medicineServices.getStats(),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const handleRefreshStats = () => {
    queryClient.invalidateQueries(['inventory-stats']);
    refetchStats();
  };

  const updateStockMutation = useMutation({
    mutationFn: ({ id, quantity }) => medicineServices.updateStock(id, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['inventory-stats']);
      setEditingMedicine(null);
    },
    onError: (error) => {
      console.error('Error updating stock:', error);
      alert('Failed to update stock. Please try again.');
    }
  });

  const deleteMedicineMutation = useMutation({
    mutationFn: (id) => medicineServices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['inventory-stats']);
    },
    onError: (error) => {
      console.error('Error deleting medicine:', error);
      alert('Failed to delete medicine. Please try again.');
    }
  });

  const createMedicineMutation = useMutation({
    mutationFn: (medicineData) => medicineServices.create(medicineData),
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['inventory-stats']);
      setShowAddModal(false);
      setNewMedicine({
        name: '',
        generic_name: '',
        manufacturer: '',
        batch_number: '',
        selling_price: '',
        cost_price: '',
        gst_per_unit: '',
        gst_rate: '',
        quantity: '',
        low_stock_threshold: '',
        expiry_date: '',
        category: '',
        description: '',
        is_active: true
      });
    },
    onError: (error) => {
      console.error('Error creating medicine:', error);
      alert('Failed to create medicine. Please try again.');
    }
  });

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page) => {
    // Add smooth transition effect
    const tableContainer = document.querySelector('.inventory-table-container');
    if (tableContainer) {
      tableContainer.style.opacity = '0.7';
      tableContainer.style.transform = 'translateY(10px)';
      
      setTimeout(() => {
        setFilters(prev => ({ ...prev, page }));
        setTimeout(() => {
          tableContainer.style.opacity = '1';
          tableContainer.style.transform = 'translateY(0)';
        }, 100);
      }, 150);
    } else {
      setFilters(prev => ({ ...prev, page }));
    }
  };

  const handlePrevPage = () => {
    if (inventoryData?.data?.pagination?.hasPrevPage) {
      handlePageChange(inventoryData.data.pagination.currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (inventoryData?.data?.pagination?.hasNextPage) {
      handlePageChange(inventoryData.data.pagination.currentPage + 1);
    }
  };

  const handleUpdateQuantity = (id, quantity) => {
    updateStockMutation.mutate({ id, quantity });
  };

  const handleDeleteMedicine = (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      deleteMedicineMutation.mutate(id);
    }
  };

  const handleCreateMedicine = (e) => {
    e.preventDefault();
    createMedicineMutation.mutate(newMedicine);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading inventory..." />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-600">Manage your medicine stock and monitor inventory levels</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Medicine</span>
            </button>
            <button
              onClick={handleRefreshStats}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Stats
            </button>
          </div>
        </div>
      </div>

      <InventoryStats data={statsData?.data?.data} isLoading={statsLoading} />

      <div className="mt-6">
        <InventoryFilters
          searchQuery={filters.search}
          setSearchQuery={(search) => handleFilterChange({ search })}
          filterStatus={filters.stockFilter}
          setFilterStatus={(stockFilter) => handleFilterChange({ stockFilter })}
          category={filters.category}
          setCategory={(category) => handleFilterChange({ category })}
          manufacturer={filters.manufacturer}
          setManufacturer={(manufacturer) => handleFilterChange({ manufacturer })}
          sortBy={filters.sortBy}
          setSortBy={(sortBy) => handleFilterChange({ sortBy })}
          sortOrder={filters.sortOrder}
          setSortOrder={(sortOrder) => handleFilterChange({ sortOrder })}
        />
      </div>

      <div className="mt-6">
        <InventoryTable
          medicines={inventoryData?.data?.data?.medicines || []}
          isLoading={isLoading}
          editingMedicine={editingMedicine}
          setEditingMedicine={setEditingMedicine}
          onUpdateQuantity={handleUpdateQuantity}
          onDeleteMedicine={handleDeleteMedicine}
          updateStockMutation={updateStockMutation}
          deleteMedicineMutation={deleteMedicineMutation}
          pagination={inventoryData?.data?.pagination}
          onPageChange={handlePageChange}
          onNextPage={handleNextPage}
          onPrevPage={handlePrevPage}
        />
      </div>

      <AddMedicineModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        newMedicine={newMedicine}
        setNewMedicine={setNewMedicine}
        onSubmit={handleCreateMedicine}
        isLoading={createMedicineMutation.isLoading}
      />
    </div>
  );
};

export default InventoryPage;