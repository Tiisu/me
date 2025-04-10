'use client';

import React, { useState, useEffect, useContext } from 'react';
import { Loader2, Coins, BarChart3, QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EcoConnectContext } from '@/context/EcoConnect';
import { ethers } from 'ethers';
import { AgentStatus } from '@/context/Constants';
import CollectWasteForm from './CollectWasteForm';
import ProcessWasteForm from './ProcessWasteForm';

export default function AgentDashboard() {
  const {
    currentAccount,
    wasteVanContract,
    getAgentStats,
    agentStatus,
    isAgent
  } = useContext(EcoConnectContext);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgentData = async () => {
      if (!currentAccount || !isAgent) return;

      try {
        setLoading(true);

        // Fetch agent statistics
        const agentStats = await getAgentStats(currentAccount);
        setStats(agentStats);

      } catch (error) {
        console.error('Failed to fetch agent data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentData();
  }, [currentAccount, isAgent, getAgentStats]);

  if (!isAgent) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Agent Access Required</h1>
        <p className="text-gray-600 mb-6">
          You need to be registered as an agent to access this dashboard.
        </p>
      </div>
    );
  }

  if (agentStatus !== AgentStatus.Approved) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Pending Approval</h1>
        <p className="text-gray-600 mb-6">
          Your agent account is pending approval from the administrator.
          You'll be able to access the agent dashboard once approved.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Agent Dashboard</h1>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Point Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Coins className="h-8 w-8 text-yellow-500 mr-3" />
                  <div>
                    <p className="text-2xl font-bold">
                      {stats ? stats.pointBalance.toString() : '0'} Points
                    </p>
                    <p className="text-sm text-gray-500">
                      Available for rewards
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Collections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <QrCode className="h-8 w-8 text-blue-500 mr-3" />
                  <div>
                    <p className="text-2xl font-bold">
                      {stats ? stats.totalCollections.toString() : '0'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Total waste collections
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Processed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-green-500 mr-3" />
                  <div>
                    <p className="text-2xl font-bold">
                      {stats ? stats.totalProcessed.toString() : '0'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Total waste processed
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="collect">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="collect">Collect Waste</TabsTrigger>
              <TabsTrigger value="process">Process Waste</TabsTrigger>
            </TabsList>
            <TabsContent value="collect" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <CollectWasteForm />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="process" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <ProcessWasteForm />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}