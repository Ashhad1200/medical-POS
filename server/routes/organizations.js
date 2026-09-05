const express = require("express");
const router = express.Router();
const { platformAuth } = require("../middleware/platformAuth");
const {
  getOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationPermissions,
  updateOrganizationPermissions,
  resetOrganizationPermissions,
} = require("../controllers/organizationController");

// Mounted at /api/admin/organizations — cross-tenant, platform operators only.
router.use(platformAuth);

// Admin organization management routes
// GET /api/admin/organizations - Get all organizations
router.get("/", getOrganizations);

// GET /api/admin/organizations/:id - Get single organization
router.get("/:id", getOrganization);

// POST /api/admin/organizations - Create new organization
router.post("/", createOrganization);

// PUT /api/admin/organizations/:id - Update organization
router.put("/:id", updateOrganization);

// DELETE /api/admin/organizations/:id - Delete organization
router.delete("/:id", deleteOrganization);

// Permission management routes
// GET /api/admin/organizations/:organizationId/permissions
router.get("/:organizationId/permissions", getOrganizationPermissions);

// PUT /api/admin/organizations/:organizationId/permissions
router.put("/:organizationId/permissions", updateOrganizationPermissions);

// POST /api/admin/organizations/:organizationId/permissions/reset
router.post("/:organizationId/permissions/reset", resetOrganizationPermissions);

module.exports = router;
