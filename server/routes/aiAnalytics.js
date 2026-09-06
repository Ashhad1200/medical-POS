const express = require('express');
const router = express.Router();
const { auth, checkRole, requirePharmacyOrg } = require('../middleware/auth');
const {
    getAIInsights,
    getAIPredictions,
    getKPIs,
    getSmartAlerts
} = require('../controllers/aiAnalyticsController');

// All routes require authentication
router.use(auth);
router.use(requirePharmacyOrg);

// AI Insights - Smart recommendations based on DB analysis
router.get('/insights', checkRole(['admin', 'manager']), getAIInsights);

// AI Predictions - Forecast sales and inventory needs
router.get('/predictions', checkRole(['admin', 'manager']), getAIPredictions);

// Real-time KPIs - Dashboard metrics
router.get('/kpis', checkRole(['admin', 'manager', 'counter']), getKPIs);

// Smart Alerts - Threshold-based notifications
router.get('/alerts', checkRole(['admin', 'manager']), getSmartAlerts);

module.exports = router;
