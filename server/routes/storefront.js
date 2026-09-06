const express = require("express");
const { auth, checkRole } = require("../middleware/auth");
const { requireFeature } = require("../middleware/planLimits");
const c = require("../controllers/storefrontController");
const cc = require("../controllers/storefrontCustomizationController");
const cd = require("../controllers/storefrontDomainController");

// ---- public (no auth) : /api/public/storefront ----------------------------
const publicRouter = express.Router();
publicRouter.post("/courier/webhook/:courier", c.courierWebhook);
publicRouter.post("/payment/webhook/:provider", c.paymentWebhook);
publicRouter.get("/domain/:host", cd.resolveDomain);
publicRouter.get("/:slug", c.getStore);
publicRouter.post("/:slug/order", c.placeOrder);
publicRouter.get("/:slug/order/:orderNumber", c.getPublicOrder);

// ---- pharmacy side (auth + paid feature) : /api/storefront ----------------
const authedRouter = express.Router();
authedRouter.use(auth);
authedRouter.use(requireFeature("storefront"));

authedRouter.get("/settings", checkRole(["admin", "manager"]), c.getSettings);
authedRouter.put("/settings", checkRole(["admin", "manager"]), c.upsertSettings);
authedRouter.get("/customization", checkRole(["admin", "manager"]), cc.getCustomization);
authedRouter.put("/customization", checkRole(["admin", "manager"]), cc.putCustomization);

// custom domains — extra paid feature on top of `storefront`
const domainGuard = [checkRole(["admin", "manager"]), requireFeature("custom_domain")];
authedRouter.get("/domain", ...domainGuard, cd.getDomain);
authedRouter.post("/domain", ...domainGuard, cd.addDomain);
authedRouter.post("/domain/verify", ...domainGuard, cd.verifyDomain);
authedRouter.delete("/domain", ...domainGuard, cd.deleteDomain);
authedRouter.get("/orders", checkRole(["admin", "manager", "counter"]), c.listOrders);
authedRouter.patch(
  "/orders/:id",
  checkRole(["admin", "manager", "counter"]),
  c.updateOrder
);

module.exports = { publicRouter, authedRouter };
