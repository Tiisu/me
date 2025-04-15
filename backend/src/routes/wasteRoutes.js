const express = require('express');
const { body } = require('express-validator');
const wasteController = require('../controllers/wasteController');
const authMiddleware = require('../middleware/authMiddleware');
const agentMiddleware = require('../middleware/agentMiddleware');

const router = express.Router();

// Validation middleware
const reportWasteValidation = [
  body('plasticType').custom(value => {
    // Accept both string values and numeric values (0-6)
    const validStrings = ['PET', 'HDPE', 'PVC', 'LDPE', 'PP', 'PS', 'Other'];
    const validNumbers = [0, 1, 2, 3, 4, 5, 6];

    // Convert to number if it's a string that looks like a number
    const numValue = !isNaN(value) ? Number(value) : -1;

    return validStrings.includes(value) || validNumbers.includes(numValue);
  }).withMessage('Invalid plastic type'),
  body('quantity').isNumeric().withMessage('Quantity must be a number')
];

// Routes for all authenticated users
router.post('/report', authMiddleware, reportWasteValidation, wasteController.reportWaste);
router.get('/reports', authMiddleware, wasteController.getWasteReports);
router.get('/reports/:id', authMiddleware, wasteController.getWasteReportById);
router.get('/qrcode/:hash', authMiddleware, wasteController.getQRCode);
router.get('/check-reports', authMiddleware, wasteController.checkReportsExist); // New endpoint

// Routes for agents only
router.post('/collect/:id', authMiddleware, agentMiddleware, wasteController.collectWaste);
router.post('/process/:id', authMiddleware, agentMiddleware, wasteController.processWaste);
router.get('/nearby', authMiddleware, agentMiddleware, wasteController.getNearbyWasteReports);

module.exports = router;
