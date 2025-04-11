const mongoose = require('mongoose');

const wasteReportSchema = new mongoose.Schema({
  reportId: {
    type: Number, // Blockchain report ID
    unique: true,
    sparse: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  walletAddress: {
    type: String,
    index: true
  },
  plasticType: {
    type: String,
    enum: ['PET', 'HDPE', 'PVC', 'LDPE', 'PP', 'PS', 'Other'],
    required: true
  },
  quantity: {
    type: Number, // in grams
    required: true
  },
  qrCodeHash: {
    type: String,
    required: true,
    unique: true
  },
  qrCodeImage: {
    type: String // URL to QR code image
  },
  status: {
    type: String,
    enum: ['reported', 'collected', 'processed'],
    default: 'reported'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    },
    address: String
  },
  images: [{
    type: String // URLs to waste images
  }],
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reportTime: {
    type: Date,
    default: Date.now
  },
  collectionTime: Date,
  processingTime: Date,
  rewardAmount: Number,
  isRewardDistributed: {
    type: Boolean,
    default: false
  },
  blockchainTxHash: String, // Transaction hash for on-chain operations
  notes: String
}, { timestamps: true });

// Create index for geospatial queries
wasteReportSchema.index({ location: '2dsphere' });

const WasteReport = mongoose.model('WasteReport', wasteReportSchema);

module.exports = WasteReport;
