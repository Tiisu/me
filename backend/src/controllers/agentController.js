const { ethers } = require('ethers');
const User = require('../models/User');
const Agent = require('../models/Agent');
const WasteReport = require('../models/WasteReport');
const wasteVanABI = require('../config/wasteVanABI.json');

/**
 * Get agent profile
 */
const getAgentProfile = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Find agent by user ID
    const agent = await Agent.findOne({ user: userId })
      .populate('user', 'username email walletAddress profileImage');
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent profile not found' });
    }
    
    res.json(agent);
  } catch (error) {
    console.error('Get agent profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update agent profile
 */
const updateAgentProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { serviceAreas } = req.body;
    
    // Find agent by user ID
    const agent = await Agent.findOne({ user: userId });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent profile not found' });
    }
    
    // Update fields if provided
    if (serviceAreas) agent.serviceAreas = serviceAreas;
    
    await agent.save();
    
    res.json(agent);
  } catch (error) {
    console.error('Update agent profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get agent statistics
 */
const getAgentStatistics = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Find agent by user ID
    const agent = await Agent.findOne({ user: userId });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent profile not found' });
    }
    
    // Count reports by status
    const collectedCount = await WasteReport.countDocuments({ 
      assignedAgent: userId, 
      status: 'collected' 
    });
    
    const processedCount = await WasteReport.countDocuments({ 
      assignedAgent: userId, 
      status: 'processed' 
    });
    
    // Calculate total waste by type
    const wasteByType = await WasteReport.aggregate([
      { $match: { assignedAgent: userId } },
      { $group: { _id: '$plasticType', total: { $sum: '$quantity' } } }
    ]);
    
    // Get recent collections
    const recentCollections = await WasteReport.find({ 
      assignedAgent: userId 
    })
    .populate('user', 'username email walletAddress')
    .sort({ collectionTime: -1 })
    .limit(5);
    
    // Get blockchain stats if available
    let blockchainStats = null;
    const user = await User.findById(userId);
    
    if (user.walletAddress && user.isRegisteredOnChain) {
      try {
        // Connect to blockchain
        const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
        const wasteVanContract = new ethers.Contract(
          process.env.WASTE_VAN_ADDRESS,
          wasteVanABI,
          provider
        );
        
        // Get agent stats from blockchain
        const stats = await wasteVanContract.getAgentStats(user.walletAddress);
        
        blockchainStats = {
          pointBalance: stats[0].toString(),
          totalCollections: stats[1].toString(),
          totalProcessed: stats[2].toString()
        };
      } catch (error) {
        console.error('Blockchain stats error:', error);
        // Continue even if blockchain stats fail
      }
    }
    
    res.json({
      agentInfo: {
        status: agent.status,
        pointBalance: agent.pointBalance,
        totalCollections: agent.totalCollections,
        totalProcessed: agent.totalProcessed,
        rating: agent.rating
      },
      counts: {
        collected: collectedCount,
        processed: processedCount,
        total: collectedCount + processedCount
      },
      wasteByType: wasteByType.map(item => ({
        type: item._id,
        total: item.total
      })),
      recentCollections,
      blockchainStats
    });
  } catch (error) {
    console.error('Get agent statistics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Add service area
 */
const addServiceArea = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, longitude, latitude, radius } = req.body;
    
    if (!name || !longitude || !latitude || !radius) {
      return res.status(400).json({ message: 'Name, longitude, latitude, and radius are required' });
    }
    
    // Find agent by user ID
    const agent = await Agent.findOne({ user: userId });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent profile not found' });
    }
    
    // Add new service area
    agent.serviceAreas.push({
      name,
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
      radius: parseFloat(radius)
    });
    
    await agent.save();
    
    res.json({
      message: 'Service area added successfully',
      serviceAreas: agent.serviceAreas
    });
  } catch (error) {
    console.error('Add service area error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Remove service area
 */
const removeServiceArea = async (req, res) => {
  try {
    const userId = req.userId;
    const areaId = req.params.id;
    
    // Find agent by user ID
    const agent = await Agent.findOne({ user: userId });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent profile not found' });
    }
    
    // Remove service area
    agent.serviceAreas = agent.serviceAreas.filter(
      area => area._id.toString() !== areaId
    );
    
    await agent.save();
    
    res.json({
      message: 'Service area removed successfully',
      serviceAreas: agent.serviceAreas
    });
  } catch (error) {
    console.error('Remove service area error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Register as an agent
 */
const registerAsAgent = async (req, res) => {
  try {
    const userId = req.userId;
    const { walletAddress } = req.body;
    
    // Check if user exists
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if already registered as agent
    const existingAgent = await Agent.findOne({ user: userId });
    
    if (existingAgent) {
      return res.status(400).json({ message: 'User is already registered as an agent' });
    }
    
    // Update user type
    user.userType = 'agent';
    if (walletAddress) {
      user.walletAddress = walletAddress;
    }
    
    await user.save();
    
    // Create agent profile
    const agent = new Agent({
      user: userId,
      walletAddress: user.walletAddress || walletAddress,
      status: 'pending'
    });
    
    await agent.save();
    
    res.status(201).json({
      message: 'Agent registration submitted successfully. Awaiting approval.',
      agent
    });
  } catch (error) {
    console.error('Register as agent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Upload verification documents
 */
const uploadVerificationDocuments = async (req, res) => {
  try {
    const userId = req.userId;
    const { documents } = req.body;
    
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ message: 'At least one document is required' });
    }
    
    // Find agent by user ID
    const agent = await Agent.findOne({ user: userId });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent profile not found' });
    }
    
    // Add documents
    agent.verificationDocuments = [...agent.verificationDocuments, ...documents];
    
    await agent.save();
    
    res.json({
      message: 'Documents uploaded successfully',
      documents: agent.verificationDocuments
    });
  } catch (error) {
    console.error('Upload documents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get pending agents (admin only)
 */
const getPendingAgents = async (req, res) => {
  try {
    // Find pending agents
    const pendingAgents = await Agent.find({ status: 'pending' })
      .populate('user', 'username email walletAddress');
    
    res.json(pendingAgents);
  } catch (error) {
    console.error('Get pending agents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Approve agent (admin only)
 */
const approveAgent = async (req, res) => {
  try {
    const agentId = req.params.id;
    
    // Find agent by ID
    const agent = await Agent.findById(agentId)
      .populate('user', 'username email walletAddress isRegisteredOnChain');
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Update agent status
    agent.status = 'approved';
    await agent.save();
    
    // If agent has wallet connected, approve on blockchain
    if (agent.walletAddress && !agent.user.isRegisteredOnChain) {
      try {
        // Connect to blockchain
        const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
        // This would need a private key in production
        const signer = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000', provider);
        const wasteVanContract = new ethers.Contract(
          process.env.WASTE_VAN_ADDRESS,
          wasteVanABI,
          signer
        );
        
        // Approve agent on blockchain
        const tx = await wasteVanContract.updateAgentStatus(
          agent.walletAddress,
          1 // Approved status
        );
        
        await tx.wait();
        
        // Update user registration status
        await User.findByIdAndUpdate(
          agent.user._id,
          { isRegisteredOnChain: true }
        );
      } catch (error) {
        console.error('Blockchain approve error:', error);
        // Continue even if blockchain approve fails
      }
    }
    
    res.json({
      message: 'Agent approved successfully',
      agent
    });
  } catch (error) {
    console.error('Approve agent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Reject agent (admin only)
 */
const rejectAgent = async (req, res) => {
  try {
    const agentId = req.params.id;
    
    // Find agent by ID
    const agent = await Agent.findById(agentId)
      .populate('user', 'username email walletAddress isRegisteredOnChain');
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Update agent status
    agent.status = 'rejected';
    await agent.save();
    
    // If agent has wallet connected, reject on blockchain
    if (agent.walletAddress && agent.user.isRegisteredOnChain) {
      try {
        // Connect to blockchain
        const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
        // This would need a private key in production
        const signer = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000', provider);
        const wasteVanContract = new ethers.Contract(
          process.env.WASTE_VAN_ADDRESS,
          wasteVanABI,
          signer
        );
        
        // Reject agent on blockchain
        const tx = await wasteVanContract.updateAgentStatus(
          agent.walletAddress,
          2 // Rejected status
        );
        
        await tx.wait();
      } catch (error) {
        console.error('Blockchain reject error:', error);
        // Continue even if blockchain reject fails
      }
    }
    
    res.json({
      message: 'Agent rejected successfully',
      agent
    });
  } catch (error) {
    console.error('Reject agent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all agents (admin only)
 */
const getAllAgents = async (req, res) => {
  try {
    // Find all agents
    const agents = await Agent.find()
      .populate('user', 'username email walletAddress');
    
    res.json(agents);
  } catch (error) {
    console.error('Get all agents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAgentProfile,
  updateAgentProfile,
  getAgentStatistics,
  addServiceArea,
  removeServiceArea,
  registerAsAgent,
  uploadVerificationDocuments,
  getPendingAgents,
  approveAgent,
  rejectAgent,
  getAllAgents
};
