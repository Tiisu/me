'use client';

import React, { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AgentDashboard from '@/components/agent/AgentDashboard';
import { EcoConnectContext } from '@/context/EcoConnect';

export default function AgentDashboardPage() {
  const { isRegistered, currentAccount, isAgent, agentStatus } = useContext(EcoConnectContext);
  const router = useRouter();

  // Redirect to login if not registered or not an agent
  useEffect(() => {
    if (!currentAccount || !isRegistered) {
      router.push('/loginRegister');
      return;
    }

    // If not an agent, redirect to user dashboard
    if (!isAgent) {
      router.push('/userDashboard');
      return;
    }
  }, [currentAccount, isRegistered, isAgent, router]);

  return (
    <div className="container mx-auto px-4 py-8">
      <AgentDashboard />
    </div>
  );
}