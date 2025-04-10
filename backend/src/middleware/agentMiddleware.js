const Agent = require('../models/Agent');

/**
 * Middleware to verify if the authenticated user is an approved agent
 */
const agentMiddleware = async (req, res, next) => {
  try {
    // Check if user exists (should be attached by authMiddleware)
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Find agent by user ID
    const agent = await Agent.findOne({ user: req.userId });
    
    // Check if agent exists and is approved
    if (!agent) {
      return res.status(403).json({ message: 'Agent profile not found' });
    }
    
    if (agent.status !== 'approved') {
      return res.status(403).json({ message: 'Agent not approved' });
    }
    
    // Attach agent to request object
    req.agent = agent;
    
    next();
  } catch (error) {
    console.error('Agent middleware error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = agentMiddleware;
