const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  walletAddress: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  pointBalance: {
    type: Number,
    default: 0
  },
  totalCollections: {
    type: Number,
    default: 0
  },
  totalProcessed: {
    type: Number,
    default: 0
  },
  serviceAreas: [{
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    },
    radius: {
      type: Number, // in kilometers
      default: 5
    },
    name: String
  }],
  verificationDocuments: [{
    type: String, // URLs to verification documents
    required: true
  }],
  rating: {
    average: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  isRegisteredOnChain: {
    type: Boolean,
    default: false
  },
  notes: String
}, { timestamps: true });

// Create index for geospatial queries
agentSchema.index({ 'serviceAreas.coordinates': '2dsphere' });

const Agent = mongoose.model('Agent', agentSchema);

module.exports = Agent;
