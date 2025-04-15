// Simple script to test the notification system
// Run this with Node.js: node test-notifications.js

const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let authToken = '';

// Replace these with valid credentials
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

// Login to get a token
async function login() {
  try {
    console.log('Logging in...');
    const response = await axios.post(`${API_URL}/auth/login`, testUser);
    authToken = response.data.token;
    console.log('Login successful, token:', authToken);
    return response.data.user;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

// Create a test notification
async function createTestNotification() {
  try {
    console.log('Creating test notification...');
    const response = await axios.post(
      `${API_URL}/notifications/debug/create-test`,
      {},
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );
    console.log('Test notification created:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to create test notification:', error.response?.data || error.message);
    throw error;
  }
}

// Get all notifications
async function getAllNotifications() {
  try {
    console.log('Getting all notifications...');
    const response = await axios.get(
      `${API_URL}/notifications/debug/all`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );
    console.log('All notifications:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to get all notifications:', error.response?.data || error.message);
    throw error;
  }
}

// Get user notifications
async function getUserNotifications() {
  try {
    console.log('Getting user notifications...');
    const response = await axios.get(
      `${API_URL}/notifications`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );
    console.log('User notifications:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to get user notifications:', error.response?.data || error.message);
    throw error;
  }
}

// Get notification count
async function getNotificationCount() {
  try {
    console.log('Getting notification count...');
    const response = await axios.get(
      `${API_URL}/notifications/count`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );
    console.log('Notification count:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to get notification count:', error.response?.data || error.message);
    throw error;
  }
}

// Run the tests
async function runTests() {
  try {
    // Login
    const user = await login();
    console.log('Logged in as:', user.username);
    
    // Get initial notification count
    await getNotificationCount();
    
    // Create a test notification
    await createTestNotification();
    
    // Get updated notification count
    await getNotificationCount();
    
    // Get user notifications
    await getUserNotifications();
    
    // Get all notifications
    await getAllNotifications();
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runTests();
