const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  pointsPerKg: {
    PET: {
      type: Number,
      default: 10
    },
    HDPE: {
      type: Number,
      default: 15
    },
    PVC: {
      type: Number,
      default: 8
    },
    LDPE: {
      type: Number,
      default: 12
    },
    PP: {
      type: Number,
      default: 10
    },
    PS: {
      type: Number,
      default: 8
    },
    Other: {
      type: Number,
      default: 5
    }
  },
  systemPaused: {
    type: Boolean,
    default: false
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Update lastUpdated timestamp on save
settingsSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
