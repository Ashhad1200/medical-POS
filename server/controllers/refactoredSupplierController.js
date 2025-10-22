const RefactoredSupplier = require("../models/RefactoredSupplier");
const {
  asyncHandler,
  createSuccessResponse,
  createErrorResponse,
} = require("../utils/errors");
const {
  validateRequiredFields,
  sanitizeString,
} = require("../utils/validators");

// Get all suppliers with pagination and filters
const getAllSuppliers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    status = "all",
    sortBy = "name",
    sortOrder = "asc",
  } = req.query;

  const organizationId = req.user.organization_id;

  const options = {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 100), // Cap at 100
    search: sanitizeString(search, { trim: true, removeHtml: true }),
    isActive: status === "all" ? null : status === "active",
    sortBy,
    sortOrder,
  };

  const result = await RefactoredSupplier.findByOrganization(
    organizationId,
    options
  );

  res.json(
    createSuccessResponse(result.suppliers, "Suppliers fetched successfully", {
      pagination: result.pagination,
    })
  );
});

// Get single supplier
const getSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.user.organization_id;

  const supplier = await RefactoredSupplier.findById(id, organizationId);

  // Get purchase order summary for this supplier
  const purchaseOrderSummary = await supplier.getPurchaseOrderSummary();

  res.json(
    createSuccessResponse(
      {
        ...supplier,
        purchaseOrderSummary,
      },
      "Supplier fetched successfully"
    )
  );
});

// Create new supplier
const createSupplier = asyncHandler(async (req, res) => {
  const organizationId = req.user.organization_id;
  const userId = req.user.id;

  // Validate required fields
  const requiredFields = ["name"];
  const missingFields = validateRequiredFields(req.body, requiredFields);

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json(
        createErrorResponse(
          `Missing required fields: ${missingFields.join(", ")}`,
          400,
          "VALIDATION_ERROR"
        )
      );
  }

  const supplierData = {
    ...req.body,
    organizationId,
  };

  const supplier = new RefactoredSupplier(supplierData);
  await supplier.save(userId);

  res
    .status(201)
    .json(createSuccessResponse(supplier, "Supplier created successfully"));
});

// Update supplier
const updateSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.user.organization_id;
  const userId = req.user.id;

  const supplier = await RefactoredSupplier.findById(id, organizationId);

  // Update supplier properties
  Object.assign(supplier, req.body);
  await supplier.save(userId);

  res.json(createSuccessResponse(supplier, "Supplier updated successfully"));
});

// Delete supplier
const deleteSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.user.organization_id;
  const userId = req.user.id;

  const supplier = await RefactoredSupplier.findById(id, organizationId);
  const result = await supplier.delete(userId);

  const message = result.deleted
    ? "Supplier deleted successfully"
    : "Supplier deactivated successfully (has associated purchase orders)";

  res.json(createSuccessResponse(result, message));
});

// Toggle supplier status
const toggleSupplierStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.user.organization_id;
  const userId = req.user.id;

  const supplier = await RefactoredSupplier.findById(id, organizationId);
  await supplier.toggleStatus(userId);

  const message = supplier.isActive
    ? "Supplier activated successfully"
    : "Supplier deactivated successfully";

  res.json(createSuccessResponse(supplier, message));
});

// Search suppliers
const searchSuppliers = asyncHandler(async (req, res) => {
  const { q: searchTerm } = req.query;
  const organizationId = req.user.organization_id;

  if (!searchTerm || searchTerm.trim().length < 2) {
    return res
      .status(400)
      .json(
        createErrorResponse(
          "Search term must be at least 2 characters long",
          400,
          "VALIDATION_ERROR"
        )
      );
  }

  const suppliers = await RefactoredSupplier.searchSuppliers(
    organizationId,
    sanitizeString(searchTerm, { trim: true, removeHtml: true })
  );

  res.json(createSuccessResponse(suppliers, "Suppliers search completed"));
});

// Get supplier statistics
const getSupplierStats = asyncHandler(async (req, res) => {
  const organizationId = req.user.organization_id;

  const stats = await RefactoredSupplier.getStats(organizationId);

  res.json(
    createSuccessResponse(stats, "Supplier statistics fetched successfully")
  );
});

// Get suppliers by city
const getSuppliersByCity = asyncHandler(async (req, res) => {
  const organizationId = req.user.organization_id;
  const { query } = require("../config/database");

  const result = await query(
    `SELECT city, COUNT(*) as count
     FROM suppliers
     WHERE organization_id = $1 AND is_active = true AND city IS NOT NULL
     GROUP BY city
     ORDER BY count DESC`,
    [organizationId]
  );

  // Convert to array with city and count
  const cities = result.rows.map((row) => ({
    city: row.city.trim(),
    count: parseInt(row.count),
  }));

  res.json(
    createSuccessResponse(cities, "Supplier cities fetched successfully")
  );
});

// Validate supplier data
const validateSupplierData = asyncHandler(async (req, res) => {
  const { email, phone, taxNumber } = req.body;
  const organizationId = req.user.organization_id;
  const excludeId = req.params.id || null;

  const validationResults = {
    email: { valid: true, message: null },
    phone: { valid: true, message: null },
    taxNumber: { valid: true, message: null },
  };

  // Check email uniqueness
  if (email) {
    const isDuplicate = await RefactoredSupplier.checkDuplicateEmail(
      email,
      organizationId,
      excludeId
    );

    if (isDuplicate) {
      validationResults.email = {
        valid: false,
        message: "Email already exists for another supplier",
      };
    }
  }

  res.json(createSuccessResponse(validationResults, "Validation completed"));
});

// Export supplier data
const exportSuppliers = asyncHandler(async (req, res) => {
  const organizationId = req.user.organization_id;
  const { format = "json" } = req.query;

  const result = await RefactoredSupplier.findByOrganization(organizationId, {
    page: 1,
    limit: 10000, // Large limit for export
    isActive: true,
  });

  if (format === "csv") {
    // Convert to CSV format
    const csvHeaders = [
      "Supplier Code",
      "Name",
      "Contact Person",
      "Email",
      "Phone",
      "Address",
      "City",
      "State",
      "Country",
      "Credit Limit",
      "Payment Terms",
      "Created At",
    ];

    const csvRows = result.suppliers.map((supplier) => [
      supplier.supplierCode,
      supplier.name,
      supplier.contactPerson || "",
      supplier.email || "",
      supplier.phone || "",
      supplier.address || "",
      supplier.city || "",
      supplier.state || "",
      supplier.country || "",
      supplier.creditLimit,
      supplier.paymentTerms,
      supplier.createdAt,
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=suppliers.csv");
    res.send(csvContent);
  } else {
    res.json(
      createSuccessResponse(result.suppliers, "Suppliers exported successfully")
    );
  }
});

module.exports = {
  getAllSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  toggleSupplierStatus,
  searchSuppliers,
  getSupplierStats,
  getSuppliersByCity,
  validateSupplierData,
  exportSuppliers,
};
