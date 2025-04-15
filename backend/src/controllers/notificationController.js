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
    console.log('Creating notification with data:', JSON.stringify(notificationData));
    const notification = new Notification(notificationData);
    const savedNotification = await notification.save();
    console.log('Notification created successfully with ID:', savedNotification._id);
    return savedNotification;
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
    console.log('Creating waste report notifications for wasteReport:', wasteReport._id);

    // Find all approved agents
    const agents = await Agent.find({ status: 'approved' })
      .populate('user', 'username email');

    console.log('Found agents for notifications:', agents.map(a => ({ id: a._id, username: a.user?.username })));

    // If no agents found, create a notification for the user who reported the waste
    if (!agents || agents.length === 0) {
      console.warn('No approved agents found to notify about waste report');

      // For testing purposes, create a notification for the user who reported the waste
      // This ensures notifications are working even if there are no agents
      const selfNotification = await createNotification({
        recipient: user._id,
        sender: user._id,
        type: 'waste_reported',
        title: 'Your Waste Report Submitted',
        message: `Your waste report of ${wasteReport.quantity}g of ${wasteReport.plasticType} has been submitted successfully.`,
        relatedItem: {
          itemType: 'waste_report',
          itemId: wasteReport._id
        },
        location: wasteReport.location,
        metadata: {
          wasteReportId: wasteReport._id,
          plasticType: wasteReport.plasticType,
          quantity: wasteReport.quantity,
          selfNotification: true
        }
      });

      console.log('Created self-notification for user:', selfNotification._id);
      return [selfNotification];
    }

    console.log(`Creating waste report notifications for ${agents.length} agents`);

    // Create notifications for each agent
    const notificationPromises = agents.map(agent => {
      // Skip if agent is the same as the user who reported the waste
      if (agent.user._id.toString() === user._id.toString()) {
        console.log(`Skipping notification for agent ${agent.user.username} as they reported the waste`);
        return null;
      }

      console.log(`Creating notification for agent ${agent.user.username}`);

      return createNotification({
        recipient: agent.user._id,
        sender: user._id,
        type: 'waste_reported',
        title: 'New Waste Report Available',
        message: `${user.username} has reported ${wasteReport.quantity}g of ${wasteReport.plasticType} waste. Tap to view details.`,
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

    // Filter out null values (skipped notifications)
    const filteredPromises = notificationPromises.filter(promise => promise !== null);
    const notifications = await Promise.all(filteredPromises);

    console.log(`Created ${notifications.length} notifications for waste report ${wasteReport._id}`);
    return notifications;
  } catch (error) {
    console.error('Create waste report notifications error:', error);
    // Return an empty array instead of throwing to prevent the waste report creation from failing
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

    console.log(`Getting notifications for user ${userId}, page ${page}, limit ${limit}, unreadOnly ${unreadOnly}`);

    // Build query
    const query = { recipient: userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    console.log('Notification query:', JSON.stringify(query));

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find notifications
    const notifications = await Notification.find(query)
      .populate('sender', 'username email profileImage')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    console.log(`Found ${notifications.length} notifications for user ${userId}`);
    if (notifications.length > 0) {
      console.log('First notification:', JSON.stringify(notifications[0]));
    }

    // Count total notifications
    const total = await Notification.countDocuments(query);

    // Count unread notifications
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      read: false
    });

    console.log(`Total notifications: ${total}, Unread count: ${unreadCount}`);

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

    console.log(`Getting notification count for user ${userId}`);

    // Count unread notifications
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      read: false
    });

    console.log(`Unread notification count for user ${userId}: ${unreadCount}`);

    // For debugging, also get total notifications
    const totalCount = await Notification.countDocuments({
      recipient: userId
    });

    console.log(`Total notification count for user ${userId}: ${totalCount}`);

    // For debugging, get the most recent notifications
    if (unreadCount > 0) {
      const recentNotifications = await Notification.find({
        recipient: userId,
        read: false
      })
      .sort({ createdAt: -1 })
      .limit(3);

      console.log(`Recent unread notifications for user ${userId}:`,
        recentNotifications.map(n => ({
          id: n._id,
          type: n.type,
          title: n.title,
          createdAt: n.createdAt
        }))
      );
    }

    res.json({ unreadCount, totalCount });
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
