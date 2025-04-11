const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

// All routes require admin credentials
router.use(adminMiddleware);

// Dashboard statistics
router.get('/dashboard-stats', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getUsers);
router.put('/users/:id/status', adminController.updateUserStatus);

// System settings
router.put('/settings', adminController.updateSettings);
router.get('/settings', adminController.getSettings);

module.exports = router;
