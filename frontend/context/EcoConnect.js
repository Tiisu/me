'use client';

import React, { useState, createContext, useEffect } from "react";
import { ethers } from "ethers";
import { useRouter } from 'next/navigation';
import api from '../services/api';
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
  getWasteReportsByStatus: async () => {},
  getUserTokenBalance: async () => {},
  getAgentStats: async () => {},
  login: async () => {},
  logout: async () => {},
  registerWithBackend: async () => {},
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

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuthentication = async () => {
      // Check for token in localStorage
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));

        // Set user type and registration status based on saved user
        const userData = JSON.parse(savedUser);
        setUserType(userData.userType);
        setIsRegistered(true);
        setIsAgent(userData.userType === 'agent');
        if (userData.userType === 'agent') {
          setAgentStatus(userData.agentStatus);
        }

        // If user has wallet address, check blockchain status
        if (userData.walletAddress && window.ethereum) {
          try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0 && accounts[0].toLowerCase() === userData.walletAddress.toLowerCase()) {
              await connectWalletInternal(accounts[0]);
            }
          } catch (error) {
            console.error("Failed to check wallet connection:", error);
          }
        }
      } else if (window.ethereum) {
        // If no token but wallet is connected, just connect wallet
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
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
  const checkUserStatus = async (contract, address) => {
    try {
      if (contract && address) {
        const user = await contract.users(address);
        setIsRegistered(user.isRegistered);
        setIsAgent(user.userType === UserType.Agent);

        if (user.userType === UserType.Agent) {
          const agent = await contract.agents(address);
          setAgentStatus(agent.status);
        }
      }
    } catch (error) {
      console.error("Error checking user status:", error);
    }
  };

  // Internal function to connect wallet without checking backend
  const connectWalletInternal = async (address) => {
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
      await checkUserStatus(wasteVanContract, userAddress);

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

        // Redirect to appropriate dashboard
        if (response.user.userType === 'agent') {
          router.push('/agentDashboard');
        } else {
          router.push('/userDashboard');
        }
      } catch (error) {
        // If wallet not registered in backend, redirect to registration
        console.log("Wallet not registered in backend, redirecting to registration");
        router.push('/loginRegister');
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

      console.log('Registering user with data:', { ...userData, password: '******' });

      // Make the API call
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

      // If wallet is connected, associate it with the user
      if (currentAccount) {
        try {
          console.log('Connecting wallet to user account:', currentAccount);
          await api.auth.connectWallet({ walletAddress: currentAccount });

          // Update user object with wallet address
          const updatedUser = { ...response.user, walletAddress: currentAccount };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (error) {
          console.error("Failed to connect wallet to user:", error);
        }
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
      if (!wasteVanContract) throw new Error("Contract not initialized");
      if (!isRegistered) throw new Error("User not registered");

      const tx = await wasteVanContract.reportWaste(plasticType, quantityInGrams, qrCodeHash);
      await tx.wait();
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
      if (agentStatus !== AgentStatus.Approved) throw new Error("Agent not approved");

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
      if (agentStatus !== AgentStatus.Approved) throw new Error("Agent not approved");

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
      if (!wasteVanContract) throw new Error("Contract not initialized");

      const reports = await wasteVanContract.getWasteReportsByStatus(status, limit, offset);
      return reports;
    } catch (error) {
      console.error("Failed to get waste reports:", error);
      throw error;
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

  return (
    <EcoConnectContext.Provider
      value={{
        connectWallet,
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
        getWasteReportsByStatus,
        getUserTokenBalance,
        getAgentStats,
        login,
        logout,
        registerWithBackend
      }}
    >
      {children}
    </EcoConnectContext.Provider>
  );
};
