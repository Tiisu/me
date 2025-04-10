"use client"

import React, { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserDashboard from '@/components/user/UserDashboard';
import { EcoConnectContext } from '@/context/EcoConnect';

const Dashboard = () => {
  const { isRegistered, currentAccount } = useContext(EcoConnectContext);
  const router = useRouter();

  // Redirect to login if not registered
  useEffect(() => {
    if (!currentAccount || !isRegistered) {
      router.push('/loginRegister');
    }
  }, [currentAccount, isRegistered, router]);

  return (
    <div className="container mx-auto px-4 py-8">
      <UserDashboard />
    </div>
  );
};

export default Dashboard;