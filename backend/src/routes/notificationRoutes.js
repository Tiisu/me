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

// Debug routes for testing notifications

// Route to check all notifications in the system
router.get('/debug/all', authMiddleware, async (req, res) => {
  try {
    const allNotifications = await require('../models/Notification').find({})
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      count: allNotifications.length,
      notifications: allNotifications.map(n => ({
        id: n._id,
        type: n.type,
        title: n.title,
        recipient: n.recipient,
        sender: n.sender,
        read: n.read,
        createdAt: n.createdAt
      }))
    });
  } catch (error) {
    console.error('Debug route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to create a test notification
router.post('/debug/create-test', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const Notification = require('../models/Notification');

    // Create a test notification for the current user
    const testNotification = new Notification({
      recipient: userId,
      sender: userId, // Self-notification for testing
      type: 'waste_reported',
      title: 'Test Notification',
      message: 'This is a test notification created at ' + new Date().toISOString(),
      relatedItem: {
        itemType: 'system',
        itemId: userId
      },
      read: false,
      metadata: {
        test: true,
        createdAt: new Date().toISOString()
      }
    });

    await testNotification.save();

    res.json({
      message: 'Test notification created successfully',
      notification: {
        id: testNotification._id,
        type: testNotification.type,
        title: testNotification.title,
        message: testNotification.message,
        createdAt: testNotification.createdAt
      }
    });
  } catch (error) {
    console.error('Create test notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
