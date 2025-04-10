const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Protected routes (require authentication)
router.get('/profile', authMiddleware, userController.getUserProfile);
router.put('/profile', authMiddleware, userController.updateUserProfile);
router.get('/token-balance', authMiddleware, userController.getTokenBalance);
router.get('/waste-reports', authMiddleware, userController.getUserWasteReports);
router.get('/statistics', authMiddleware, userController.getUserStatistics);

module.exports = router;
