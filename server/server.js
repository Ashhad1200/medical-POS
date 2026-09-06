// Load .env BEFORE anything that reads process.env at import time
// (config/database.js builds its pg Pool on require).
require("dotenv").config();

const express = require("express");
const { query } = require("./config/database");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const {
  sanitizeResponse,
  removeServerHeaders,
  addSecurityHeaders,
  sanitizeErrors,
} = require("./middleware/securityHeaders");
const { requestId, accessLog, logError } = require("./utils/logger");

// Import routes
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const medicineRoutes = require("./routes/medicines");
const orderRoutes = require("./routes/orders");
// Use refactored routes for suppliers and purchase orders
const supplierRoutes = require("./routes/refactoredSuppliers");
const purchaseOrderRoutes = require("./routes/refactoredPurchaseOrders");
const inventoryRoutes = require("./routes/inventory");
const userRoutes = require("./routes/users");
const organizationRoutes = require("./routes/organizations");
const adminRoutes = require("./routes/admin");
const reportRoutes = require("./routes/reports");
const customerRoutes = require("./routes/customers");
const securityTestRoutes = require("./routes/security-test");
const aiAnalyticsRoutes = require("./routes/aiAnalytics");
const platformRoutes = require("./routes/platform");
const publicRoutes = require("./routes/public");
const {
  publicRouter: storefrontPublicRoutes,
  authedRouter: storefrontRoutes,
} = require("./routes/storefront");
const {
  supplierRouter,
  connectionsRouter,
  b2bRouter,
} = require("./routes/supplierNetwork");

const app = express();

// Trust proxy (for production deployment behind reverse proxy)
app.set("trust proxy", 1);

// Disable x-powered-by header to hide Express
app.disable("x-powered-by");

// Enhanced Security middleware with helmet
app.use(
  helmet({
    // Hide X-Powered-By header
    hidePoweredBy: true,

    // Set Content-Security-Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },

    // Set X-Content-Type-Options to prevent MIME sniffing
    noSniff: true,

    // Set X-Frame-Options to prevent clickjacking
    frameguard: { action: "deny" },

    // Set Strict-Transport-Security for HTTPS
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },

    // Allow cross-origin resource sharing
    crossOriginResourcePolicy: { policy: "cross-origin" },

    // Set X-DNS-Prefetch-Control
    dnsPrefetchControl: { allow: false },

    // Set X-Download-Options for IE8+
    ieNoOpen: true,

    // Set Referrer-Policy
    referrerPolicy: { policy: "no-referrer" },

    // Set X-XSS-Protection for older browsers
    xssFilter: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression middleware
app.use(compression());

// CORS configuration - More permissive for mobile and all deployments
// Production allowlist comes from env: CORS_ORIGINS (comma-separated exact
// origins) plus PLATFORM_DOMAIN (allows the apex + any *.<domain> subdomain).
const ENV_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const PLATFORM_DOMAIN = (process.env.PLATFORM_DOMAIN || "").toLowerCase().trim();
const platformOriginRe = PLATFORM_DOMAIN
  ? new RegExp(
      `^https://([a-z0-9-]+\\.)*${PLATFORM_DOMAIN.replace(/\./g, "\\.")}$`
    )
  : null;

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // List of allowed origins
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:3000",
      "http://localhost:3007",
      ...ENV_ORIGINS,
    ];

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // apex + any subdomain of the configured platform domain
    if (platformOriginRe && platformOriginRe.test(origin)) {
      return callback(null, true);
    }

    // Allow any medical*.vercel.app domain (for all deployments)
    if (/^https:\/\/medical.*\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    // Allow any *.vercel.app domain for this project (more permissive)
    if (
      /^https:\/\/.*\.vercel\.app$/.test(origin) &&
      origin.includes("medical")
    ) {
      return callback(null, true);
    }

    // Allow Render domains
    if (/^https:\/\/.*\.onrender\.com$/.test(origin)) {
      return callback(null, true);
    }

    // Allow Heroku domains
    if (/^https:\/\/.*\.herokuapp\.com$/.test(origin)) {
      return callback(null, true);
    }

    // For development, allow localhost with any port
    if (/^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }

    // Allow the environment CLIENT_URL if set
    if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) {
      return callback(null, true);
    }

    // Escape hatch: only when explicitly opted in (never silently in prod).
    if (process.env.CORS_ALLOW_ALL === "true") {
      console.warn(`CORS_ALLOW_ALL: permitting ${origin}`);
      return callback(null, true);
    }

    console.log(`CORS blocked origin: ${origin}`);
    callback(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Cache-Control",
    "X-Requested-With",
    "Accept",
    "Accept-Language",
  ],
  // Only expose essential headers, hide everything else
  exposedHeaders: ["X-Total-Count"],
};
// Public storefront/plans/signup endpoints are unauthenticated + rate-limited
// and are called from pharmacies' own (arbitrary) custom domains — open CORS.
// Everything else uses the allowlist above.
app.use(
  cors((req, cb) =>
    cb(
      null,
      req.path.startsWith("/api/public")
        ? { origin: true, credentials: false, optionsSuccessStatus: 200 }
        : corsOptions
    )
  )
);

