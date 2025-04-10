const User = require('../models/User');
const WasteReport = require('../models/WasteReport');
const { ethers } = require('ethers');
const wasteVanABI = require('../config/wasteVanABI.json');

/**
 * Get user profile
 */
const getUserProfile = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Find user by ID and exclude password
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update user profile
 */
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { username, email, profileImage } = req.body;
    
    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields if provided
    if (username) user.username = username;
    if (email) user.email = email;
    if (profileImage) user.profileImage = profileImage;
    
    await user.save();
    
    // Return updated user without password
    const updatedUser = await User.findById(userId).select('-password');
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get user token balance from blockchain
 */
const getTokenBalance = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.walletAddress || !user.isRegisteredOnChain) {
      return res.status(400).json({ 
        message: 'User does not have a connected wallet or is not registered on the blockchain',
        balance: '0'
      });
    }
    
    // Connect to blockchain
    const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
    const wasteVanContract = new ethers.Contract(
      process.env.WASTE_VAN_ADDRESS,
      wasteVanABI,
      provider
    );
    
    // Get token balance
    const balance = await wasteVanContract.getUserTokenBalance(user.walletAddress);
    
    res.json({
      walletAddress: user.walletAddress,
      balance: balance.toString()
    });
  } catch (error) {
    console.error('Get token balance error:', error);
    res.status(500).json({ message: 'Server error', balance: '0' });
  }
};

/**
 * Get user waste reports
 */
const getUserWasteReports = async (req, res) => {
  try {
    const userId = req.userId;
    const { status, limit = 10, page = 1 } = req.query;
    
    // Build query
    const query = { user: userId };
    
    // Add status filter if provided
    if (status) {
      query.status = status;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Find waste reports
    const reports = await WasteReport.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    // Count total reports
    const total = await WasteReport.countDocuments(query);
    
    res.json({
      reports,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get user waste reports error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get user statistics
 */
const getUserStatistics = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Count reports by status
    const reportedCount = await WasteReport.countDocuments({ user: userId, status: 'reported' });
    const collectedCount = await WasteReport.countDocuments({ user: userId, status: 'collected' });
    const processedCount = await WasteReport.countDocuments({ user: userId, status: 'processed' });
    
    // Calculate total waste by type
    const wasteByType = await WasteReport.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$plasticType', total: { $sum: '$quantity' } } }
    ]);
    
    // Calculate total rewards
    const totalRewards = await WasteReport.aggregate([
      { $match: { user: userId, isRewardDistributed: true } },
      { $group: { _id: null, total: { $sum: '$rewardAmount' } } }
    ]);
    
    // Get recent reports
    const recentReports = await WasteReport.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.json({
      counts: {
        reported: reportedCount,
        collected: collectedCount,
        processed: processedCount,
        total: reportedCount + collectedCount + processedCount
      },
      wasteByType: wasteByType.map(item => ({
        type: item._id,
        total: item.total
      })),
      totalRewards: totalRewards.length > 0 ? totalRewards[0].total : 0,
      recentReports
    });
  } catch (error) {
    console.error('Get user statistics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  getTokenBalance,
  getUserWasteReports,
  getUserStatistics
};
