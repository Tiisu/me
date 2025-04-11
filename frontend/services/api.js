'use client';

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth services
export const authService = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  connectWallet: async (walletAddress) => {
    const response = await api.post('/auth/connect-wallet', { walletAddress });
    return response.data;
  },

  verifyWallet: async (walletAddress, signature, message) => {
    const response = await api.post('/auth/verify-wallet', {
      walletAddress,
      signature,
      message
    });
    return response.data;
  }
};

// User services
export const userService = {
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateProfile: async (userData) => {
    const response = await api.put('/users/profile', userData);
    return response.data;
  },

  getTokenBalance: async () => {
    const response = await api.get('/users/token-balance');
    return response.data;
  },

  getWasteReports: async (params = {}) => {
    const response = await api.get('/users/waste-reports', { params });
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get('/users/statistics');
    return response.data;
  }
};

// Waste services
export const wasteService = {
  reportWaste: async (wasteData) => {
    const response = await api.post('/waste/report', wasteData);
    return response.data;
  },

  reportWasteWithImages: async (formData) => {
    const response = await api.post('/waste/report', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  getWasteReports: async (params = {}) => {
    const response = await api.get('/waste/reports', { params });
    return response.data;
  },

  getWasteReportById: async (id) => {
    const response = await api.get(`/waste/reports/${id}`);
    return response.data;
  },

  getQRCode: async (hash) => {
    const response = await api.get(`/waste/qrcode/${hash}`);
    return response.data;
  },

  collectWaste: async (id) => {
    const response = await api.post(`/waste/collect/${id}`);
    return response.data;
  },

  processWaste: async (id) => {
    const response = await api.post(`/waste/process/${id}`);
    return response.data;
  },

  getNearbyWasteReports: async (params) => {
    const response = await api.get('/waste/nearby', { params });
    return response.data;
  }
};

// Agent services
export const agentService = {
  getProfile: async () => {
    const response = await api.get('/agents/profile');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/agents/profile', profileData);
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get('/agents/statistics');
    return response.data;
  },

  addServiceArea: async (areaData) => {
    const response = await api.post('/agents/service-area', areaData);
    return response.data;
  },

  removeServiceArea: async (id) => {
    const response = await api.delete(`/agents/service-area/${id}`);
    return response.data;
  },

  registerAsAgent: async (data = {}) => {
    const response = await api.post('/agents/register', data);
    return response.data;
  },

  uploadDocuments: async (documents) => {
    const response = await api.post('/agents/upload-documents', { documents });
    return response.data;
  },

  // Admin functions
  getPendingAgents: async () => {
    const response = await api.get('/agents/pending');
    return response.data;
  },

  approveAgent: async (id) => {
    const response = await api.put(`/agents/${id}/approve`);
    return response.data;
  },

  rejectAgent: async (id) => {
    const response = await api.put(`/agents/${id}/reject`);
    return response.data;
  },

  getAllAgents: async () => {
    const response = await api.get('/agents/all');
    return response.data;
  }
};

export default {
  auth: authService,
  user: userService,
  waste: wasteService,
  agent: agentService
};
