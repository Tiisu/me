const { validationResult } = require('express-validator');
const QRCode = require('qrcode');
const { ethers } = require('ethers');
const WasteReport = require('../models/WasteReport');
const User = require('../models/User');
const Agent = require('../models/Agent');
const wasteVanABI = require('../config/wasteVanABI.json');
const { createWasteReportNotifications } = require('./notificationController');

// Map blockchain enum values to database strings
const plasticTypeMap = {
  'PET': 0,
  'HDPE': 1,
  'PVC': 2,
  'LDPE': 3,
  'PP': 4,
  'PS': 5,
  'Other': 6
};

const statusMap = {
  'reported': 0,
  'collected': 1,
  'processed': 2
};

/**
 * Report waste collection
 */
const reportWaste = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { plasticType, quantity, location, images, qrCodeHash: providedQrCodeHash, walletAddress, description } = req.body;
    const userId = req.userId;

    // Convert plasticType to string if it's a number
    if (!isNaN(plasticType)) {
      const plasticTypeNumber = Number(plasticType);
      const plasticTypeKeys = Object.keys(plasticTypeMap);
      if (plasticTypeNumber >= 0 && plasticTypeNumber < plasticTypeKeys.length) {
        plasticType = plasticTypeKeys[plasticTypeNumber];
      }
    }

    // Generate QR code hash if not provided
    let qrCodeHash;
    if (providedQrCodeHash) {
      qrCodeHash = providedQrCodeHash;
    } else {
      const timestamp = Date.now().toString();
      const randomString = Math.random().toString(36).substring(2, 15);
      qrCodeHash = `${timestamp}-${randomString}`;
    }

    // Generate QR code image
    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeHash);

    // Create new waste report
    console.log('Creating new waste report with data:', {
      userId,
      plasticType,
      quantity,
      qrCodeHash,
      status: 'reported',
      location: location ? 'provided' : 'not provided',
      images: images ? images.length : 0,
      walletAddress: walletAddress || 'not provided'
    });

    const wasteReport = new WasteReport({
      user: userId,
      plasticType,
      quantity,
      qrCodeHash,
      qrCodeImage: qrCodeDataUrl,
      status: 'reported',
      location: location || undefined,
      images: images || [],
      notes: description || 'Plastic waste collection',
      walletAddress: walletAddress || null
    });

    // Save the report and ensure it's properly saved
    const savedReport = await wasteReport.save();
    console.log('Waste report saved successfully with ID:', savedReport._id);

    // Double-check that the report was saved by fetching it again
    const verifiedReport = await WasteReport.findById(savedReport._id);
    if (verifiedReport) {
      console.log('Verified report exists in database with ID:', verifiedReport._id);
    } else {
      console.error('WARNING: Could not verify report was saved! This is a critical error.');
    }

    // If user has wallet connected, report on blockchain
    const user = await User.findById(userId);
    if (user.walletAddress && user.isRegisteredOnChain) {
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

        // Report waste on blockchain
        const tx = await wasteVanContract.reportWaste(
          plasticTypeMap[plasticType],
          quantity,
          qrCodeHash,
          { from: user.walletAddress }
        );

        const receipt = await tx.wait();

        // Update report with blockchain info
        wasteReport.blockchainTxHash = receipt.hash;

        // Get report ID from events (this would need to be implemented based on your contract events)
        // const reportId = getReportIdFromReceipt(receipt);
        // wasteReport.reportId = reportId;

        await wasteReport.save();
      } catch (error) {
        console.error('Blockchain report error:', error);
        // Continue even if blockchain report fails
      }
    }

    // Create notifications for agents about the new waste report
    try {
      console.log('Attempting to create waste report notifications for report:', wasteReport._id);
      const notifications = await createWasteReportNotifications(wasteReport, user);
      console.log(`Waste report notifications created successfully: ${notifications.length} notifications`);
    } catch (notificationError) {
      console.error('Failed to create waste report notifications:', notificationError);
      // Continue even if notification creation fails
    }

    res.status(201).json({
      message: 'Waste reported successfully',
      report: wasteReport,
      qrCodeUrl: wasteReport.qrCodeImage
    });
  } catch (error) {
    console.error('Report waste error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get waste reports with filters
 */
const getWasteReports = async (req, res) => {
  try {
    console.log('getWasteReports called with query:', req.query);
    const { status, plasticType, limit = 10, page = 1, _t } = req.query;

    // Log if this is a force refresh request
    if (_t) {
      console.log('Force refresh requested at:', new Date(_t * 1));
    }

    // Build query
    const query = {};

    // Add filters if provided
    if (status) query.status = status;
    if (plasticType) query.plasticType = plasticType;

    console.log('Built query:', query);

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find waste reports
    console.log('Executing query with pagination:', { skip, limit });

    // Use lean() for faster query execution and to ensure we're not getting cached data
    const reports = await WasteReport.find(query)
      .populate('user', 'username email walletAddress')
      .populate('assignedAgent', 'username email walletAddress')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean(); // Convert to plain JavaScript objects

    console.log(`Found ${reports.length} waste reports`);
    if (reports.length > 0) {
      console.log('First report:', {
        id: reports[0]._id,
        status: reports[0].status,
        plasticType: reports[0].plasticType,
        createdAt: reports[0].createdAt
      });
    }

    // Count total reports
    const total = await WasteReport.countDocuments(query);
    console.log(`Total reports matching query: ${total}`);

    const response = {
      reports,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    };

    console.log('Sending response with pagination:', response.pagination);
    res.json(response);
  } catch (error) {
    console.error('Get waste reports error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get waste report by ID
 */
const getWasteReportById = async (req, res) => {
  try {
    const reportId = req.params.id;

    const report = await WasteReport.findById(reportId)
      .populate('user', 'username email walletAddress')
      .populate('assignedAgent', 'username email walletAddress');

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Get waste report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get QR code for a waste report
 */
const getQRCode = async (req, res) => {
  try {
    const qrCodeHash = req.params.hash;

    const report = await WasteReport.findOne({ qrCodeHash });

    if (!report) {
      return res.status(404).json({ message: 'QR code not found' });
    }

    // If QR code image doesn't exist, generate it
    if (!report.qrCodeImage) {
      const qrCodeDataUrl = await QRCode.toDataURL(qrCodeHash);
      report.qrCodeImage = qrCodeDataUrl;
      await report.save();
    }

    res.json({
      qrCodeHash: report.qrCodeHash,
      qrCodeImage: report.qrCodeImage,
      reportId: report._id
    });
  } catch (error) {
    console.error('Get QR code error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Collect waste (agent only)
 */
const collectWaste = async (req, res) => {
  try {
    const reportId = req.params.id;
    const agentId = req.agent._id;
    const userId = req.userId;

    // Find report
    const report = await WasteReport.findById(reportId);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (report.status !== 'reported') {
      return res.status(400).json({ message: 'Report has already been collected or processed' });
    }

    // Update report
    report.status = 'collected';
    report.assignedAgent = userId;
    report.collectionTime = new Date();

    await report.save();

    // Update agent stats
    await Agent.findOneAndUpdate(
      { user: userId },
      { $inc: { totalCollections: 1 } }
    );

    // If agent has wallet connected, collect on blockchain
    const agent = await User.findById(userId);
    if (agent.walletAddress && agent.isRegisteredOnChain) {
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

        // Collect waste on blockchain
        const tx = await wasteVanContract.collectWaste(
          report.qrCodeHash,
          { from: agent.walletAddress }
        );

        const receipt = await tx.wait();

        // Update report with blockchain info
        report.blockchainTxHash = receipt.hash;
        await report.save();
      } catch (error) {
        console.error('Blockchain collect error:', error);
        // Continue even if blockchain collect fails
      }
    }

    res.json({
      message: 'Waste collected successfully',
      report
    });
  } catch (error) {
    console.error('Collect waste error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Process waste (agent only)
 */
const processWaste = async (req, res) => {
  try {
    const reportId = req.params.id;
    const agentId = req.agent._id;
    const userId = req.userId;

    // Find report
    const report = await WasteReport.findById(reportId);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (report.status !== 'collected') {
      return res.status(400).json({
        message: report.status === 'reported'
          ? 'Report must be collected before processing'
          : 'Report has already been processed'
      });
    }

    if (report.assignedAgent.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only the assigned agent can process this waste' });
    }

    // Update report
    report.status = 'processed';
    report.processingTime = new Date();

    await report.save();

    // Update agent stats
    await Agent.findOneAndUpdate(
      { user: userId },
      { $inc: { totalProcessed: 1 } }
    );

    // If agent has wallet connected, process on blockchain
    const agent = await User.findById(userId);
    if (agent.walletAddress && agent.isRegisteredOnChain && report.reportId) {
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

        // Process waste on blockchain
        const tx = await wasteVanContract.processWaste(
          report.reportId,
          { from: agent.walletAddress }
        );

        const receipt = await tx.wait();

        // Update report with blockchain info
        report.blockchainTxHash = receipt.hash;
        await report.save();
      } catch (error) {
        console.error('Blockchain process error:', error);
        // Continue even if blockchain process fails
      }
    }

    res.json({
      message: 'Waste processed successfully',
      report
    });
  } catch (error) {
    console.error('Process waste error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get nearby waste reports (agent only)
 */
const getNearbyWasteReports = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 10, status = 'reported' } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({ message: 'Longitude and latitude are required' });
    }

    // Find nearby reports
    const reports = await WasteReport.find({
      status,
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
    .populate('user', 'username email walletAddress')
    .sort({ createdAt: -1 });

    res.json(reports);
  } catch (error) {
    console.error('Get nearby waste reports error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Check if any waste reports exist
 */
const checkReportsExist = async (req, res) => {
  try {
    console.log('Checking if any waste reports exist');

    // Count total reports
    const totalReports = await WasteReport.countDocuments();
    console.log(`Total reports in database: ${totalReports}`);

    // Get the most recent report for debugging
    const latestReport = await WasteReport.findOne().sort({ createdAt: -1 }).lean();

    if (latestReport) {
      console.log('Latest report:', {
        id: latestReport._id,
        status: latestReport.status,
        plasticType: latestReport.plasticType,
        createdAt: latestReport.createdAt
      });
    } else {
      console.log('No reports found in the database');
    }

    res.json({
      success: true,
      totalReports,
      hasReports: totalReports > 0,
      latestReport: latestReport ? {
        id: latestReport._id,
        status: latestReport.status,
        createdAt: latestReport.createdAt
      } : null
    });
  } catch (error) {
    console.error('Check reports exist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  reportWaste,
  getWasteReports,
  getWasteReportById,
  getQRCode,
  collectWaste,
  processWaste,
  getNearbyWasteReports,
  checkReportsExist
};
