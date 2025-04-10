"use client"

import React, { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import UserDashboard from '@/components/user/UserDashboard';
import { EcoConnectContext } from '@/context/EcoConnect';

const Dashboard = () => {
  const { user, token, isRegistered, currentAccount } = useContext(EcoConnectContext);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Check authentication status
  useEffect(() => {
    console.log('UserDashboard Page - Checking auth status:', {
      user: user ? 'exists' : 'null',
      token: token ? 'exists' : 'null',
      isRegistered,
      currentAccount: currentAccount ? 'connected' : 'not connected'
    });

    // Get token from localStorage to ensure it's the latest value
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    // Only redirect if we've checked auth status and user is not authenticated
    if (!authChecked) {
      setAuthChecked(true);

      // User must be authenticated with backend OR have a connected wallet that's registered
      const isBackendAuthenticated = storedToken && storedUser;
      const isBlockchainAuthenticated = currentAccount && isRegistered;

      if (!isBackendAuthenticated && !isBlockchainAuthenticated) {
        console.log('User not authenticated, redirecting to login');
        router.push('/loginRegister');
      } else {
        console.log('User is authenticated, staying on dashboard');
        setLoading(false);
      }
    }
  }, [user, token, currentAccount, isRegistered, router, authChecked]);

  // Show loading state while checking authentication
  if (loading && !authChecked) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <UserDashboard />
    </div>
  );
};

export default Dashboard;