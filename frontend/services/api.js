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

  getQRCode: async (qrCodeHash) => {
    try {
      const response = await api.get(`/waste/qrcode/${qrCodeHash}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching QR code:', error);
      // If backend fails, generate a QR code on the client side
      return {
        qrCodeHash,
        qrCodeImage: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrCodeHash}`
      };
    }
  },

  getWasteReports: async (params = {}) => {
    const response = await api.get('/waste/reports', { params });
    return response.data;
  },

  getWasteReportById: async (id) => {
    const response = await api.get(`/waste/reports/${id}`);
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
    try {
      const response = await api.get('/agents/pending', {
        headers: {
          'admin-username': ADMIN_USERNAME,
          'admin-password': ADMIN_PASSWORD
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching pending agents:', error);
      // Return mock data with wallet addresses for testing
      return [
        {
          _id: '5',
          user: {
            username: 'agent_jones',
            email: 'jones@example.com'
          },
          walletAddress: '0x789abcdef123456789abcdef123456789abcdef12',
          status: 'pending',
          createdAt: new Date().toISOString()
        },
        {
          _id: '7',
          user: {
            username: 'agent_white',
            email: 'white@example.com'
          },
          walletAddress: '0xdef123456789abcdef123456789abcdef12345678',
          status: 'pending',
          createdAt: new Date(Date.now() - 12 * 3600000).toISOString()
        }
      ];
    }
  },

  getAllAgents: async () => {
    try {
      const response = await api.get('/agents/all', {
        headers: {
          'admin-username': ADMIN_USERNAME,
          'admin-password': ADMIN_PASSWORD
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching all agents:', error);
      // Return mock data with wallet addresses for testing
      return [
        {
          _id: '4',
          user: {
            username: 'agent_smith',
            email: 'agent@example.com'
          },
          walletAddress: '0x456789abcdef123456789abcdef123456789abcde',
          status: 'approved',
          totalCollections: 12,
          totalProcessed: 8,
          createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          _id: '5',
          user: {
            username: 'agent_jones',
            email: 'jones@example.com'
          },
          walletAddress: '0x789abcdef123456789abcdef123456789abcdef12',
          status: 'pending',
          totalCollections: 0,
          totalProcessed: 0,
          createdAt: new Date().toISOString()
        },
        {
          _id: '6',
          user: {
            username: 'agent_brown',
            email: 'brown@example.com'
          },
          walletAddress: '0xabcdef123456789abcdef123456789abcdef12345',
          status: 'rejected',
          totalCollections: 0,
          totalProcessed: 0,
          createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
        }
      ];
    }
  },

  approveAgent: async (id) => {
    const response = await api.put(`/agents/${id}/approve`, {}, {
      headers: {
        'admin-username': ADMIN_USERNAME,
        'admin-password': ADMIN_PASSWORD
      }
    });
    return response.data;
  },

  rejectAgent: async (id) => {
    const response = await api.put(`/agents/${id}/reject`, {}, {
      headers: {
        'admin-username': ADMIN_USERNAME,
        'admin-password': ADMIN_PASSWORD
      }
    });
    return response.data;
  }
};

// Notification services
export const notificationService = {
  getNotifications: async (params = {}) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  getNotificationCount: async () => {
    const response = await api.get('/notifications/count');
    return response.data;
  },

  markAsRead: async (notificationIds) => {
    const response = await api.put('/notifications/mark-read', { notificationIds });
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.put('/notifications/mark-all-read');
    return response.data;
  },

  deleteNotification: async (id) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },

  getNearbyNotifications: async (params) => {
    const response = await api.get('/notifications/nearby', { params });
    return response.data;
  }
};

// Admin credentials
const ADMIN_USERNAME = 'Tiisu';
const ADMIN_PASSWORD = 'Ghana';

// Admin services
export const adminService = {
  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard-stats', {
      headers: {
        'admin-username': ADMIN_USERNAME,
        'admin-password': ADMIN_PASSWORD
      }
    });
    return response.data;
  },

  getUsers: async (params = {}) => {
    try {
      const response = await api.get('/admin/users', {
        params,
        headers: {
          'admin-username': ADMIN_USERNAME,
          'admin-password': ADMIN_PASSWORD
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      // Return mock data with wallet addresses for testing
      return {
        users: [
          {
            _id: '1',
            username: 'john_doe',
            email: 'john@example.com',
            userType: 'user',
            walletAddress: '0x123456789abcdef123456789abcdef123456789a',
            isActive: true,
            createdAt: new Date().toISOString()
          },
          {
            _id: '2',
            username: 'jane_smith',
            email: 'jane@example.com',
            userType: 'user',
            walletAddress: '0x987654321abcdef987654321abcdef987654321b',
            isActive: true,
            createdAt: new Date(Date.now() - 86400000).toISOString()
          },
          {
            _id: '3',
            username: 'admin_user',
            email: 'admin@example.com',
            userType: 'admin',
            walletAddress: '0x8A2d63520bb7cC7d5aeB3Be859056629351C666A',
            isActive: true,
            createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
          }
        ]
      };
    }
  },

  updateUserStatus: async (userId, isActive) => {
    const response = await api.put(`/admin/users/${userId}/status`,
      { isActive },
      {
        headers: {
          'admin-username': ADMIN_USERNAME,
          'admin-password': ADMIN_PASSWORD
        }
      }
    );
    return response.data;
  }
};

export default {
  auth: authService,
  user: userService,
  waste: wasteService,
  agent: agentService,
  notification: notificationService,
  admin: adminService
};
