'use client';

import React, { useState, useEffect, useContext } from 'react';
import { Loader2, Coins, BarChart3, QrCode, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EcoConnectContext } from '@/context/EcoConnect';
import { ethers } from 'ethers';
import { AgentStatus } from '@/context/Constants';
import CollectWasteForm from './CollectWasteForm';
import ProcessWasteForm from './ProcessWasteForm';
import PurchasePointsForm from './PurchasePointsForm';
import RecentWasteReports from './RecentWasteReports';
import WasteReportsList from '../shared/WasteReportsList';
import { useRouter } from 'next/navigation';

export default function AgentDashboard() {
  const router = useRouter();
  const {
    currentAccount,
    wasteVanContract,
    getAgentStats,
    agentStatus,
    isAgent,
    connectWallet
  } = useContext(EcoConnectContext);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [contractError, setContractError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Used to trigger refreshes

  // Handle client-side only code
  useEffect(() => {
    setIsMounted(true);

    // Check if user is authenticated
    if (!isAgent && !currentAccount) {
      router.push('/loginRegister');
      return;
    }
  }, [isAgent, currentAccount, router]);

  useEffect(() => {
    // Skip if not mounted (to prevent hydration mismatch)
    if (!isMounted) return;

    console.log('AgentDashboard - Checking contract status:', {
      currentAccount: currentAccount ? 'connected' : 'not connected',
      contract: wasteVanContract ? 'initialized' : 'not initialized',
      isAgent,
      agentStatus
    });

    // Try to reconnect wallet if contract is not initialized but account is connected
    if (currentAccount && !wasteVanContract) {
      console.log('Wallet connected but contract not initialized, attempting to reconnect...');
      setContractError(true);

      // Try to reconnect wallet
      if (window && window.ethereum) {
        window.ethereum.request({ method: 'eth_accounts' })
          .then(accounts => {
            if (accounts.length > 0) {
              console.log('Found connected account, reconnecting wallet...');
              connectWallet()
                .then(() => {
                  console.log('Wallet reconnected successfully');
                  setContractError(false);
                })
                .catch(error => {
                  console.error('Failed to reconnect wallet:', error);
                });
            }
          })
          .catch(error => {
            console.error('Failed to check connected accounts:', error);
          });
      }
    }

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

    // Only fetch data if component is mounted
    if (isMounted) {
      fetchAgentData();
    }
  }, [currentAccount, wasteVanContract, isAgent, agentStatus, getAgentStats, connectWallet, isMounted, refreshTrigger]);

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

  // Function to handle waste collection and point purchase updates
  const handleWasteCollected = (reportId) => {
    console.log(`Waste collected with ID: ${reportId}`);
    // Trigger a refresh of the agent dashboard data
    setRefreshTrigger(prev => prev + 1);
  };

  // Function to handle point purchase updates
  const handlePointsPurchased = () => {
    console.log('Points purchased, refreshing data...');
    // Trigger a refresh of the agent dashboard data
    setRefreshTrigger(prev => prev + 1);

    // Fetch agent stats immediately to update the UI
    if (wasteVanContract && currentAccount && isAgent) {
      getAgentStats(currentAccount)
        .then(updatedStats => {
          console.log('Updated agent stats after point purchase:', updatedStats);
          setStats(updatedStats);
        })
        .catch(error => {
          console.error('Failed to fetch updated agent stats:', error);
        });
    }
  };

  // Check agent status - handle both numeric (from blockchain) and string (from backend) values
  if (agentStatus !== AgentStatus.Approved && agentStatus !== 'approved') {
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

  // Don't render anything until client-side hydration is complete
  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Agent Dashboard</h1>

      {contractError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Blockchain Connection Issue</h3>
              <p className="text-sm text-yellow-700 mt-1">
                There was an issue connecting to the blockchain. Some features may not work properly.
                <button
                  onClick={() => connectWallet()}
                  className="ml-2 text-yellow-800 underline hover:text-yellow-900"
                >
                  Reconnect Wallet
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

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
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                    onClick={() => setActiveTab('points')}
                  >
                    <Coins className="h-4 w-4 mr-2" />
                    Purchase More Points
                  </Button>
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

            {/* Recent Waste Reports with Notifications */}
            <RecentWasteReports onWasteCollected={handleWasteCollected} />

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

          {/* Tab Navigation */}
          <div className="flex flex-wrap space-x-2 mb-6">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-md mb-2 ${activeTab === 'pending' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
            >
              Pending Reports
            </button>
            <button
              onClick={() => setActiveTab('collect')}
              className={`px-4 py-2 rounded-md mb-2 ${activeTab === 'collect' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
            >
              Collect Waste
            </button>
            <button
              onClick={() => setActiveTab('process')}
              className={`px-4 py-2 rounded-md mb-2 ${activeTab === 'process' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
            >
              Process Waste
            </button>
            <button
              onClick={() => setActiveTab('points')}
              className={`px-4 py-2 rounded-md mb-2 ${activeTab === 'points' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
            >
              Purchase Points
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'pending' && (
            <WasteReportsList onWasteCollected={handleWasteCollected} isAgent={true} />
          )}

          {activeTab === 'collect' && (
            <Card>
              <CardContent className="p-6">
                <CollectWasteForm onWasteCollected={handleWasteCollected} />
              </CardContent>
            </Card>
          )}

          {activeTab === 'process' && (
            <Card>
              <CardContent className="p-6">
                <ProcessWasteForm onWasteProcessed={handleWasteCollected} />
              </CardContent>
            </Card>
          )}

          {activeTab === 'points' && (
            <Card>
              <CardContent className="p-6">
                <PurchasePointsForm onPointsPurchased={handlePointsPurchased} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}