// ===================== APPLICATION CONSTANTS =====================

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
};

// Authentication Configuration
export const AUTH_CONFIG = {
  PROFILE_FETCH_TIMEOUT: 8000, // 8 seconds
  INITIALIZATION_TIMEOUT: 10000, // 10 seconds
  SAFETY_TIMEOUT: 15000, // 15 seconds
  SESSION_STORAGE_KEY: "medical-pos-auth",
};

// Query Configuration (React Query stale times)
export const QUERY_CONFIG = {
  STALE_TIME: {
    VERY_SHORT: 30 * 1000, // 30 seconds - for real-time data
    SHORT: 1 * 60 * 1000, // 1 minute - for frequently changing data
    MEDIUM: 2 * 60 * 1000, // 2 minutes - for moderately changing data
    LONG: 5 * 60 * 1000, // 5 minutes - for stable data
    VERY_LONG: 10 * 60 * 1000, // 10 minutes - for rarely changing data
  },
  CACHE_TIME: 5 * 60 * 1000, // 5 minutes
  RETRY: 3,
};

// Toast Configuration
export const TOAST_CONFIG = {
  DURATION: 3000, // 3 seconds
  POSITION: "top-right",
  SUCCESS_DURATION: 2000,
  ERROR_DURATION: 4000,
};

// Pagination Configuration
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
  MAX_PAGE_SIZE: 100,
};

// File Upload Configuration
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
  ALLOWED_DOCUMENT_TYPES: ["application/pdf", "text/csv", "application/vnd.ms-excel"],
};

// Role Hierarchy
export const ROLE_HIERARCHY = {
  admin: 4,
  manager: 3,
  counter: 2,
  warehouse: 1,
};

// Order Status
export const ORDER_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
};

// Purchase Order Status
export const PURCHASE_ORDER_STATUS = {
  DRAFT: "draft",
  PENDING: "pending",
  ORDERED: "ordered",
  RECEIVED: "received",
  CANCELLED: "cancelled",
};

// Medicine Categories
export const MEDICINE_CATEGORIES = {
  TABLET: "tablet",
  CAPSULE: "capsule",
  SYRUP: "syrup",
  INJECTION: "injection",
  CREAM: "cream",
  DROPS: "drops",
  OTHER: "other",
};

// Stock Alert Levels
export const STOCK_LEVELS = {
  CRITICAL: 5,
  LOW: 10,
  MEDIUM: 50,
  HIGH: 100,
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: "MMM dd, yyyy",
  DISPLAY_WITH_TIME: "MMM dd, yyyy HH:mm",
  INPUT: "yyyy-MM-dd",
  API: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
};

// Validation Rules
export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[\+]?[1-9][\d]{0,15}$/,
};

// Environment Configuration
export const ENV_CONFIG = {
  IS_DEVELOPMENT: import.meta.env.MODE === "development",
  IS_PRODUCTION: import.meta.env.MODE === "production",
  APP_VERSION: import.meta.env.VITE_APP_VERSION || "1.0.0",
};

// Debug Configuration
export const DEBUG_CONFIG = {
  ENABLE_CONSOLE_LOGS: ENV_CONFIG.IS_DEVELOPMENT,
  ENABLE_QUERY_DEVTOOLS: ENV_CONFIG.IS_DEVELOPMENT,
  ENABLE_REDUX_DEVTOOLS: ENV_CONFIG.IS_DEVELOPMENT,
};