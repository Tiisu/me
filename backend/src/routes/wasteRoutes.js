const express = require('express');
const { body } = require('express-validator');
const wasteController = require('../controllers/wasteController');
const authMiddleware = require('../middleware/authMiddleware');
const agentMiddleware = require('../middleware/agentMiddleware');

const router = express.Router();

// Validation middleware
const reportWasteValidation = [
  body('plasticType').isIn(['PET', 'HDPE', 'PVC', 'LDPE', 'PP', 'PS', 'Other']).withMessage('Invalid plastic type'),
  body('quantity').isNumeric().withMessage('Quantity must be a number')
];

// Routes for all authenticated users
router.post('/report', authMiddleware, reportWasteValidation, wasteController.reportWaste);
router.get('/reports', authMiddleware, wasteController.getWasteReports);
router.get('/reports/:id', authMiddleware, wasteController.getWasteReportById);
router.get('/qrcode/:hash', authMiddleware, wasteController.getQRCode);

// Routes for agents only
router.post('/collect/:id', authMiddleware, agentMiddleware, wasteController.collectWaste);
router.post('/process/:id', authMiddleware, agentMiddleware, wasteController.processWaste);
router.get('/nearby', authMiddleware, agentMiddleware, wasteController.getNearbyWasteReports);

module.exports = router;
