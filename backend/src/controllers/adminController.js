const User = require('../models/User');
const Agent = require('../models/Agent');
const WasteReport = require('../models/WasteReport');
const Settings = require('../models/Settings');

/**
 * Get dashboard statistics
 */
const getDashboardStats = async (req, res) => {
  try {
    // Count total users
    const totalUsers = await User.countDocuments();

    // Count agents by status
    const totalAgents = await Agent.countDocuments();
    const pendingAgents = await Agent.countDocuments({ status: 'pending' });

    // Count waste reports by status
    const totalWasteReports = await WasteReport.countDocuments();
    const totalCollections = await WasteReport.countDocuments({ status: 'collected' });
    const totalProcessed = await WasteReport.countDocuments({ status: 'processed' });

    res.json({
      stats: {
        totalUsers,
        totalAgents,
        pendingAgents,
        totalWasteReports,
        totalCollections,
        totalProcessed
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all users
 */
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', userType } = req.query;

    // Build query
    const query = { userType: { $ne: 'agent' } }; // Exclude agents from users tab

    // Add search filter
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Add user type filter if specified
    if (userType) {
      query.userType = userType;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find users
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Count total users
    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      totalUsers: total
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update user status (active/inactive)
 */
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ message: 'isActive field is required' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get system settings
 */
const getSettings = async (req, res) => {
  try {
    // Find settings or create default
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({
        pointsPerKg: {
          PET: 10,
          HDPE: 15,
          PVC: 8,
          LDPE: 12,
          PP: 10,
          PS: 8,
          Other: 5
        },
        systemPaused: false
      });
    }

    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update system settings
 */
const updateSettings = async (req, res) => {
  try {
    const { pointsPerKg, systemPaused } = req.body;

    // Find settings or create default
    let settings = await Settings.findOne();

    if (!settings) {
      settings = new Settings({
        pointsPerKg: {
          PET: 10,
          HDPE: 15,
          PVC: 8,
          LDPE: 12,
          PP: 10,
          PS: 8,
          Other: 5
        },
        systemPaused: false
      });
    }

    // Update settings
    if (pointsPerKg) {
      settings.pointsPerKg = { ...settings.pointsPerKg, ...pointsPerKg };
    }

    if (systemPaused !== undefined) {
      settings.systemPaused = systemPaused;
    }

    await settings.save();

    res.json({ settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  updateUserStatus,
  getSettings,
  updateSettings
};
