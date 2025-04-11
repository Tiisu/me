const express = require('express');
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');
const agentMiddleware = require('../middleware/agentMiddleware');

const router = express.Router();

// Routes for all authenticated users
router.get('/', authMiddleware, notificationController.getUserNotifications);
router.put('/mark-read', authMiddleware, notificationController.markNotificationsAsRead);
router.put('/mark-all-read', authMiddleware, notificationController.markAllNotificationsAsRead);
router.delete('/:id', authMiddleware, notificationController.deleteNotification);
router.get('/count', authMiddleware, notificationController.getNotificationCount);

// Routes for agents only
router.get('/nearby', authMiddleware, agentMiddleware, notificationController.getNearbyWasteReportNotifications);

module.exports = router;
