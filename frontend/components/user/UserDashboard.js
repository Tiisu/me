'use client';

import { useState, useEffect, useContext } from 'react';
import { Loader2, Recycle, Coins, Clock, CheckCircle, AlertCircle, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EcoConnectContext } from '@/context/EcoConnect';
import { ethers } from 'ethers';
import ReportWasteForm from './ReportWasteForm';
import api from '@/services/api';

export default function UserDashboard() {
  const {
    currentAccount,
    wasteVanTokenContract,
    getUserTokenBalance,
    getWasteReportsByStatus,
    user
  } = useContext(EcoConnectContext);

  const [tokenBalance, setTokenBalance] = useState(null);
  const [reportedWaste, setReportedWaste] = useState(0);
  const [collectedWaste, setCollectedWaste] = useState(0);
  const [processedWaste, setProcessedWaste] = useState(0);
  const [wasteReports, setWasteReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentAccount) return;

      try {
        setLoading(true);

        // Fetch token balance
        const balance = await getUserTokenBalance(currentAccount);
        setTokenBalance(balance);

        // Fetch waste statistics
        const reportedCount = await getWasteReportsByStatus(0, 100, 0);
        const collectedCount = await getWasteReportsByStatus(1, 100, 0);
        const processedCount = await getWasteReportsByStatus(2, 100, 0);

        setReportedWaste(reportedCount.length);
        setCollectedWaste(collectedCount.length);
        setProcessedWaste(processedCount.length);

        // Combine all reports for history
        const allReports = [...reportedCount, ...collectedCount, ...processedCount];

        // Sort by report time (newest first)
        allReports.sort((a, b) => b.reportTime - a.reportTime);

        setWasteReports(allReports);

        // Also fetch from backend if user is logged in
        if (user) {
          try {
            const response = await api.user.getWasteReports();
            if (response.reports && response.reports.length > 0) {
              // Merge blockchain and backend data
              // This is a simplified approach - in a real app, you'd want to match by IDs
              setWasteReports(prev => {
                const combined = [...prev];
                response.reports.forEach(backendReport => {
                  // Check if report already exists in the array
                  const exists = combined.some(r => r.qrCodeHash === backendReport.qrCodeHash);
                  if (!exists) {
                    combined.push({
                      ...backendReport,
                      // Convert backend status to blockchain status
                      status: backendReport.status === 'reported' ? 0 :
                             backendReport.status === 'collected' ? 1 : 2
                    });
                  }
                });
                return combined.sort((a, b) => {
                  const timeA = b.reportTime || new Date(b.createdAt).getTime() / 1000;
                  const timeB = a.reportTime || new Date(a.createdAt).getTime() / 1000;
                  return timeA - timeB;
                });
              });
            }
          } catch (error) {
            console.error('Failed to fetch backend waste reports:', error);
          }
        }

      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentAccount, getUserTokenBalance, getWasteReportsByStatus, user]);

  // Helper function to format date from timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';

    // Check if timestamp is in seconds (blockchain) or milliseconds (JS Date)
    const date = timestamp > 10000000000
      ? new Date(timestamp) // Already in milliseconds
      : new Date(timestamp * 1000); // Convert from seconds to milliseconds

    return date.toLocaleString();
  };

  // Helper function to get status badge
  const getStatusBadge = (status) => {
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
    const plasticTypes = {
      0: 'PET',
      1: 'HDPE',
      2: 'PVC',
      3: 'LDPE',
      4: 'PP',
      5: 'PS',
      6: 'Other',
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

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">User Dashboard</h1>

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
              onClick={() => setActiveTab('report')}
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
                            <div className="font-medium">{report.quantity?.toString() || '0'} grams</div>
                            {getStatusBadge(report.status)}
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
                            <td className="py-3 px-4">{report.quantity?.toString() || '0'}</td>
                            <td className="py-3 px-4">{getStatusBadge(report.status)}</td>
                            <td className="py-3 px-4">
                              <button className="text-blue-600 hover:text-blue-800 text-sm">
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
                <ReportWasteForm />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}