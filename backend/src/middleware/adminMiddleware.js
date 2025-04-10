/**
 * Middleware to verify if the authenticated user is an admin
 */
const adminMiddleware = (req, res, next) => {
  try {
    // Check if user exists (should be attached by authMiddleware)
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Check if user is an admin
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = adminMiddleware;
