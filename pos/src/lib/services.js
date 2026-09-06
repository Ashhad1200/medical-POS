import { api } from './api';

export const authServices = {
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  logout: () => api.post('/auth/logout'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const medicineServices = {
  getAll: (params = {}) => api.get('/medicines', { params }),
  getById: (id) => api.get(`/medicines/${id}`),
  create: (data) => api.post('/medicines', data),
  update: (id, data) => api.put(`/medicines/${id}`, data),
  delete: (id) => api.delete(`/medicines/${id}`),
  search: (params = {}) => api.get('/medicines/search', { params }),
  searchWithBatches: (params = {}) =>
    api.get('/medicines/search', { params: { ...params, includeBatches: 'true' } }),
  getStats: () =>
    api.get('/medicines/stats', {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    }),
  getLowStock: () => api.get('/medicines/low-stock'),
  getExpired: () => api.get('/medicines/expired'),
  getExpiringSoon: () => api.get('/medicines/expiring-soon'),
  updateStock: (id, data) => api.patch(`/medicines/${id}/stock`, data),
  exportInventory: () => api.get('/medicines/export', { responseType: 'blob' }),
};

export const orderServices = {
  getAll: (params = {}) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  delete: (id) => api.delete(`/orders/${id}`),
  getDashboardData: (params = {}) => api.get('/orders/dashboard', { params }),
  getSalesChartData: () => api.get('/orders/sales-chart'),
  getPdf: (id) => api.get(`/orders/${id}/receipt`, { responseType: 'blob' }),
};

export const supplierServices = {
  getAll: (params = {}) => api.get('/suppliers', { params }),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
  search: (params = {}) => api.get('/suppliers/search', { params }),
  getStats: () => api.get('/suppliers/stats'),
  toggleStatus: (id) => api.patch(`/suppliers/${id}/toggle-status`),
};

export const purchaseOrderServices = {
  getAll: (params = {}) => api.get('/purchase-orders', { params }),
  getById: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post('/purchase-orders', data),
  update: (id, data) => api.put(`/purchase-orders/${id}`, data),
  delete: (id) => api.delete(`/purchase-orders/${id}`),
  receive: (id) => api.patch(`/purchase-orders/${id}/receive`, { items: [] }),
  cancel: (id) => api.patch(`/purchase-orders/${id}/cancel`),
  approve: (id) => api.patch(`/purchase-orders/${id}/approve`),
  markAsOrdered: (id) => api.patch(`/purchase-orders/${id}/mark-ordered`),
};

export const userServices = {
  getAll: (params = {}) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  updateStatus: (id, data) => api.patch(`/users/${id}/status`, data),
};

export const customerServices = {
  getAll: (params = {}) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  getDued: () => api.get('/customers', { params: { dued: 'true' } }),
};

export const dashboardServices = {
  getStats: () => api.get('/dashboard/stats'),
  getActivities: () => api.get('/dashboard/activities'),
  getOrderData: () => api.get('/orders/dashboard'),
};

export const aiAnalyticsServices = {
  getKpis: () => api.get('/ai-analytics/kpis'),
  getInsights: () => api.get('/ai-analytics/insights'),
  getPredictions: () => api.get('/ai-analytics/predictions'),
  getAlerts: () => api.get('/ai-analytics/alerts'),
};

export const reportServices = {
  inventory: () => api.get('/reports/inventory'),
  sales: () => api.get('/reports/sales'),
  rtvSuggestions: () => api.get('/reports/rtv-suggestions'),
};

export const storefrontServices = {
  getSettings: () => api.get('/storefront/settings'),
  saveSettings: (data) => api.put('/storefront/settings', data),
  getOrders: (params = {}) => api.get('/storefront/orders', { params }),
  updateOrder: (id, data) => api.patch(`/storefront/orders/${id}`, data),
  getCustomization: () => api.get('/storefront/customization'),
  saveCustomization: (data) => api.put('/storefront/customization', data),
};

// --- supplier network (Phase 2 + 3) --------------------------------------
export const supplierPortalServices = {
  getCatalogue: () => api.get('/supplier/catalogue'),
  createItem: (data) => api.post('/supplier/catalogue', data),
  updateItem: (id, data) => api.put(`/supplier/catalogue/${id}`, data),
  deleteItem: (id) => api.delete(`/supplier/catalogue/${id}`),
  getIncomingOrders: (params = {}) => api.get('/supplier/orders', { params }),
  updateIncomingOrder: (id, data) => api.patch(`/supplier/orders/${id}`, data),
  getReturns: () => api.get('/supplier/returns'),
  resolveReturn: (id, data) => api.patch(`/supplier/returns/${id}`, data),
  analytics: () => api.get('/supplier/analytics'),
};

export const connectionServices = {
  list: () => api.get('/connections'),
  request: (supplierCode) => api.post('/connections/request', { supplierCode }),
  respond: (id, data) => api.patch(`/connections/${id}`, data),
};

export const b2bServices = {
  connectedSuppliers: () => api.get('/b2b/suppliers'),
  search: (q) => api.get('/b2b/search', { params: { q } }),
  catalogue: (supplierOrgId) =>
    api.get(`/b2b/suppliers/${supplierOrgId}/catalogue`),
  order: (supplierOrgId, data) =>
    api.post(`/b2b/suppliers/${supplierOrgId}/order`, data),
  getReturns: () => api.get('/b2b/returns'),
  createReturn: (data) => api.post('/b2b/returns', data),
};