// Rate limiting (disabled under NODE_ENV=test so the suite isn't throttled)
const skipRateLimit = () => process.env.NODE_ENV === "test";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  skip: skipRateLimit,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});
app.use("/api/", limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 10), // per IP per window
  skip: skipRateLimit,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);

// Signup: strict, IP-based
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  skip: skipRateLimit,
  message: {
    success: false,
    message: "Too many sign-up attempts from this IP. Please try again later.",
  },
});
app.use("/api/public/signup", signupLimiter);

// Storefront order placement: strict, IP-based
const storefrontOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skip: skipRateLimit,
  message: {
    success: false,
    message: "Too many orders from this IP. Please try again shortly.",
  },
});
app.use("/api/public/storefront/:slug/order", storefrontOrderLimiter);

// Apply security middleware
app.use(removeServerHeaders);
app.use(addSecurityHeaders);
app.use(sanitizeResponse);

// Request id + logging. Dev: readable morgan. Prod: one structured JSON line
// per request (utils/logger), consumable by any log aggregator.
app.use(requestId);
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(accessLog);
}

// Health check — deep: verifies the DB is reachable so the container's
// healthcheck (and Coolify) actually catch a database outage, not just a
// crashed process. Minimal body for security.
app.get("/health", async (req, res) => {
  try {
    await query("SELECT 1");
    res.json({ success: true, status: "OK", timestamp: new Date().toISOString() });
  } catch (e) {
    res
      .status(503)
      .json({ success: false, status: "DEGRADED", timestamp: new Date().toISOString() });
  }
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/organizations", organizationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/ai-analytics", aiAnalyticsRoutes);
app.use("/api/platform", platformRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/public/storefront", storefrontPublicRoutes);
app.use("/api/storefront", storefrontRoutes);
app.use("/api/supplier", supplierRouter);
app.use("/api/connections", connectionsRouter);
app.use("/api/b2b", b2bRouter);

// Security test routes (for development/testing only)
if (process.env.NODE_ENV !== "production") {
  app.use("/api/security-test", securityTestRoutes);
}

// Apply error sanitization middleware
app.use(sanitizeErrors);

// Error handling middleware
app.use((err, req, res, next) => {
  logError(err, req);

  // PostgreSQL specific errors
  if (err.code === "23505") {
    // Unique violation
    return res.status(400).json({
      success: false,
      message: "Duplicate entry - this record already exists",
    });
  }

  if (err.code === "23503") {
    // Foreign key violation
    return res.status(400).json({
      success: false,
      message: "Referenced record does not exist",
    });
  }

  if (err.code === "23502") {
    // Not null violation
    return res.status(400).json({
      success: false,
      message: "Required field is missing",
    });
  }

  if (err.code === "22P02") {
    // Invalid text representation
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
  }

  // Default error - hide sensitive information in production
  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    message:
      statusCode === 500 && process.env.NODE_ENV === "production"
        ? "An error occurred. Please try again later."
        : err.message || "Internal Server Error",
  };

  // Only include stack trace in development
  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
    response.details = err.details || undefined;
  }

  res.status(statusCode).json(response);
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received");
  process.exit(0);
});

const PORT = process.env.PORT || 3001;

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await query("SELECT NOW()");

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`Database: PostgreSQL`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Only boot the HTTP listener when run directly (`node server.js`).
// When required by tests, export the app for supertest instead.
if (require.main === module) {
  startServer();
}

module.exports = app;
