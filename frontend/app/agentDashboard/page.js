'use client';

import React, { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AgentDashboard from '@/components/agent/AgentDashboard';
import { EcoConnectContext } from '@/context/EcoConnect';

export default function AgentDashboardPage() {
  const { isRegistered, currentAccount, isAgent } = useContext(EcoConnectContext);
  const router = useRouter();

  // Redirect to login if not registered
  useEffect(() => {
    if (!currentAccount || !isRegistered) {
      router.push('/loginRegister');
    }
  }, [currentAccount, isRegistered, router]);

  return (
    <div className="container mx-auto px-4 py-8">
      <AgentDashboard />
    </div>
  );
}