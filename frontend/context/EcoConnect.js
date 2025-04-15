'use client';

import React, { useState, createContext, useEffect } from "react";
import { ethers } from "ethers";
import { useRouter } from 'next/navigation';
import api, { auth } from '../services/api';
import InsufficientFundsModal from '../components/shared/InsufficientFundsModal';
import RegistrationRequiredModal from '../components/shared/RegistrationRequiredModal';
import AgentApprovalNotification from '../components/shared/AgentApprovalNotification';
import {
  WASTE_VAN_ADDRESS,
  WASTE_VAN_TOKEN_ADDRESS,
  WASTE_VAN_ABI,
  WASTE_VAN_TOKEN_ABI,
  UserType,
  AgentStatus,
  WasteStatus,
  PlasticType
} from './Constants';

export const EcoConnectContext = createContext({
  connectWallet: async () => {},
  connectWalletInternal: async () => {},
  connectWalletForRegistration: async () => {}, // New function specifically for registration
  currentAccount: "",
  loading: false,
  wasteVanContract: null,
  wasteVanTokenContract: null,
  provider: null,
  signer: null,
  userType: null,
  isRegistered: false,
  isAgent: false,
  agentStatus: null,
  user: null,
  token: null,
  registerUser: async () => {},
  registerAgent: async () => {},
  reportWaste: async () => {},
  collectWaste: async () => {},
  processWaste: async () => {},
  purchasePoints: async () => {}, // New function for purchasing points
  getWasteReportsByStatus: async () => {},
  getUserTokenBalance: async () => {},
  getAgentStats: async () => {},
  getPointCost: async () => {}, // New function to get the current point cost
  login: async () => {},
  logout: async () => {},
  registerWithBackend: async () => {},
  showInsufficientFundsModal: false,
  setShowInsufficientFundsModal: () => {},
  showRegistrationRequiredModal: false,
  setShowRegistrationRequiredModal: () => {},
  showAgentApprovalNotification: false,
  setShowAgentApprovalNotification: () => {},
});

