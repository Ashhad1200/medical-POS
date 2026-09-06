const express = require("express");
const {
  auth,
  checkRole,
  requireSupplierOrg,
  requirePharmacyOrg,
} = require("../middleware/auth");
const c = require("../controllers/supplierNetworkController");

// ---- supplier portal : /api/supplier ------------------------------------
const supplierRouter = express.Router();
supplierRouter.use(auth, requireSupplierOrg);

supplierRouter.get("/catalogue", c.listCatalogue);
supplierRouter.post("/catalogue", checkRole(["admin", "manager"]), c.createCatalogueItem);
supplierRouter.put("/catalogue/:id", checkRole(["admin", "manager"]), c.updateCatalogueItem);
supplierRouter.delete("/catalogue/:id", checkRole(["admin", "manager"]), c.deleteCatalogueItem);

supplierRouter.get("/orders", c.listIncomingOrders);
supplierRouter.patch("/orders/:id", checkRole(["admin", "manager"]), c.updateIncomingOrder);

supplierRouter.get("/returns", c.listReturns);
supplierRouter.patch("/returns/:id", checkRole(["admin", "manager"]), c.resolveReturn);

supplierRouter.get("/analytics", c.supplierAnalytics);

// ---- connections (both org types) : /api/connections -------------------
const connectionsRouter = express.Router();
connectionsRouter.use(auth);
connectionsRouter.get("/", c.listConnections);
connectionsRouter.post("/request", requirePharmacyOrg, checkRole(["admin", "manager"]), c.requestConnection);
connectionsRouter.patch("/:id", checkRole(["admin", "manager"]), c.respondToConnection);

// ---- pharmacy B2B ordering : /api/b2b ---------------------------------
const b2bRouter = express.Router();
b2bRouter.use(auth, requirePharmacyOrg);
b2bRouter.get("/suppliers", c.listConnectedSuppliers);
b2bRouter.get("/search", c.searchB2b);
b2bRouter.get("/suppliers/:supplierOrgId/catalogue", c.getSupplierCatalogue);
b2bRouter.post(
  "/suppliers/:supplierOrgId/order",
  checkRole(["admin", "manager", "warehouse"]),
  c.placeB2bOrder
);

b2bRouter.get("/returns", c.listReturns);
b2bRouter.post("/returns", checkRole(["admin", "manager", "warehouse"]), c.createReturn);

module.exports = { supplierRouter, connectionsRouter, b2bRouter };
