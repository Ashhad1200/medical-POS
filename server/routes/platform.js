const express = require("express");
const router = express.Router();
const { platformAuth } = require("../middleware/platformAuth");
const c = require("../controllers/platformController");

// Every route in here is SaaS-operator only.
router.use(platformAuth);

// dashboard / ops
router.get("/overview", c.getOverview);
router.get("/health", c.getHealth);
router.get("/audit-logs", c.listAuditLogs);

// plans
router.get("/plans", c.listPlans);
router.post("/plans", c.createPlan);
router.get("/plans/:id", c.getPlan);
router.put("/plans/:id", c.updatePlan);
router.patch("/plans/:id", c.updatePlan);
router.delete("/plans/:id", c.deletePlan);

// organizations
router.get("/organizations", c.listOrganizations);
router.post("/organizations", c.createOrganization);
router.get("/organizations/:id", c.getOrganization);
router.put("/organizations/:id", c.updateOrganization);
router.patch("/organizations/:id", c.updateOrganization);
router.patch("/organizations/:id/plan", c.setOrganizationPlan);
router.patch("/organizations/:id/access", c.setOrganizationAccess);
router.patch("/organizations/:id/status", c.setOrganizationStatus);

// users (cross-tenant)
router.get("/users", c.listUsers);
router.patch("/users/:id/status", c.setUserStatus);
router.post("/users/:id/revoke-session", c.revokeUserSession);

module.exports = router;
