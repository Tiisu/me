'use client';

import { useState, useEffect, useContext } from 'react';
import { Loader2, Recycle, Coins, Clock, CheckCircle, AlertCircle, ArrowUpDown, QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EcoConnectContext } from '@/context/EcoConnect';
import { ethers } from 'ethers';
import ReportWasteForm from './ReportWasteForm';
import QRCodeModal from '../common/QRCodeModal';
import api from '@/services/api';
import { useRouter } from 'next/navigation';

export default function UserDashboard() {
  const router = useRouter();
  const {
    currentAccount,
    wasteVanContract,
    wasteVanTokenContract,
    getUserTokenBalance,
    getWasteReportsByStatus,
    user,
    connectWallet,
    isRegistered
  } = useContext(EcoConnectContext);

  const [tokenBalance, setTokenBalance] = useState(null);
  const [reportedWaste, setReportedWaste] = useState(0);
  const [collectedWaste, setCollectedWaste] = useState(0);
  const [processedWaste, setProcessedWaste] = useState(0);
  const [wasteReports, setWasteReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [contractError, setContractError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [qrCodeModalOpen, setQrCodeModalOpen] = useState(false);
  const [selectedQrCode, setSelectedQrCode] = useState(null);
  const [loadingQrCode, setLoadingQrCode] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Used to trigger refreshes

  // Handle client-side only code
  useEffect(() => {
    setIsMounted(true);

    // Check if user is authenticated - only redirect if neither user nor wallet is connected
    // This allows users who have connected their wallet but not registered to stay on the page
    if (!user && !currentAccount && isMounted) {
      console.log('No authentication found, redirecting to login/register');
      router.push('/loginRegister');
      return;
    }
  }, [user, currentAccount, router, isMounted]);

  useEffect(() => {
    // Skip if not mounted (to prevent hydration mismatch)
    if (!isMounted) return;

    // Check if user is authenticated
    const isAuthenticated = user && localStorage.getItem('token');
    console.log('UserDashboard - Authentication check:', {
      isAuthenticated,
      user: user ? 'exists' : 'null',
      currentAccount: currentAccount ? 'connected' : 'not connected',
      contract: wasteVanContract ? 'initialized' : 'not initialized'
    });

    // Try to reconnect wallet if contract is not initialized but account is connected
    if (currentAccount && !wasteVanContract) {
      console.log('Wallet connected but contract not initialized, attempting to reconnect...');
      setContractError(true);

      // Try to reconnect wallet
      if (window.ethereum) {
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

    const fetchUserData = async () => {
      try {
        setLoading(true);

        // Fetch blockchain data if wallet is connected
        if (currentAccount) {
          console.log('Fetching blockchain data for account:', currentAccount);

          // Fetch token balance
          try {
            const balance = await getUserTokenBalance(currentAccount);
            setTokenBalance(balance);
            console.log('Token balance fetched:', balance.toString());
          } catch (error) {
            console.error('Failed to fetch token balance:', error);
          }

          // Fetch waste statistics
          try {
            console.log('Fetching waste reports by status...');
            const reportedCount = await getWasteReportsByStatus(0, 100, 0);
            const collectedCount = await getWasteReportsByStatus(1, 100, 0);
            const processedCount = await getWasteReportsByStatus(2, 100, 0);

            console.log('Waste reports counts:', {
              reported: reportedCount.length,
              collected: collectedCount.length,
              processed: processedCount.length
            });

            // Filter reports to only show the current user's reports
            const filterReportsByCurrentUser = (reports) => {
              return reports.filter(report => {
                // Check if the report belongs to the current user
                return report.reporter && report.reporter.toLowerCase() === currentAccount.toLowerCase();
              });
            };

            // Filter each category
            const userReportedCount = filterReportsByCurrentUser(reportedCount);
            const userCollectedCount = filterReportsByCurrentUser(collectedCount);
            const userProcessedCount = filterReportsByCurrentUser(processedCount);

            console.log('User\'s waste reports counts:', {
              reported: userReportedCount.length,
              collected: userCollectedCount.length,
              processed: userProcessedCount.length
            });

            setReportedWaste(userReportedCount.length);
            setCollectedWaste(userCollectedCount.length);
            setProcessedWaste(userProcessedCount.length);

            // Combine all reports for history
            const allReports = [...userReportedCount, ...userCollectedCount, ...userProcessedCount];

            // Log some sample reports for debugging
            if (allReports.length > 0) {
              console.log('Sample waste report:', {
                ...allReports[0],
                reportTime: allReports[0].reportTime.toString(),
                quantity: allReports[0].quantity.toString(),
                plasticType: allReports[0].plasticType.toString()
              });
            }

            // Sort by report time (newest first) - using our safe sorting function
            allReports.sort((a, b) => {
              try {
                // Convert timestamps to numbers, handling BigInt if needed
                const getTimeValue = (item) => {
                  if (item.reportTime) {
                    return typeof item.reportTime === 'bigint'
                      ? Number(item.reportTime)
                      : Number(item.reportTime);
                  }
                  return 0;
                };

                const timeA = getTimeValue(b); // Note: b first for descending order
                const timeB = getTimeValue(a);
                return timeA - timeB;
              } catch (error) {
                console.error('Error sorting waste reports:', error);
                return 0;
              }
            });

            setWasteReports(allReports);
            console.log('Blockchain waste reports fetched:', allReports.length);
          } catch (error) {
            console.error('Failed to fetch blockchain waste reports:', error);
          }
        } else {
          console.log('No wallet connected, skipping blockchain data fetch');
        }

        // Also fetch from backend if user is logged in
        if (isAuthenticated) {
          console.log('Fetching backend data for user:', user.email || user.username);
          try {
            const response = await api.user.getWasteReports();
            console.log('Backend waste reports response:', response);

            if (response.reports && response.reports.length > 0) {
              console.log(`Received ${response.reports.length} reports from backend`);

              // Log a sample backend report for debugging
              if (response.reports.length > 0) {
                console.log('Sample backend report:', response.reports[0]);
              }

              // Filter backend reports to only show the current user's reports
              const userBackendReports = response.reports.filter(report => {
                return report.walletAddress &&
                       report.walletAddress.toLowerCase() === currentAccount.toLowerCase();
              });

              console.log(`Found ${userBackendReports.length} backend reports for current user out of ${response.reports.length} total`);

              // Merge blockchain and backend data
              setWasteReports(prev => {
                console.log(`Merging ${prev.length} blockchain reports with ${userBackendReports.length} backend reports`);

                const combined = [...prev];
                userBackendReports.forEach(backendReport => {
                  // Check if report already exists in the array
                  const exists = combined.some(r => r.qrCodeHash === backendReport.qrCodeHash);
                  if (!exists) {
                    // Convert backend report to match blockchain format
                    const formattedReport = {
                      ...backendReport,
                      // Convert backend status to blockchain status
                      status: backendReport.status === 'reported' ? 0 :
                             backendReport.status === 'collected' ? 1 : 2,
                      // Ensure reportTime is a number
                      reportTime: backendReport.reportTime || new Date(backendReport.createdAt).getTime() / 1000,
                      // Ensure quantity is a number
                      quantity: Number(backendReport.quantity) || 0,
                      // Add reporter field if missing
                      reporter: backendReport.walletAddress || currentAccount
                    };

                    combined.push(formattedReport);
                  }
                });
                return combined.sort((a, b) => {
                  try {
                    // Convert timestamps to numbers, handling BigInt if needed
                    const getTimeValue = (item) => {
                      if (item.reportTime) {
                        return typeof item.reportTime === 'bigint'
                          ? Number(item.reportTime)
                          : Number(item.reportTime);
                      } else if (item.createdAt) {
                        return new Date(item.createdAt).getTime() / 1000;
                      }
                      return 0;
                    };

                    const timeA = getTimeValue(b); // Note: b first for descending order
                    const timeB = getTimeValue(a);
                    return timeA - timeB;
                  } catch (error) {
                    console.error('Error sorting waste reports:', error);
                    return 0;
                  }
                });
              });
              console.log('Combined waste reports:', wasteReports.length);
            }
          } catch (error) {
            console.error('Failed to fetch backend waste reports:', error);
          }
        } else {
          console.log('User not authenticated with backend, skipping backend data fetch');
        }

      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch data if component is mounted
    if (isMounted) {
      fetchUserData();
    }
  }, [currentAccount, wasteVanContract, getUserTokenBalance, getWasteReportsByStatus, user, connectWallet, isMounted, refreshTrigger]);

  // Helper function to format date from timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';

    try {
      // Convert BigInt to Number if needed
      let timestampNum;
      if (typeof timestamp === 'bigint') {
        console.log('Converting BigInt timestamp to Number:', timestamp.toString());
        timestampNum = Number(timestamp);
      } else {
        timestampNum = Number(timestamp);
      }

      // Check if timestamp is in seconds (blockchain) or milliseconds (JS Date)
      const date = timestampNum > 10000000000
        ? new Date(timestampNum) // Already in milliseconds
        : new Date(timestampNum * 1000); // Convert from seconds to milliseconds

      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error, 'Timestamp:', timestamp, 'Type:', typeof timestamp);
      return 'Invalid Date';
    }
  };

  // Helper function to get status badge
  const getStatusBadge = (status) => {
    if (status === undefined || status === null) return 'Unknown';

    // Convert BigInt to Number if needed
    if (typeof status === 'bigint') {
      console.log('Converting BigInt status to Number:', status.toString());
      status = Number(status);
    }

    // Convert numeric status to string if needed
    const statusStr = typeof status === 'number'
      ? (status === 0 ? 'reported' : status === 1 ? 'collected' : 'processed')
      : status;

    switch(statusStr) {
      case 'reported':
      case 0:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            Reported
          </span>
        );
      case 'collected':
      case 1:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Collected
          </span>
        );
      case 'processed':
      case 2:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Processed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Unknown
          </span>
        );
    }
  };

  // Helper function to get plastic type name
  const getPlasticTypeName = (type) => {
    if (type === undefined || type === null) return 'Unknown';

    // Convert BigInt to Number if needed
    if (typeof type === 'bigint') {
      console.log('Converting BigInt plastic type to Number:', type.toString());
      type = Number(type);
    }

    // Convert to string for lookup if it's a number
    if (typeof type === 'number') {
      type = type.toString();
    }

    const plasticTypes = {
      '0': 'PET',
      '1': 'HDPE',
      '2': 'PVC',
      '3': 'LDPE',
      '4': 'PP',
      '5': 'PS',
      '6': 'Other',
      'PET': 'PET',
      'HDPE': 'HDPE',
      'PVC': 'PVC',
      'LDPE': 'LDPE',
      'PP': 'PP',
      'PS': 'PS',
      'Other': 'Other'
    };

    return plasticTypes[type] || 'Unknown';
  };

  // Don't render anything until client-side hydration is complete
  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Function to handle waste report updates
  const handleWasteReportUpdate = () => {
    console.log('Waste report updated, refreshing data...');
    // Trigger a refresh of the user dashboard data
    setRefreshTrigger(prev => prev + 1);
  };

  // Function to handle viewing QR code
  const handleViewQrCode = async (qrCodeHash) => {
    if (!qrCodeHash) return;

    setLoadingQrCode(true);
    setSelectedQrCode(null);
    setQrCodeModalOpen(true);

    try {
      console.log('Fetching QR code for hash:', qrCodeHash);
      const response = await api.waste.getQRCode(qrCodeHash);
      console.log('QR code response:', response);
      setSelectedQrCode(response);
    } catch (error) {
      console.error('Failed to fetch QR code:', error);
      // Create a fallback QR code with just the hash
      setSelectedQrCode({
        qrCodeHash: qrCodeHash,
        qrCodeImage: null
      });
    } finally {
      setLoadingQrCode(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        {currentAccount && (
          <p className="text-gray-600 mt-2">
            Wallet: {`${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}`}
            {user && user.username && (
              <span className="ml-2">| Username: {user.username}</span>
            )}
          </p>
        )}
      </div>

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
          {/* Navigation */}
          <div className="flex space-x-2 mb-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-md ${activeTab === 'overview' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-md ${activeTab === 'history' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
            >
              Waste History
            </button>
            <button
              onClick={() => {
                // Always switch to the report tab - the ReportWasteForm component will handle
                // wallet connection if needed
                console.log('Switching to report tab, wallet status:', currentAccount ? 'connected' : 'not connected');
                setActiveTab('report');
              }}
              className={`px-4 py-2 rounded-md ${activeTab === 'report' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
            >
              Report Waste
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">Token Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Coins className="h-8 w-8 text-yellow-500 mr-3" />
                      <div>
                        <p className="text-2xl font-bold">
                          {tokenBalance ? ethers.formatUnits(tokenBalance, 18) : '0'} WVAN
                        </p>
                        <p className="text-sm text-gray-500">
                          WasteVan Tokens
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">Waste Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Recycle className="h-8 w-8 text-green-500 mr-3" />
                      <div className="grid grid-cols-3 gap-4 w-full">
                        <div>
                          <p className="text-xl font-bold">{reportedWaste}</p>
                          <p className="text-xs text-gray-500">Reported</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold">{collectedWaste}</p>
                          <p className="text-xs text-gray-500">Collected</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold">{processedWaste}</p>
                          <p className="text-xs text-gray-500">Processed</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Recent Waste Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  {wasteReports.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No waste reports found</p>
                  ) : (
                    <div className="space-y-4">
                      {wasteReports.slice(0, 3).map((report, index) => (
                        <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium">{getPlasticTypeName(report.plasticType)}</div>
                            <div className="text-sm text-gray-500">{formatDate(report.reportTime)}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {typeof report.quantity === 'bigint'
                                ? report.quantity.toString()
                                : report.quantity?.toString() || '0'} grams
                            </div>
                            <div className="flex items-center space-x-2 justify-end">
                              {getStatusBadge(report.status)}
                              <button
                                className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
                                onClick={() => handleViewQrCode(report.qrCodeHash)}
                              >
                                <QrCode className="h-3 w-3 mr-1" />
                                QR
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => setActiveTab('history')}
                        className="text-sm text-green-600 hover:text-green-800 font-medium"
                      >
                        View all reports →
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <Card>
              <CardHeader>
                <CardTitle>Waste Report History</CardTitle>
              </CardHeader>
              <CardContent>
                {wasteReports.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No waste reports found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Date</th>
                          <th className="text-left py-3 px-4 font-medium">
                            <div className="flex items-center">
                              Plastic Type
                              <ArrowUpDown className="ml-1 h-4 w-4" />
                            </div>
                          </th>
                          <th className="text-left py-3 px-4 font-medium">
                            <div className="flex items-center">
                              Quantity (g)
                              <ArrowUpDown className="ml-1 h-4 w-4" />
                            </div>
                          </th>
                          <th className="text-left py-3 px-4 font-medium">Status</th>
                          <th className="text-left py-3 px-4 font-medium">QR Code</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wasteReports.map((report, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">{formatDate(report.reportTime)}</td>
                            <td className="py-3 px-4">{getPlasticTypeName(report.plasticType)}</td>
                            <td className="py-3 px-4">
                              {typeof report.quantity === 'bigint'
                                ? report.quantity.toString()
                                : report.quantity?.toString() || '0'}
                            </td>
                            <td className="py-3 px-4">{getStatusBadge(report.status)}</td>
                            <td className="py-3 px-4">
                              <button
                                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                                onClick={() => handleViewQrCode(report.qrCodeHash)}
                              >
                                <QrCode className="h-3 w-3 mr-1" />
                                View QR
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Report Tab */}
          {activeTab === 'report' && (
            <Card>
              <CardContent className="p-6">
                <ReportWasteForm onWasteReported={handleWasteReportUpdate} />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={qrCodeModalOpen}
        onClose={() => setQrCodeModalOpen(false)}
        qrCodeData={selectedQrCode}
        isLoading={loadingQrCode}
      />
    </div>
  );
}