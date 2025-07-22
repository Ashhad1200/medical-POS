const express = require("express");
const { connectDB } = require("./config/supabase");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const medicineRoutes = require("./routes/medicines");
const orderRoutes = require("./routes/orders");
const supplierRoutes = require("./routes/suppliers");
const purchaseOrderRoutes = require("./routes/purchaseOrders");
const inventoryRoutes = require("./routes/inventory");
const userRoutes = require("./routes/users");
const reportRoutes = require("./routes/reports");
const customerRoutes = require("./routes/customers");

const app = express();

// Trust proxy (for production deployment behind reverse proxy)
app.set("trust proxy", 1);

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression middleware
app.use(compression());

// CORS configuration - More permissive for mobile and all deployments
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // List of allowed origins
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://medical-orpin-mu.vercel.app",
      "https://medical-osg7l4ms2-syed-ashhads-projects.vercel.app",
    ];

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
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

    // For development, allow localhost with any port
    if (/^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }

    // Allow the environment CLIENT_URL if set
    if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) {
      return callback(null, true);
    }

    // For production, be more restrictive but log the blocked origin
    console.log(`CORS blocked origin: ${origin}`);

    // TEMPORARY: Allow all origins for debugging (remove after testing)
    if (process.env.NODE_ENV === "production") {
      console.log(
        `⚠️  TEMPORARY: Allowing origin ${origin} for mobile debugging`
      );
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
    "X-Forwarded-For",
    "X-Real-IP",
  ],
  exposedHeaders: ["X-Total-Count", "X-RateLimit-Remaining"],
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});
app.use("/api/", limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Temporarily increased for testing
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
});
app.use("/api/auth/login", authLimiter);

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Medical POS API is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: "Supabase PostgreSQL",
  });
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
app.use("/api/reports", reportRoutes);
app.use("/api/customers", customerRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Supabase/PostgreSQL specific errors
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

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
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
    // Test Supabase connection
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`Database: Supabase PostgreSQL`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
// Force redeploy - Thu Jun 12 13:04:15 PKT 2025
