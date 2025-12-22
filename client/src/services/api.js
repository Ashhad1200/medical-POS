import axios from "axios";
import { API_CONFIG } from "../config/constants";
import { log } from "../utils/logger";

// Use the environment variable if available, otherwise use the proxy path in dev mode
const API_BASE_URL = API_CONFIG.BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: API_CONFIG.TIMEOUT,
});

// Request interceptor to add auth token from localStorage (PostgreSQL)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle cases where server returns HTML instead of JSON
    if (
      error.response?.data &&
      typeof error.response.data === "string" &&
      error.response.data.includes("<!DOCTYPE")
    ) {
      log.error(
        "Server returned HTML instead of JSON. Check API URL and server status."
      );
      error.message =
        "Server error: Invalid response format. Please check your connection.";
    }

    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }

    // Log detailed error for debugging
    log.api("API Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    });

    return Promise.reject(error);
  }
);

// ===================== AUTH SERVICES =====================
export const authServices = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData),
  getProfile: () => api.get("/auth/profile"),
  updateProfile: (data) => api.put("/auth/profile", data),
  logout: () => api.post("/auth/logout"),
  refresh: () => api.post("/auth/refresh"),
  changePassword: (data) => api.put("/auth/change-password", data),
  getStatus: () => api.get("/auth/status"),
};

// ===================== MEDICINE SERVICES =====================
export const medicineServices = {
  getAll: (params = {}) => api.get("/medicines", { params }),
  getById: (id) => api.get(`/medicines/${id}`),
  create: (data) => api.post("/medicines", data),
  update: (id, data) => api.put(`/medicines/${id}`, data),
  delete: (id) => api.delete(`/medicines/${id}`),
  search: (params = {}) => api.get("/medicines/search", { params }),
  // FEFO-aware search with batch details
  searchWithBatches: (params = {}) => api.get("/medicines/search", {
    params: { ...params, includeBatches: 'true' }
  }),
  getStats: () =>
    api.get("/medicines/stats", {
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    }),
  getLowStock: () => api.get("/medicines/low-stock"),
  getExpired: () => api.get("/medicines/expired"),
  getExpiringSoon: () => api.get("/medicines/expiring-soon"),
  updateStock: (id, data) => api.patch(`/medicines/${id}/stock`, data),
  bulkImport: (formData) =>
    api.post("/medicines/bulk-import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  exportInventory: () => api.get("/medicines/export", { responseType: "blob" }),
  test: () => api.get("/medicines/test"),
};

// ===================== ORDER SERVICES =====================
export const orderServices = {
  getAll: (params = {}) => api.get("/orders", { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post("/orders", data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  delete: (id) => api.delete(`/orders/${id}`),
  getDashboardData: (params = {}) => api.get("/orders/dashboard", { params }),
  getSalesChartData: () => api.get("/orders/sales-chart"),
  getPdf: (id) => api.get(`/orders/${id}/receipt`, { responseType: "blob" }),
  getByDateRange: (date) => api.get("/orders", { params: { date } }),
};

// ===================== SUPPLIER SERVICES =====================
export const supplierServices = {
  getAll: (params = {}) => api.get("/suppliers", { params }),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post("/suppliers", data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
  search: (params = {}) => api.get("/suppliers/search", { params }),
  getStats: () => api.get("/suppliers/stats"),
  getByCity: (city) => api.get(`/suppliers/city/${city}`),
  toggleStatus: (id) => api.patch(`/suppliers/${id}/toggle-status`),
};

// ===================== PURCHASE ORDER SERVICES =====================
export const purchaseOrderServices = {
  getAll: (params = {}) => api.get("/purchase-orders", { params }),
  getById: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post("/purchase-orders", data),
  createWithoutSupplier: (data) =>
    api.post("/purchase-orders/without-supplier", data),
  update: (id, data) => api.put(`/purchase-orders/${id}`, data),
  delete: (id) => api.delete(`/purchase-orders/${id}`),
  receive: (id) => api.patch(`/purchase-orders/${id}/receive`, { items: [] }),
  markAsReceived: (id) => api.post(`/purchase-orders/${id}/mark-received`),
  cancel: (id) => api.patch(`/purchase-orders/${id}/cancel`),
  approve: (id) => api.patch(`/purchase-orders/${id}/approve`),
  markAsOrdered: (id) => api.patch(`/purchase-orders/${id}/mark-ordered`),
  getBySupplier: (supplierId) =>
    api.get("/purchase-orders", { params: { supplierId } }),
  getByStatus: (status) => api.get("/purchase-orders", { params: { status } }),
};

// ===================== USER SERVICES =====================
export const userServices = {
  getAll: (params = {}) => api.get("/users", { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post("/users", data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  updateStatus: (id) => api.patch(`/users/${id}/status`),
};

// ===================== DASHBOARD SERVICES =====================
export const dashboardServices = {
  getStats: () => api.get("/dashboard/stats"),
  getActivities: () => api.get("/dashboard/activities"),
  getOrderData: () => api.get("/orders/dashboard"),
};

// ===================== INVENTORY SERVICES =====================
// Note: Most inventory operations are handled by medicineServices
export const inventoryServices = {
  // Placeholder for future inventory-specific routes
  getStatus: () => api.get("/inventory"),
};

// ===================== REPORTS SERVICES =====================
export const reportServices = {
  // Placeholder for future report routes
  getAll: () => api.get("/reports"),
};

export default api;
