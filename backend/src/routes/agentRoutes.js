const express = require('express');
const agentController = require('../controllers/agentController');
const authMiddleware = require('../middleware/authMiddleware');
const agentMiddleware = require('../middleware/agentMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

// Routes for agents
router.get('/profile', authMiddleware, agentMiddleware, agentController.getAgentProfile);
router.put('/profile', authMiddleware, agentMiddleware, agentController.updateAgentProfile);
router.get('/statistics', authMiddleware, agentMiddleware, agentController.getAgentStatistics);
router.post('/service-area', authMiddleware, agentMiddleware, agentController.addServiceArea);
router.delete('/service-area/:id', authMiddleware, agentMiddleware, agentController.removeServiceArea);

// Routes for agent registration
router.post('/register', authMiddleware, agentController.registerAsAgent);
router.post('/upload-documents', authMiddleware, agentController.uploadVerificationDocuments);

// Admin routes for managing agents
router.get('/pending', adminMiddleware, agentController.getPendingAgents);
router.put('/:id/approve', adminMiddleware, agentController.approveAgent);
router.put('/:id/reject', adminMiddleware, agentController.rejectAgent);
router.get('/all', adminMiddleware, agentController.getAllAgents);

module.exports = router;
