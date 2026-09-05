const express = require("express");
const router = express.Router();
const { getPublicPlans, signup } = require("../controllers/publicController");

// Unauthenticated marketing / onboarding surface.
router.get("/plans", getPublicPlans);
router.post("/signup", signup);

module.exports = router;
