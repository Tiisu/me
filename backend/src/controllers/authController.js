const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Agent = require('../models/Agent');

/**
 * Register a new user
 */
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, userType, walletAddress } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Check if wallet address is already in use
    if (walletAddress) {
      const existingWallet = await User.findOne({ walletAddress });
      if (existingWallet) {
        return res.status(400).json({ message: 'This wallet address is already registered' });
      }
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      userType,
      walletAddress
    });

    await user.save();

    // If user is an agent, create agent record
    if (userType === 'agent') {
      const agent = new Agent({
        user: user._id,
        walletAddress,
        status: 'pending'
      });

      await agent.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        userType: user.userType,
        walletAddress: user.walletAddress,
        agentStatus: userType === 'agent' ? 'pending' : null
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Check if user is an agent and get agent status
    let agentStatus = null;
    if (user.userType === 'agent') {
      const agent = await Agent.findOne({ user: user._id });
      if (agent) {
        agentStatus = agent.status;
      }
    }

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        userType: user.userType,
        walletAddress: user.walletAddress,
        isRegisteredOnChain: user.isRegisteredOnChain,
        agentStatus
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Connect wallet address to user account
 */
const connectWallet = async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const userId = req.user._id;

    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address is required' });
    }

    // Check if wallet is already connected to another account
    const existingUser = await User.findOne({ walletAddress });
    if (existingUser && existingUser._id.toString() !== userId.toString()) {
      return res.status(400).json({ message: 'Wallet address already connected to another account' });
    }

    // Update user with wallet address
    const user = await User.findByIdAndUpdate(
      userId,
      { walletAddress },
      { new: true }
    );

    // If user is an agent, update agent record too
    if (user.userType === 'agent') {
      await Agent.findOneAndUpdate(
        { user: userId },
        { walletAddress },
        { new: true }
      );
    }

    res.json({
      message: 'Wallet connected successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        userType: user.userType,
        walletAddress: user.walletAddress
      }
    });
  } catch (error) {
    console.error('Connect wallet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Verify wallet ownership (placeholder - would use signature verification in production)
 */
const verifyWallet = async (req, res) => {
  try {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress || !signature || !message) {
      return res.status(400).json({ message: 'Wallet address, signature, and message are required' });
    }

    // In a real implementation, we would verify the signature here
    // For now, we'll just check if the wallet exists in our database

    const user = await User.findOne({ walletAddress });
    if (!user) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Check if user is an agent and get agent status
    let agentStatus = null;
    if (user.userType === 'agent') {
      const agent = await Agent.findOne({ user: user._id });
      if (agent) {
        agentStatus = agent.status;

        // If agent is not approved, deny login
        if (agentStatus !== 'approved') {
          return res.status(403).json({
            message: 'Your agent account is pending approval. Please wait for an administrator to approve your account.',
            agentStatus
          });
        }
      }
    }

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        userType: user.userType,
        walletAddress: user.walletAddress,
        isRegisteredOnChain: user.isRegisteredOnChain,
        agentStatus
      }
    });
  } catch (error) {
    console.error('Verify wallet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a user
 */
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Find and delete the user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user is an agent, delete agent record too
    if (user.userType === 'agent') {
      await Agent.deleteOne({ user: userId });
    }

    // Delete the user
    await User.deleteOne({ _id: userId });

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  connectWallet,
  verifyWallet,
  deleteUser
};
