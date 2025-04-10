"use client"

import React, { useState, useContext, useEffect } from 'react';
import { EcoConnectContext } from '../../context/EcoConnect';
import { useRouter } from 'next/navigation';

const Login = () => {
  const {
    connectWallet,
    currentAccount,
    wasteVanContract,
    isRegistered,
    isAgent,
    registerUser,
    registerAgent,
    login,
    registerWithBackend,
    user,
    loading: contextLoading
  } = useContext(EcoConnectContext);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    userType: 'regular'
  });

  // Check if already connected and registered
  useEffect(() => {
    const checkUserStatus = async () => {
      console.log('Checking user status:', {
        user: user ? 'exists' : 'null',
        token: localStorage.getItem('token') ? 'exists' : 'null',
        currentAccount,
        isRegistered
      });

      // If user is already logged in with valid token, redirect to dashboard
      if (user && localStorage.getItem('token')) {
        // Verify token is valid before redirecting
        try {
          // Check if the user object has the required fields
          if (user.email && user.userType) {
            console.log('User is authenticated, redirecting to dashboard');
            router.push(user.userType === 'agent' ? '/agentDashboard' : '/userDashboard');
            return;
          } else {
            console.log('User object is invalid:', user);
            throw new Error('Invalid user object');
          }
        } catch (error) {
          console.error('Error verifying user session:', error);
          // If verification fails, clear the invalid session
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      } else {
        console.log('User is not authenticated');
      }

      // If wallet is connected and registered on blockchain, but not in backend
      if (wasteVanContract && currentAccount && isRegistered && !user) {
        console.log('Wallet connected and registered on blockchain, showing registration form');
        // Show registration form
        setIsLogin(false);
      }
    };

    checkUserStatus();
  }, [currentAccount, wasteVanContract, isRegistered, isAgent, router, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUserTypeChange = (type) => {
    setFormData(prev => ({ ...prev, userType: type }));
    localStorage.setItem('userType', type);
  };

  const handleConnectWallet = async () => {
    if (loading || contextLoading) return;

    setLoading(true);
    setError('');

    try {
      // Connect wallet - this will redirect to registration if needed
      await connectWallet();
    } catch (error) {
      console.error('Wallet connection error:', error);
      setError(error.message || 'Failed to connect wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (loading || contextLoading) return;

    // Form validation
    const { email, password } = formData;

    // Clear previous errors
    setError('');

    // Validate inputs
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Password length validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    console.log('Attempting login with:', { email, password: '******' });

    try {
      // Attempt login with validated credentials
      await login(email, password);
      console.log('Login successful, redirect should happen automatically');
      // Redirect is handled in the login function
    } catch (error) {
      console.error('Login error in component:', error);
      // Display the error message
      setError(error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading || contextLoading) return;

    // Form validation
    const { username, email, password, userType } = formData;

    // Clear previous errors
    setError('');

    // Validate inputs
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    // Username validation
    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Password length validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    console.log('Starting registration process with data:', { username, email, password: '******', userType });

    try {
      // Register with backend using validated data
      await registerWithBackend({
        username,
        email,
        password,
        userType
      });

      console.log('Backend registration successful');

      // If wallet is connected, register on blockchain
      if (currentAccount && wasteVanContract) {
        console.log('Registering on blockchain as:', userType);
        if (userType === 'agent') {
          await registerAgent();
        } else {
          await registerUser();
        }
        console.log('Blockchain registration successful');
      }

      // Redirect will happen in the registerWithBackend function
      console.log('Registration complete, redirect should happen automatically');
    } catch (error) {
      console.error('Registration error in component:', error);
      // Display the error message
      setError(error.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-green-600">
          {isLogin ? 'Login' : 'Register'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Toggle between login and register */}
        <div className="mb-6 flex">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 rounded-l-md ${isLogin ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 rounded-r-md ${!isLogin ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
          >
            Register
          </button>
        </div>

        {/* Connect with wallet button */}
        <div className="mb-6">
          <button
            onClick={handleConnectWallet}
            disabled={loading || contextLoading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {loading || contextLoading ? 'Connecting...' : 'Connect with Wallet'}
          </button>
        </div>

        <div className="mb-6 text-center">
          <span className="text-gray-500">OR</span>
        </div>

        {/* Login Form */}
        {isLogin ? (
          <form onSubmit={handleEmailLogin}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || contextLoading}
              className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
            >
              {loading || contextLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          /* Registration Form */
          <form onSubmit={handleRegister}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Choose a username"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Create a password"
                required
              />
            </div>

            <div className="mb-6">
              <p className="text-gray-700 text-sm font-bold mb-2">User Type</p>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => handleUserTypeChange('regular')}
                  className={`flex-1 py-2 px-4 rounded-md ${formData.userType === 'agent' ? 'bg-gray-200' : 'bg-green-600 text-white'}`}
                >
                  Regular User
                </button>
                <button
                  type="button"
                  onClick={() => handleUserTypeChange('agent')}
                  className={`flex-1 py-2 px-4 rounded-md ${formData.userType === 'agent' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
                >
                  Agent
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || contextLoading}
              className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
            >
              {loading || contextLoading ? 'Registering...' : 'Register'}
            </button>
          </form>
        )}

        <div className="mt-4 text-center text-sm text-gray-600">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-green-600 hover:underline"
            >
              {isLogin ? 'Register' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default function AuthPages() {
  return <Login />;
}
