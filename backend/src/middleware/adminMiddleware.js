// Admin credentials
const ADMIN_USERNAME = 'Tiisu';
const ADMIN_PASSWORD = 'Ghana';

/**
 * Middleware to verify if the authenticated user is an admin
 */
const adminMiddleware = async (req, res, next) => {
  try {
    // Get admin credentials from request headers
    const adminUsername = req.headers['admin-username'];
    const adminPassword = req.headers['admin-password'];

    // Check if admin credentials are provided
    if (!adminUsername || !adminPassword) {
      return res.status(401).json({ message: 'Admin credentials required' });
    }

    // Verify admin credentials
    if (adminUsername === ADMIN_USERNAME && adminPassword === ADMIN_PASSWORD) {
      // Admin credentials are valid
      return next();
    }

    // If we get here, the admin credentials are invalid
    return res.status(403).json({ message: 'Invalid admin credentials' });
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = adminMiddleware;
