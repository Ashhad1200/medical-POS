import api from './api';

// Customer Service
export const customerService = {
  // Search customers by name, phone, or email
  searchCustomers: async (query) => {
    try {
      const response = await api.get(`/customers/search?query=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      console.error('Error searching customers:', error);
      throw error;
    }
  },

  // Get customer by ID
  getCustomer: async (customerId) => {
    try {
      const response = await api.get(`/customers/${customerId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw error;
    }
  },

  // Get customer order history
  getCustomerOrderHistory: async (customerId, page = 1, limit = 10) => {
    try {
      const response = await api.get(`/customers/${customerId}/orders?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching customer order history:', error);
      throw error;
    }
  },

  // Get customer pending balance
  getCustomerPendingBalance: async (customerId) => {
    try {
      const response = await api.get(`/customers/${customerId}/balance`);
      return response.data;
    } catch (error) {
      console.error('Error fetching customer pending balance:', error);
      throw error;
    }
  },

  // Create new customer
  createCustomer: async (customerData) => {
    try {
      const response = await api.post('/customers', customerData);
      return response.data;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  },

  // Update customer
  updateCustomer: async (customerId, customerData) => {
    try {
      const response = await api.put(`/customers/${customerId}`, customerData);
      return response.data;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  },

  // Get all customers with pagination
  getAllCustomers: async (page = 1, limit = 20, filters = {}) => {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });
      const response = await api.get(`/customers?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  },

  // Get customer statistics
  getCustomerStats: async (customerId) => {
    try {
      const response = await api.get(`/customers/${customerId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching customer stats:', error);
      throw error;
    }
  },

  // Update customer balance (for payments)
  updateCustomerBalance: async (customerId, amount, type = 'payment') => {
    try {
      const response = await api.post(`/customers/${customerId}/balance`, {
        amount,
        type // 'payment' or 'charge'
      });
      return response.data;
    } catch (error) {
      console.error('Error updating customer balance:', error);
      throw error;
    }
  },

  // Get customer medication history
  getCustomerMedicationHistory: async (customerId, page = 1, limit = 10) => {
    try {
      const response = await api.get(`/customers/${customerId}/medications?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching customer medication history:', error);
      throw error;
    }
  }
};

export default customerService;