export const EcoConnectProvider = ({ children }) => {
  const router = useRouter();
  const [currentAccount, setCurrentAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [wasteVanContract, setWasteVanContract] = useState(null);
  const [wasteVanTokenContract, setWasteVanTokenContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [userType, setUserType] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [agentStatus, setAgentStatus] = useState(null);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // Modal states
  const [showInsufficientFundsModal, setShowInsufficientFundsModal] = useState(false);
  const [showRegistrationRequiredModal, setShowRegistrationRequiredModal] = useState(false);
  const [showAgentApprovalNotification, setShowAgentApprovalNotification] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuthentication = async () => {
      console.log('EcoConnect - Checking authentication');
      // Check for token in localStorage
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (savedToken && savedUser) {
        console.log('Found saved token and user in localStorage');
        try {
          const userData = JSON.parse(savedUser);

          // Validate user data
          if (!userData.email || !userData.userType) {
            console.error('Invalid user data in localStorage');
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            return;
          }

          setToken(savedToken);
          setUser(userData);

          // Set user type and registration status based on saved user
          setUserType(userData.userType);
          setIsRegistered(true);
          setIsAgent(userData.userType === 'agent');
          if (userData.userType === 'agent') {
            setAgentStatus(userData.agentStatus);
          }

          console.log('User authenticated from localStorage:', userData.email);

          // If user has wallet address, check blockchain status
          if (userData.walletAddress && window.ethereum) {
            try {
              const accounts = await window.ethereum.request({ method: 'eth_accounts' });
              if (accounts.length > 0 && accounts[0].toLowerCase() === userData.walletAddress.toLowerCase()) {
                console.log('Connecting wallet that matches user account');
                await connectWalletInternal(accounts[0]);
              }
            } catch (error) {
              console.error("Failed to check wallet connection:", error);
            }
          }
        } catch (error) {
          console.error('Error parsing user data from localStorage:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      } else if (window.ethereum) {
        // If no token but wallet is connected, just connect wallet
        console.log('No saved authentication, checking for connected wallet');
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            console.log('Found connected wallet:', accounts[0]);
            await connectWalletInternal(accounts[0]);
          }
        } catch (error) {
          console.error("Failed to check wallet connection:", error);
        }
      }
    };

    checkAuthentication();
  }, []);

  // Function to check user registration status
  const checkUserStatus = async (contract, address, skipRedirect = false) => {
    try {
      // Check if user is authenticated with backend
      const isBackendAuthenticated = localStorage.getItem('token') && localStorage.getItem('user');

      // Default to backend authentication if available
      let isUserRegistered = isBackendAuthenticated;
      let isUserAgent = false;

      // Try to get blockchain status if contract and address are available
      if (contract && address) {
        try {
          const user = await contract.users(address);
          // Update with blockchain status
          isUserRegistered = isUserRegistered || user.isRegistered;
          isUserAgent = user.userType === UserType.Agent;

          // Only update state if we're not in the registration process
          if (!skipRedirect) {
            setIsRegistered(isUserRegistered);
            setIsAgent(isUserAgent);

            if (isUserAgent) {
              // Get agent status from blockchain
              const agent = await contract.agents(address);
              setAgentStatus(agent.status);
              console.log('Agent status from blockchain:', agent.status);
            } else {
              // Check if we have agent status from backend
              try {
                const userData = JSON.parse(localStorage.getItem('user'));
                if (userData && userData.userType === 'agent' && userData.agentStatus) {
                  console.log('Agent status from backend:', userData.agentStatus);
                  // If backend says user is an agent, trust that
                  setIsAgent(true);
                  setAgentStatus(userData.agentStatus);
                }
              } catch (error) {
                console.error('Error parsing user data for agent status:', error);
              }
            }
          }
        } catch (contractError) {
          console.warn("Error checking blockchain user status:", contractError);
          console.log("Falling back to backend authentication status");

          // Only update state if we're not in the registration process
          if (!skipRedirect) {
            setIsRegistered(isBackendAuthenticated);

            // Check if we have agent status from backend
            try {
              const userData = JSON.parse(localStorage.getItem('user'));
              if (userData && userData.userType === 'agent') {
                console.log('Agent status from backend (fallback):', userData.agentStatus);
                setIsAgent(true);
                setAgentStatus(userData.agentStatus);
              }
            } catch (error) {
              console.error('Error parsing user data for agent status (fallback):', error);
            }
          }
        }
      } else if (!skipRedirect) {
        // If no contract or address, just use backend authentication
        setIsRegistered(isBackendAuthenticated);

        // Check if we have agent status from backend
        try {
          const userData = JSON.parse(localStorage.getItem('user'));
          if (userData && userData.userType === 'agent') {
            console.log('Agent status from backend (no contract):', userData.agentStatus);
            setIsAgent(true);
            setAgentStatus(userData.agentStatus);
          }
        } catch (error) {
          console.error('Error parsing user data for agent status (no contract):', error);
        }
      }

      // Return the status
      return {
        isRegistered: isUserRegistered,
        isAgent: isUserAgent
      };
    } catch (error) {
      console.error("Error in checkUserStatus:", error);
    }

    // Default fallback
    const fallbackIsRegistered = localStorage.getItem('token') && localStorage.getItem('user');

    if (!skipRedirect) {
      setIsRegistered(fallbackIsRegistered);
    }

    return {
      isRegistered: fallbackIsRegistered,
      isAgent: false
    };
  };

  // Function specifically for registration - just connects wallet without any redirects or checks
  const connectWalletForRegistration = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this application");
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please make sure MetaMask is unlocked.");
      }

      const userAddress = accounts[0];

      // Just set the current account without any other checks or redirects
      setCurrentAccount(userAddress);

      return userAddress;
    } catch (error) {
      console.error("Failed to connect wallet for registration:", error);
      throw error;
    }
  };

  // Internal function to connect wallet without checking backend
  const connectWalletInternal = async (address, skipRedirect = false) => {
    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this application");
      }

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await web3Provider.getSigner();
      const userAddress = address || await signer.getAddress();

      // Initialize contracts
      const wasteVanContract = new ethers.Contract(
        WASTE_VAN_ADDRESS,
        WASTE_VAN_ABI,
        signer
      );

      const wasteVanTokenContract = new ethers.Contract(
        WASTE_VAN_TOKEN_ADDRESS,
        WASTE_VAN_TOKEN_ABI,
        signer
      );

      setProvider(web3Provider);
      setSigner(signer);
      setCurrentAccount(userAddress);
      setWasteVanContract(wasteVanContract);
      setWasteVanTokenContract(wasteVanTokenContract);

      // Check if user is registered on blockchain
      // Pass skipRedirect to prevent state updates during registration
      const status = await checkUserStatus(wasteVanContract, userAddress, skipRedirect);

      return userAddress;
    } catch (error) {
      console.error("Failed to connect wallet internally:", error);
      throw error;
    }
  };

  // Public function to connect wallet and check backend
  const connectWallet = async () => {
    try {
      setLoading(true);

      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this application");
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const userAddress = accounts[0];
      await connectWalletInternal(userAddress);

      // Check if wallet is registered in backend
      try {
        const response = await api.auth.verifyWallet(userAddress, 'placeholder-signature', 'placeholder-message');

        // If successful, set user and token
        setUser(response.user);
        setToken(response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('token', response.token);

        // Set user type and registration status
        setUserType(response.user.userType);
        setIsRegistered(true);
        setIsAgent(response.user.userType === 'agent');
        if (response.user.userType === 'agent') {
          setAgentStatus(response.user.agentStatus);
        }

        // Check if user is registered on blockchain and register if not
        if (wasteVanContract) {
          try {
            console.log('Checking blockchain registration status...');
            const user = await wasteVanContract.users(userAddress);

            if (!user.isRegistered) {
              console.log('User not registered on blockchain. Attempting to register...');

              if (response.user.userType === 'agent') {
                // For agents, we need to check if they have enough points
                console.log('Registering as agent on blockchain...');
                try {
                  // Get the point cost and minimum points required
                  const pointCost = await wasteVanContract.pointCost();
                  const minAgentPoints = await wasteVanContract.MIN_AGENT_POINTS();

                  // Calculate required ETH
                  const requiredEth = pointCost * minAgentPoints;

                  const tx = await wasteVanContract.registerAgent({ value: requiredEth });
                  await tx.wait();
                  console.log('Successfully registered as agent on blockchain');

                  // Verify registration was successful
                  const userCheck = await wasteVanContract.users(userAddress);
                  if (!userCheck.isRegistered) {
                    throw new Error('Blockchain registration verification failed. User still not registered.');
                  }
                  console.log('Agent blockchain registration verified successfully!');
                } catch (agentError) {
                  console.error('Failed to register as agent on blockchain:', agentError);
                  console.log('Continuing with regular user registration on blockchain...');

                  // Fall back to regular user registration
                  const tx = await wasteVanContract.registerUser();
                  await tx.wait();
                  console.log('Successfully registered as regular user on blockchain');

                  // Verify registration was successful
                  const userCheck = await wasteVanContract.users(userAddress);
                  if (!userCheck.isRegistered) {
                    throw new Error('Blockchain registration verification failed. User still not registered.');
                  }
                  console.log('Regular user blockchain registration verified successfully!');
                }
              } else {
                // Regular user registration
                console.log('Registering as regular user on blockchain...');
                const tx = await wasteVanContract.registerUser();
                await tx.wait();
                console.log('Successfully registered as regular user on blockchain');

                // Verify registration was successful
                const userCheck = await wasteVanContract.users(userAddress);
                if (!userCheck.isRegistered) {
                  throw new Error('Blockchain registration verification failed. User still not registered.');
                }
                console.log('Regular user blockchain registration verified successfully!');
              }

              // Update user status
              await checkUserStatus(wasteVanContract, userAddress);

              // Double-check registration status
              const finalCheck = await wasteVanContract.users(userAddress);
              if (!finalCheck.isRegistered) {
                console.error('User still not registered on blockchain after registration attempt.');
                alert('Warning: Blockchain registration failed. Some features may be limited.');
              } else {
                console.log('Final verification: User successfully registered on blockchain!');
              }
            } else {
              console.log('User already registered on blockchain');
            }
          } catch (blockchainError) {
            console.error('Error checking/updating blockchain registration:', blockchainError);
            console.log('Continuing with backend-only login');
          }
        }

        // Check agent status before redirecting
        if (response.user.userType === 'agent') {
          // If agent is not approved, show notification and stay on login page
          if (response.user.agentStatus === 'pending') {
            setAgentStatus('pending');

            // Show agent status notification
            const message = 'Your agent account is pending approval from administrators.';
            console.log('Agent status: pending', message);

            // Use our AgentApprovalStatus component
            const agentStatusElement = document.createElement('div');
            agentStatusElement.id = 'agent-status-notification';
            agentStatusElement.innerHTML = `
              <div class="fixed bottom-4 right-4 max-w-md p-4 rounded-lg shadow-lg border bg-yellow-50 border-yellow-200 text-yellow-800">
                <div class="flex items-start">
                  <div class="flex-1">
                    <h3 class="font-medium text-lg">Agent Account Pending Approval</h3>
                    <p class="mt-1">${message}</p>
                    <button class="mt-3 px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            `;

            // Remove any existing notification
            const existingNotification = document.getElementById('agent-status-notification');
            if (existingNotification) {
              existingNotification.remove();
            }

            // Add the notification to the body
            document.body.appendChild(agentStatusElement);

            // Add event listener to the dismiss button
            const dismissButton = agentStatusElement.querySelector('button');
            if (dismissButton) {
              dismissButton.addEventListener('click', () => {
                agentStatusElement.remove();
              });
            }

            // Auto-remove after 10 seconds
            setTimeout(() => {
              if (document.body.contains(agentStatusElement)) {
                agentStatusElement.remove();
              }
            }, 10000);

            // Stay on login page
            router.push('/loginRegister');
          } else if (response.user.agentStatus === 'rejected') {
            // If agent is rejected, show notification and stay on login page
            setAgentStatus('rejected');

            // Show agent status notification
            const message = 'Your agent application has been rejected. Please contact support for more information.';
            console.log('Agent status: rejected', message);

            // Use our AgentApprovalStatus component
            const agentStatusElement = document.createElement('div');
            agentStatusElement.id = 'agent-status-notification';
            agentStatusElement.innerHTML = `
              <div class="fixed bottom-4 right-4 max-w-md p-4 rounded-lg shadow-lg border bg-red-50 border-red-200 text-red-800">
                <div class="flex items-start">
                  <div class="flex-1">
                    <h3 class="font-medium text-lg">Agent Account Rejected</h3>
                    <p class="mt-1">${message}</p>
                    <button class="mt-3 px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            `;

            // Remove any existing notification
            const existingNotification = document.getElementById('agent-status-notification');
            if (existingNotification) {
              existingNotification.remove();
            }

            // Add the notification to the body
            document.body.appendChild(agentStatusElement);

            // Add event listener to the dismiss button
            const dismissButton = agentStatusElement.querySelector('button');
            if (dismissButton) {
              dismissButton.addEventListener('click', () => {
                agentStatusElement.remove();
              });
            }

            // Auto-remove after 10 seconds
            setTimeout(() => {
              if (document.body.contains(agentStatusElement)) {
                agentStatusElement.remove();
              }
            }, 10000);

            // Stay on login page
            router.push('/loginRegister');
          } else {
            // Agent is approved, redirect to agent dashboard
            router.push('/agentDashboard');
          }
        } else {
          // Regular user, redirect to user dashboard
          router.push('/userDashboard');
        }
      } catch (error) {
        console.error("Wallet verification error:", error);

        // Check if this is an agent approval error
        if (error.response && error.response.status === 403 &&
            error.response.data && error.response.data.agentStatus) {
          // This is an agent waiting for approval
          setAgentStatus(error.response.data.agentStatus);

          // Show a more user-friendly notification instead of alert
          const message = error.response.data.message || 'Your agent account is pending approval';
          console.log('Agent status:', error.response.data.agentStatus, message);

          // Create a notification element to show the agent status
          const agentStatusElement = document.createElement('div');
          agentStatusElement.id = 'agent-status-notification';
          agentStatusElement.innerHTML = `
            <div class="fixed bottom-4 right-4 max-w-md p-4 rounded-lg shadow-lg border bg-yellow-50 border-yellow-200 text-yellow-800">
              <div class="flex items-start">
                <div class="flex-1">
                  <h3 class="font-medium text-lg">Agent Account Pending Approval</h3>
                  <p class="mt-1">${message}</p>
                  <button class="mt-3 px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400">
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          `;

          // Remove any existing notification
          const existingNotification = document.getElementById('agent-status-notification');
          if (existingNotification) {
            existingNotification.remove();
          }

          // Add the notification to the body
          document.body.appendChild(agentStatusElement);

          // Add event listener to the dismiss button
          const dismissButton = agentStatusElement.querySelector('button');
          if (dismissButton) {
            dismissButton.addEventListener('click', () => {
              agentStatusElement.remove();
            });
          }

          // Auto-remove after 10 seconds
          setTimeout(() => {
            if (document.body.contains(agentStatusElement)) {
              agentStatusElement.remove();
            }
          }, 10000);

          router.push('/loginRegister');
        } else if (error.response && error.response.status === 404) {
          // If wallet not registered in backend, redirect to registration
          console.log("Wallet not registered in backend, redirecting to registration");
          router.push('/loginRegister');
          return userAddress; // Return address but don't throw error
        } else {
          // Other errors
          const errorMsg = 'Error connecting wallet: ' + (error.response?.data?.message || error.message || 'Unknown error');
          console.error(errorMsg);
          router.push('/loginRegister');
          return userAddress; // Return address but don't throw error
        }
      }

      return userAddress;
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Handle account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length > 0) {
          // Clear current session
          logout();

          // Connect new wallet
          await connectWallet();
        } else {
          // Clear everything if wallet disconnected
          logout();
        }
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, []);

  // Logout function
  const logout = () => {
    setCurrentAccount("");
    setWasteVanContract(null);
    setWasteVanTokenContract(null);
    setSigner(null);
    setIsRegistered(false);
    setIsAgent(false);
    setAgentStatus(null);
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    router.push('/');
  };

  // Login with email/password
  const login = async (email, password) => {
    try {
      setLoading(true);

      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Make the API call
      let response;
      try {
        response = await api.auth.login({ email, password });
      } catch (apiError) {
        console.error('API error:', apiError);
        if (apiError.response && apiError.response.data) {
          throw new Error(apiError.response.data.message || 'Login failed');
        } else {
          throw new Error('Network error. Please check your connection.');
        }
      }

      // Validate response
      if (!response || !response.user || !response.token) {
        throw new Error('Invalid response from server');
      }

      console.log('Login successful:', response);

      // Set user and token
      setUser(response.user);
      setToken(response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('token', response.token);

      // Set user type and registration status
      setUserType(response.user.userType);
      setIsRegistered(true);
      setIsAgent(response.user.userType === 'agent');
      if (response.user.userType === 'agent') {
        setAgentStatus(response.user.agentStatus);
      }

      // If user has wallet address, connect it
      if (response.user.walletAddress && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0 && accounts[0].toLowerCase() === response.user.walletAddress.toLowerCase()) {
            await connectWalletInternal(accounts[0]);

            // Check if user is registered on blockchain and register if not
            if (wasteVanContract) {
              try {
                console.log('Checking blockchain registration status...');
                const user = await wasteVanContract.users(accounts[0]);

                if (!user.isRegistered) {
                  console.log('User not registered on blockchain. Attempting to register...');

                  if (response.user.userType === 'agent') {
                    // For agents, we need to check if they have enough points
                    console.log('Registering as agent on blockchain...');
                    try {
                      // Get the point cost and minimum points required
                      const pointCost = await wasteVanContract.pointCost();
                      const minAgentPoints = await wasteVanContract.MIN_AGENT_POINTS();

                      // Calculate required ETH
                      const requiredEth = pointCost * minAgentPoints;

                      const tx = await wasteVanContract.registerAgent({ value: requiredEth });
                      await tx.wait();
                      console.log('Successfully registered as agent on blockchain');
                    } catch (agentError) {
                      console.error('Failed to register as agent on blockchain:', agentError);
                      console.log('Continuing with regular user registration on blockchain...');

                      // Fall back to regular user registration
                      const tx = await wasteVanContract.registerUser();
                      await tx.wait();
                      console.log('Successfully registered as regular user on blockchain');
                    }
                  } else {
                    // Regular user registration
                    console.log('Registering as regular user on blockchain...');
                    const tx = await wasteVanContract.registerUser();
                    await tx.wait();
                    console.log('Successfully registered as regular user on blockchain');
                  }

                  // Update user status
                  await checkUserStatus(wasteVanContract, accounts[0]);
                } else {
                  console.log('User already registered on blockchain');
                }
              } catch (blockchainError) {
                console.error('Error checking/updating blockchain registration:', blockchainError);
                console.log('Continuing with backend-only login');
              }
            }
          }
        } catch (error) {
          console.error("Failed to connect wallet after login:", error);
        }
      }

      // Redirect to appropriate dashboard
      console.log('Redirecting to dashboard...');
      router.push(response.user.userType === 'agent' ? '/agentDashboard' : '/userDashboard');

      return response.user;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register with backend
  const registerWithBackend = async (userData) => {
    try {
      setLoading(true);

      // Validate user data
      if (!userData.username || !userData.email || !userData.password) {
        throw new Error('All fields are required');
      }

      // Validate wallet address for registration
      if (!userData.walletAddress) {
        throw new Error('Wallet connection is required for registration');
      }

      console.log('Registering user with data:', {
        ...userData,
        password: '******',
        walletAddress: userData.walletAddress
      });

      // Make the API call with wallet address included
      let response;
      try {
        response = await api.auth.register(userData);
      } catch (apiError) {
        console.error('API error during registration:', apiError);
        if (apiError.response && apiError.response.data) {
          throw new Error(apiError.response.data.message || 'Registration failed');
        } else {
          throw new Error('Network error. Please check your connection.');
        }
      }

      if (!response || !response.user || !response.token) {
        throw new Error('Invalid response from server');
      }

      console.log('Registration successful:', response);

      // Set user and token
      setUser(response.user);
      setToken(response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('token', response.token);

      // Set user type and registration status
      setUserType(response.user.userType);
      setIsRegistered(true);
      setIsAgent(response.user.userType === 'agent');

      // Set agent status if applicable
      if (response.user.userType === 'agent') {
        setAgentStatus(response.user.agentStatus || 'pending');
      }

      // Check user's balance before attempting blockchain registration
      console.log('Checking user balance before blockchain registration...');
      try {
        if (wasteVanContract && provider) {
          // Get user's balance
          const balance = await provider.getBalance(currentAccount);
          console.log('User balance:', ethers.formatEther(balance), 'ETH');

          // Estimate gas for registration (regular user)
          let estimatedGas;
          try {
            estimatedGas = await wasteVanContract.registerUser.estimateGas();
            console.log('Estimated gas for registration:', estimatedGas.toString());
          } catch (gasError) {
            console.error('Failed to estimate gas:', gasError);
            estimatedGas = ethers.parseEther('0.01'); // Fallback estimate
          }

          // Check if user has enough balance for gas
          if (balance < estimatedGas) {
            console.error('Insufficient funds for blockchain registration');

            // Clean up backend registration since blockchain registration will fail
            await api.auth.deleteUser(response.user._id);

            // Clear user data
            setUser(null);
            setToken(null);
            setIsRegistered(false);
            setIsAgent(false);
            localStorage.removeItem('user');
            localStorage.removeItem('token');

            // Disconnect wallet
            setCurrentAccount("");
            setWasteVanContract(null);
            setWasteVanTokenContract(null);
            setSigner(null);

            // Show beautiful modal
            setShowInsufficientFundsModal(true);

            // Redirect to home page after a short delay
            setTimeout(() => {
              router.push('/');
            }, 1500);

            return null;
          }

          // Register on blockchain
          console.log('Attempting to register on blockchain...');
          if (response.user.userType === 'agent') {
            // For agents, we need to check if they have enough points
            console.log('Registering as agent on blockchain...');
            try {
              // Get the point cost and minimum points required
              const pointCost = await wasteVanContract.pointCost();
              const minAgentPoints = await wasteVanContract.MIN_AGENT_POINTS();

              // Calculate required ETH
              const requiredEth = pointCost * minAgentPoints;

              // Check if user has enough balance for agent registration
              if (balance < requiredEth.add(estimatedGas)) {
                console.error('Insufficient funds for agent registration');
                console.log('Falling back to regular user registration...');

                // Fall back to regular user registration
                const tx = await wasteVanContract.registerUser();
                await tx.wait();
                console.log('Successfully registered as regular user on blockchain');

                // Verify registration was successful
                const user = await wasteVanContract.users(currentAccount);
                if (!user.isRegistered) {
                  throw new Error('Blockchain registration verification failed. User still not registered.');
                }
                console.log('Regular user blockchain registration verified successfully!');
              } else {
                // Proceed with agent registration
                const tx = await wasteVanContract.registerAgent({ value: requiredEth });
                await tx.wait();
                console.log('Successfully registered as agent on blockchain');

                // Verify registration was successful
                const user = await wasteVanContract.users(currentAccount);
                if (!user.isRegistered) {
                  throw new Error('Blockchain registration verification failed. User still not registered.');
                }
                console.log('Agent blockchain registration verified successfully!');
              }
            } catch (agentError) {
              // Check if error is due to insufficient funds
              if (agentError.message && agentError.message.includes('insufficient funds')) {
                console.error('Insufficient funds for agent blockchain registration:', agentError);

                // Clean up backend registration since blockchain registration failed
                await api.auth.deleteUser(response.user._id);

                // Clear user data
                setUser(null);
                setToken(null);
                setIsRegistered(false);
                setIsAgent(false);
                localStorage.removeItem('user');
                localStorage.removeItem('token');

                // Disconnect wallet
                setCurrentAccount("");
                setWasteVanContract(null);
                setWasteVanTokenContract(null);
                setSigner(null);

                // Show beautiful modal
                setShowInsufficientFundsModal(true);

                // Redirect to home page after a short delay
                setTimeout(() => {
                  router.push('/');
                }, 1500);

                return null;
              }

              console.error('Failed to register as agent on blockchain:', agentError);
              console.log('Continuing with regular user registration on blockchain...');

              // Fall back to regular user registration
              try {
                const tx = await wasteVanContract.registerUser();
                await tx.wait();
                console.log('Successfully registered as regular user on blockchain');

                // Verify registration was successful
                const user = await wasteVanContract.users(currentAccount);
                if (!user.isRegistered) {
                  throw new Error('Blockchain registration verification failed. User still not registered.');
                }
                console.log('Regular user blockchain registration verified successfully!');
              } catch (regularError) {
                // Check if error is due to insufficient funds
                if (regularError.message && regularError.message.includes('insufficient funds')) {
                  console.error('Insufficient funds for regular user blockchain registration:', regularError);

                  // Clean up backend registration since blockchain registration failed
                  await api.auth.deleteUser(response.user._id);

                  // Clear user data
                  setUser(null);
                  setToken(null);
                  setIsRegistered(false);
                  setIsAgent(false);
                  localStorage.removeItem('user');
                  localStorage.removeItem('token');

                  // Disconnect wallet
                  setCurrentAccount("");
                  setWasteVanContract(null);
                  setWasteVanTokenContract(null);
                  setSigner(null);

                  // Show beautiful modal
                  setShowInsufficientFundsModal(true);

                  // Redirect to home page after a short delay
                  setTimeout(() => {
                    router.push('/');
                  }, 1500);

                  return null;
                }
                throw regularError;
              }
            }
          } else {
            // Regular user registration
            console.log('Registering as regular user on blockchain...');
            try {
              const tx = await wasteVanContract.registerUser();
              await tx.wait();
              console.log('Successfully registered as regular user on blockchain');

              // Verify registration was successful
              const user = await wasteVanContract.users(currentAccount);
              if (!user.isRegistered) {
                throw new Error('Blockchain registration verification failed. User still not registered.');
              }
              console.log('Regular user blockchain registration verified successfully!');
            } catch (regularError) {
              // Check if error is due to insufficient funds
              if (regularError.message && regularError.message.includes('insufficient funds')) {
                console.error('Insufficient funds for regular user blockchain registration:', regularError);

                // Clean up backend registration since blockchain registration failed
                await api.auth.deleteUser(response.user._id);

                // Clear user data
                setUser(null);
                setToken(null);
                setIsRegistered(false);
                setIsAgent(false);
                localStorage.removeItem('user');
                localStorage.removeItem('token');

                // Disconnect wallet
                setCurrentAccount("");
                setWasteVanContract(null);
                setWasteVanTokenContract(null);
                setSigner(null);

                // Show beautiful modal
                setShowInsufficientFundsModal(true);

                // Redirect to home page after a short delay
                setTimeout(() => {
                  router.push('/');
                }, 1500);

                return null;
              }
              throw regularError;
            }
          }

          // Update user status
          await checkUserStatus(wasteVanContract, currentAccount);

          // Double-check registration status
          const user = await wasteVanContract.users(currentAccount);
          if (!user.isRegistered) {
            console.error('User still not registered on blockchain after registration attempt.');
            alert('Warning: Your account was created but blockchain registration failed. Some features may be limited.');
          } else {
            console.log('Final verification: User successfully registered on blockchain!');
          }
        } else {
          console.warn('Contract not initialized, skipping blockchain registration');
          // Show beautiful modal instead of alert
          setShowInsufficientFundsModal(true);
        }
      } catch (blockchainError) {
        console.error('Failed to register on blockchain:', blockchainError);

        // Check if error is due to insufficient funds
        if (blockchainError.message && blockchainError.message.includes('insufficient funds')) {
          console.error('Insufficient funds for blockchain registration:', blockchainError);

          // Clean up backend registration since blockchain registration failed
          await api.auth.deleteUser(response.user._id);

          // Clear user data
          setUser(null);
          setToken(null);
          setIsRegistered(false);
          setIsAgent(false);
          localStorage.removeItem('user');
          localStorage.removeItem('token');

          // Disconnect wallet
          setCurrentAccount("");
          setWasteVanContract(null);
          setWasteVanTokenContract(null);
          setSigner(null);

          // Show beautiful modal
          setShowInsufficientFundsModal(true);

          // Redirect to home page after a short delay
          setTimeout(() => {
            router.push('/');
          }, 1500);

          return null;
        }

        console.log('Continuing with backend-only registration');
        // Show beautiful modal instead of alert
        setShowInsufficientFundsModal(true);
      }

      // Redirect to appropriate dashboard
      console.log('Redirecting to dashboard after registration...');
      router.push(response.user.userType === 'agent' ? '/agentDashboard' : '/userDashboard');

      return response.user;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Contract interaction functions
  const registerUser = async () => {
    try {
      setLoading(true);
      if (!wasteVanContract) throw new Error("Contract not initialized");

      const tx = await wasteVanContract.registerUser();
      await tx.wait();

      // Update user status
      await checkUserStatus(wasteVanContract, currentAccount);
      return true;
    } catch (error) {
      console.error("Failed to register user:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const registerAgent = async () => {
    try {
      setLoading(true);
      if (!wasteVanContract) throw new Error("Contract not initialized");

      // Get the point cost and minimum points required
      const pointCost = await wasteVanContract.pointCost();
      const minAgentPoints = await wasteVanContract.MIN_AGENT_POINTS();

      // Calculate required ETH
      const requiredEth = pointCost * minAgentPoints;

      const tx = await wasteVanContract.registerAgent({ value: requiredEth });
      await tx.wait();

      // Update user status
      await checkUserStatus(wasteVanContract, currentAccount);
      return true;
    } catch (error) {
      console.error("Failed to register agent:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const reportWaste = async (plasticType, quantityInGrams, qrCodeHash) => {
    try {
      setLoading(true);

      // Check if contract is initialized
      if (!wasteVanContract) {
        console.error("Contract not initialized. Attempting to reconnect wallet...");

        // Try to reconnect wallet if ethereum is available
        if (window.ethereum) {
          try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
              await connectWalletInternal(accounts[0]);

              // Check if contract is now initialized
              if (!wasteVanContract) {
                throw new Error("Contract not initialized. Please reconnect your wallet.");
              }
            } else {
              throw new Error("No wallet connected. Please connect your wallet first.");
            }
          } catch (reconnectError) {
            console.error("Failed to reconnect wallet:", reconnectError);
            throw new Error("Contract not initialized. Please reconnect your wallet.");
          }
        } else {
          throw new Error("MetaMask not installed. Please install MetaMask to use this feature.");
        }
      }

      // Check if user is registered - consider both backend and blockchain registration
      const isBackendAuthenticated = localStorage.getItem('token') && localStorage.getItem('user');
      const isBlockchainAuthenticated = isRegistered;

      if (!isBackendAuthenticated && !isBlockchainAuthenticated) {
        throw new Error("User not registered. Please register before reporting waste.");
      }

      // If user is authenticated with backend but not registered on blockchain, show registration modal
      if (!isBlockchainAuthenticated && isBackendAuthenticated) {
        console.warn('User is authenticated with backend but not registered on blockchain.');

        // Show registration required modal
        setShowRegistrationRequiredModal(true);

        // Throw error to stop the waste reporting process
        throw new Error('Blockchain registration required. Please complete registration first.');
      }

      // Double-check registration status before proceeding
      try {
        if (wasteVanContract) {
          const user = await wasteVanContract.users(currentAccount);
          if (!user.isRegistered) {
            throw new Error('User not registered on blockchain. Please try registering again.');
          }
          console.log('Confirmed user is registered on blockchain.');
        }
      } catch (verificationError) {
        console.error('Registration verification failed:', verificationError);
        throw new Error('Registration verification failed: ' + verificationError.message);
      }

      console.log('Reporting waste with parameters:', { plasticType, quantityInGrams, qrCodeHash });

      // Call the contract function
      const tx = await wasteVanContract.reportWaste(plasticType, quantityInGrams, qrCodeHash);
      console.log('Transaction submitted:', tx.hash);

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      return true;
    } catch (error) {
      console.error("Failed to report waste:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const collectWaste = async (qrCodeHash) => {
    try {
      setLoading(true);
      if (!wasteVanContract) throw new Error("Contract not initialized");
      if (!isRegistered || !isAgent) throw new Error("Not registered as an agent");
      // Check agent status - handle both numeric (from blockchain) and string (from backend) values
      if (agentStatus !== AgentStatus.Approved && agentStatus !== 'approved') {
        console.log('Agent status check failed:', { agentStatus, AgentStatusApproved: AgentStatus.Approved });
        throw new Error("Agent not approved");
      }

      const tx = await wasteVanContract.collectWaste(qrCodeHash);
      await tx.wait();
      return true;
    } catch (error) {
      console.error("Failed to collect waste:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const processWaste = async (reportId) => {
    try {
      setLoading(true);
      if (!wasteVanContract) throw new Error("Contract not initialized");
      if (!isRegistered || !isAgent) throw new Error("Not registered as an agent");
      // Check agent status - handle both numeric (from blockchain) and string (from backend) values
      if (agentStatus !== AgentStatus.Approved && agentStatus !== 'approved') {
        console.log('Agent status check failed:', { agentStatus, AgentStatusApproved: AgentStatus.Approved });
        throw new Error("Agent not approved");
      }

      const tx = await wasteVanContract.processWaste(reportId);
      await tx.wait();
      return true;
    } catch (error) {
      console.error("Failed to process waste:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getWasteReportsByStatus = async (status, limit = 10, offset = 0) => {
    try {
      if (!wasteVanContract) {
        console.error("Contract not initialized when fetching waste reports");
        throw new Error("Contract not initialized");
      }

      console.log(`Calling contract.getWasteReportsByStatus(${status}, ${limit}, ${offset})`);
      const reports = await wasteVanContract.getWasteReportsByStatus(status, limit, offset);
      console.log(`Received ${reports.length} reports for status ${status}`);

      // If we have reports, log the first one for debugging
      if (reports.length > 0) {
        try {
          const sampleReport = reports[0];
          console.log('Sample report data structure:', {
            reportId: sampleReport.reportId?.toString() || 'N/A',
            reporter: sampleReport.reporter?.substring(0, 10) + '...' || 'N/A',
            reportTime: sampleReport.reportTime?.toString() || 'N/A',
            plasticType: sampleReport.plasticType?.toString() || 'N/A',
            quantity: sampleReport.quantity?.toString() || 'N/A',
            status: sampleReport.status?.toString() || 'N/A',
            qrCodeHash: sampleReport.qrCodeHash?.substring(0, 10) + '...' || 'N/A'
          });
        } catch (logError) {
          console.error('Error logging sample report:', logError);
        }
      }

      return reports;
    } catch (error) {
      console.error("Failed to get waste reports:", error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  };

  const getUserTokenBalance = async (address = currentAccount) => {
    try {
      if (!wasteVanContract) throw new Error("Contract not initialized");

      const balance = await wasteVanContract.getUserTokenBalance(address);
      return balance;
    } catch (error) {
      console.error("Failed to get user token balance:", error);
      throw error;
    }
  };

  const getAgentStats = async (address = currentAccount) => {
    try {
      if (!wasteVanContract) throw new Error("Contract not initialized");
      if (!isAgent) throw new Error("Not an agent");

      const stats = await wasteVanContract.getAgentStats(address);
      return {
        pointBalance: stats[0],
        totalCollections: stats[1],
        totalProcessed: stats[2]
      };
    } catch (error) {
      console.error("Failed to get agent stats:", error);
      throw error;
    }
  };

  // Get the current point cost from the contract
  const getPointCost = async () => {
    try {
      if (!wasteVanContract) throw new Error("Contract not initialized");

      const pointCost = await wasteVanContract.pointCost();
      return pointCost;
    } catch (error) {
      console.error("Failed to get point cost:", error);
      throw error;
    }
  };

  // Purchase points for agents
  const purchasePoints = async (ethAmount) => {
    try {
      console.log('purchasePoints called with ethAmount:', ethAmount);
      setLoading(true);

      if (!wasteVanContract) {
        console.error('Contract not initialized');
        throw new Error("Contract not initialized");
      }

      console.log('Agent status check:', { isAgent, agentStatus });

      // Check if user is an agent
      if (!isAgent) {
        console.error('User is not an agent');
        throw new Error("Not an agent");
      }

      // Check agent approval status
      console.log('Agent status:', agentStatus, 'AgentStatus.Approved:', AgentStatus.Approved);

      // Handle both numeric and string status values
      const isApproved =
        agentStatus === AgentStatus.Approved ||
        agentStatus === 'approved' ||
        (typeof agentStatus === 'string' && agentStatus.toLowerCase() === 'approved') ||
        (typeof agentStatus === 'number' && agentStatus === 1);

      if (!isApproved) {
        console.error('Agent not approved. Current status:', agentStatus);
        throw new Error("Agent not approved");
      }

      console.log('Agent is approved, proceeding with purchase');

      // Convert ETH amount to wei
      const weiAmount = ethers.parseEther(ethAmount.toString());
      console.log('Converted ETH amount to wei:', weiAmount.toString());

      // Check if contract interface is available
      if (wasteVanContract && wasteVanContract.interface && wasteVanContract.interface.functions) {
        console.log('Contract methods:', Object.keys(wasteVanContract.interface.functions));
      } else {
        console.log('Contract interface not fully initialized');
      }

      // Call the contract function
      console.log('Calling contract.purchasePoints with value:', weiAmount.toString());

      // Check if the purchasePoints function exists
      if (!wasteVanContract || typeof wasteVanContract.purchasePoints !== 'function') {
        console.error('purchasePoints function not found on contract', wasteVanContract);
        throw new Error('Contract method not found. Please contact support.');
      }

      // Log contract details for debugging
      console.log('Contract address:', await wasteVanContract.getAddress());
      console.log('Current account:', currentAccount);

      try {
        // Attempt to call the contract method
        console.log('Sending transaction with value:', ethers.formatEther(weiAmount), 'ETH');

        // Force a fresh connection to ensure MetaMask popup appears
        if (window.ethereum) {
          console.log('Refreshing connection to MetaMask...');
          await window.ethereum.request({ method: 'eth_requestAccounts' });
        }

        // Make sure we're using the signer for transactions
        if (!signer) {
          console.error('Signer not available');
          throw new Error('Wallet connection issue. Please reconnect your wallet.');
        }

        // Get contract with signer to ensure transaction is sent properly
        const contractWithSigner = wasteVanContract.connect(signer);
        console.log('Contract connected with signer');

        // Send the transaction with explicit gas settings to ensure MetaMask popup
        const tx = await contractWithSigner.purchasePoints({
          value: weiAmount,
          gasLimit: 300000, // Explicit gas limit
        });

        console.log('Transaction sent:', tx.hash);

        // Alert the user that the transaction has been sent
        alert('Transaction sent! Please wait for confirmation.');

        console.log('Waiting for transaction confirmation...');
        const receipt = await tx.wait();
        console.log('Transaction confirmed:', receipt);

        // Calculate the points purchased based on the transaction value
        const pointAmountBigInt = weiAmount / pointCost;
        console.log(`Points purchased (BigInt): ${pointAmountBigInt.toString()}`);

        // Convert BigInt to string then to number safely
        const pointAmount = Number(pointAmountBigInt.toString());
        console.log(`Points purchased: ${pointAmount} (${ethers.formatEther(weiAmount)} ETH / ${ethers.formatEther(pointCost)} ETH per point)`);

        // Alert the user about the successful purchase
        alert(`Successfully purchased ${pointAmount} points!`);
      } catch (txError) {
        console.error('Transaction error:', txError);
        // Check for specific error types
        if (txError.code === 'ACTION_REJECTED') {
          throw new Error('Transaction rejected in wallet');
        } else if (txError.code === 'INSUFFICIENT_FUNDS') {
          throw new Error('Insufficient funds in your wallet');
        } else if (txError.message && txError.message.includes('user rejected')) {
          throw new Error('Transaction rejected by user');
        } else if (txError.message && txError.message.includes('execution reverted')) {
          // Extract the revert reason if available
          const revertReason = txError.message.includes('reverted:')
            ? txError.message.split('reverted:')[1].trim()
            : 'Transaction reverted by the contract';
          throw new Error(`Transaction failed: ${revertReason}`);
        } else {
          throw txError; // Re-throw if it's another type of error
        }
      }

      // Refresh agent stats
      const updatedStats = await getAgentStats(currentAccount);
      console.log('Updated agent stats:', updatedStats);

      return true;
    } catch (error) {
      console.error("Failed to purchase points:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <EcoConnectContext.Provider
        value={{
          connectWallet,
          connectWalletInternal,
          connectWalletForRegistration,
          currentAccount,
          loading,
          wasteVanContract,
          wasteVanTokenContract,
          provider,
          signer,
          userType,
          isRegistered,
          isAgent,
          agentStatus,
          user,
          token,
          registerUser,
          registerAgent,
          reportWaste,
          collectWaste,
          processWaste,
          purchasePoints,
          getWasteReportsByStatus,
          getUserTokenBalance,
          getAgentStats,
          getPointCost,
          login,
          logout,
          registerWithBackend,
          showInsufficientFundsModal,
          setShowInsufficientFundsModal,
          showRegistrationRequiredModal,
          setShowRegistrationRequiredModal,
          showAgentApprovalNotification,
          setShowAgentApprovalNotification
        }}
      >
        {children}

        {/* Beautiful Insufficient Funds Modal */}
        <InsufficientFundsModal
          isOpen={showInsufficientFundsModal}
          onClose={() => setShowInsufficientFundsModal(false)}
          walletAddress={currentAccount}
        />

        {/* Registration Required Modal */}
        <RegistrationRequiredModal
          isOpen={showRegistrationRequiredModal}
          onClose={() => setShowRegistrationRequiredModal(false)}
        />

        {/* Agent Approval Notification */}
        <AgentApprovalNotification
          isOpen={showAgentApprovalNotification}
          onClose={() => setShowAgentApprovalNotification(false)}
        />
      </EcoConnectContext.Provider>
    </>
  );
};
