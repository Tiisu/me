const Notification = require('../models/Notification');
const User = require('../models/User');
const Agent = require('../models/Agent');
const WasteReport = require('../models/WasteReport');

/**
 * Create a new notification
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Created notification
 */
const createNotification = async (notificationData) => {
  try {
    const notification = new Notification(notificationData);
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};

/**
 * Create waste report notifications for all agents
 * This is called when a user reports waste
 */
const createWasteReportNotifications = async (wasteReport, user) => {
  try {
    // Find all approved agents
    const agents = await Agent.find({ status: 'approved' })
      .populate('user', 'username email');
    
    if (!agents || agents.length === 0) {
      console.log('No approved agents found to notify');
      return [];
    }

    console.log(`Creating waste report notifications for ${agents.length} agents`);
    
    // Create notifications for each agent
    const notificationPromises = agents.map(agent => {
      return createNotification({
        recipient: agent.user._id,
        sender: user._id,
        type: 'waste_reported',
        title: 'New Waste Report',
        message: `${user.username} has reported ${wasteReport.quantity}g of ${wasteReport.plasticType} waste.`,
        relatedItem: {
          itemType: 'waste_report',
          itemId: wasteReport._id
        },
        location: wasteReport.location,
        metadata: {
          wasteReportId: wasteReport._id,
          plasticType: wasteReport.plasticType,
          quantity: wasteReport.quantity,
          reporterUsername: user.username
        }
      });
    });
    
    const notifications = await Promise.all(notificationPromises);
    return notifications;
  } catch (error) {
    console.error('Create waste report notifications error:', error);
    return [];
  }
};

/**
 * Get notifications for a user
 */
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10, unreadOnly = false } = req.query;
    
    // Build query
    const query = { recipient: userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Find notifications
    const notifications = await Notification.find(query)
      .populate('sender', 'username email profileImage')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    // Count total notifications
    const total = await Notification.countDocuments(query);
    
    // Count unread notifications
    const unreadCount = await Notification.countDocuments({ 
      recipient: userId, 
      read: false 
    });
    
    res.json({
      notifications,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      totalNotifications: total,
      unreadCount
    });
  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Mark notifications as read
 */
const markNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const { notificationIds } = req.body;
    
    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({ message: 'Notification IDs are required' });
    }
    
    // Update notifications
    const result = await Notification.updateMany(
      { 
        _id: { $in: notificationIds },
        recipient: userId
      },
      { read: true }
    );
    
    res.json({
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark notifications as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Mark all notifications as read
 */
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Update all unread notifications for the user
    const result = await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true }
    );
    
    res.json({
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a notification
 */
const deleteNotification = async (req, res) => {
  try {
    const userId = req.userId;
    const notificationId = req.params.id;
    
    // Find and delete notification
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get notification count
 */
const getNotificationCount = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Count unread notifications
    const unreadCount = await Notification.countDocuments({ 
      recipient: userId, 
      read: false 
    });
    
    res.json({ unreadCount });
  } catch (error) {
    console.error('Get notification count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get nearby waste report notifications for agents
 */
const getNearbyWasteReportNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const { longitude, latitude, maxDistance = 10 } = req.query;
    
    if (!longitude || !latitude) {
      return res.status(400).json({ message: 'Longitude and latitude are required' });
    }
    
    // Find nearby waste report notifications
    const notifications = await Notification.find({
      recipient: userId,
      type: 'waste_reported',
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseFloat(maxDistance) * 1000 // Convert km to meters
        }
      }
    })
    .populate('sender', 'username email profileImage')
    .sort({ createdAt: -1 });
    
    res.json(notifications);
  } catch (error) {
    console.error('Get nearby waste report notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createNotification,
  createWasteReportNotifications,
  getUserNotifications,
  markNotificationsAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationCount,
  getNearbyWasteReportNotifications
};
