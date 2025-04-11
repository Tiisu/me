"use client"

import React, { useState, useContext, useEffect } from 'react';
import { EcoConnectContext } from '../../context/EcoConnect';
import { useRouter } from 'next/navigation';

const Login = () => {
  const {
    connectWallet,
    connectWalletForRegistration,
    currentAccount,
    wasteVanContract,
    isRegistered,
    isAgent,
    registerUser,
    registerAgent,
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
    // Create a flag to prevent multiple redirects
    let isRedirecting = false;

    const checkUserStatus = async () => {
      console.log('LoginRegister - Checking user status:', {
        user: user ? 'exists' : 'null',
        token: localStorage.getItem('token') ? 'exists' : 'null',
        currentAccount,
        isRegistered
      });

      // If already redirecting, don't do anything
      if (isRedirecting) {
        console.log('Already redirecting, skipping check');
        return;
      }

      // If user is already logged in with valid token, redirect to dashboard
      if (user && localStorage.getItem('token')) {
        // Verify token is valid before redirecting
        try {
          // Check if the user object has the required fields
          if (user.email && user.userType) {
            console.log('User is authenticated, redirecting to dashboard');
            isRedirecting = true;
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
        console.log('User is not authenticated with backend');
      }

      // If wallet is connected and registered on blockchain, but not in backend
      if (wasteVanContract && currentAccount && isRegistered && !user) {
        console.log('Wallet connected and registered on blockchain, showing registration form');
        // Show registration form
        setIsLogin(false);
      }
    };

    checkUserStatus();

    // Cleanup function to prevent memory leaks
    return () => {
      isRedirecting = true; // Prevent any further redirects if component unmounts
    };
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
      // For login, use the standard wallet connection flow
      if (isLogin) {
        try {
          await connectWallet();
        } catch (error) {
          // If wallet not found, suggest registration
          if (error.message && error.message.includes('Wallet not registered')) {
            setError('Wallet not registered. Please switch to the Register tab.');
          } else {
            throw error; // Re-throw other errors
          }
        }
      } else {
        // For registration, use the dedicated function that doesn't redirect
        await connectWalletForRegistration();
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      setError(error.message || 'Failed to connect wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // We now only use wallet login, so email login is removed

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

    // Wallet connection validation
    if (!currentAccount) {
      setError('Please connect your wallet before registering');
      return;
    }

    setLoading(true);
    console.log('Starting registration process with data:', {
      username,
      email,
      password: '******',
      userType,
      walletAddress: currentAccount
    });

    try {
      // Register with backend using validated data
      await registerWithBackend({
        username,
        email,
        password,
        userType,
        walletAddress: currentAccount
      });

      console.log('Backend registration successful');

      // Register on blockchain based on user type
      console.log('Registering on blockchain as:', userType);
      if (userType === 'agent') {
        await registerAgent();
        // Show message about pending approval
        alert('Your agent account has been created and is pending approval from administrators.');
      } else {
        await registerUser();
      }
      console.log('Blockchain registration successful');

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

        {isLogin ? (
          /* Login with wallet */
          <div className="space-y-6">
            <div className="text-center mb-4">
              <p className="text-gray-600">Login with your connected wallet to access your account</p>
            </div>

            <div className="mb-6">
              <button
                onClick={handleConnectWallet}
                disabled={loading || contextLoading}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center"
              >
                {loading || contextLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </>
                ) : currentAccount ? (
                  <>
                    <span className="mr-2">✓</span>
                    Connected: {`${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}`}
                  </>
                ) : (
                  'Connect Wallet to Login'
                )}
              </button>
            </div>

            {currentAccount && (
              <div className="text-center text-sm text-green-600">
                <p>Wallet connected! You will be redirected to your dashboard if your account is found.</p>
              </div>
            )}
          </div>
        ) : (
          /* Registration Form */
          <form onSubmit={handleRegister}>
            <div className="text-center mb-4">
              <p className="text-gray-600">First, connect your wallet to register</p>
            </div>

            {/* Connect wallet button for registration - now at the top */}
            <div className="mb-6">
              <button
                type="button"
                onClick={handleConnectWallet}
                disabled={loading || contextLoading}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center"
              >
                {loading || contextLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </>
                ) : currentAccount ? (
                  <>
                    <span className="mr-2">✓</span>
                    Connected: {`${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}`}
                  </>
                ) : (
                  'Connect Wallet to Register'
                )}
              </button>
            </div>

            {!currentAccount && (
              <div className="text-center text-sm text-amber-600 mb-6">
                <p>You must connect your wallet before you can register</p>
              </div>
            )}

            {currentAccount && (
              <>
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
                  {formData.userType === 'agent' && (
                    <p className="mt-2 text-sm text-amber-600">
                      Note: Agent accounts require approval from administrators.
                    </p>
                  )}
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading || contextLoading || !currentAccount || !formData.username || !formData.email || !formData.password}
              className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
            >
              {loading || contextLoading ? 'Registering...' :
               !currentAccount ? 'Connect Wallet to Register' :
               !formData.username || !formData.email || !formData.password ? 'Fill All Required Fields' :
               'Register'}
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
