"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Award, Trash2, Settings, CheckCircle, XCircle, RefreshCw, Eye, Search, Filter, Clock, FileText, Truck, Recycle, User, Calendar, Mail } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import api from '@/services/api';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

export default function AdminDashboard() {
  const router = useRouter();

  // State for authentication
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // State for dashboard data
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAgents: 0,
    pendingAgents: 0,
    totalWasteReports: 0,
    totalCollections: 0,
    totalProcessed: 0
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // State for agents management
  const [agents, setAgents] = useState([]);
  const [pendingAgents, setPendingAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [agentActionLoading, setAgentActionLoading] = useState(null);

  // State for waste reports
  const [wasteReports, setWasteReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // State for users
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // UI state
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isSystemPaused, setIsSystemPaused] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle admin login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    // Check if username and password are provided
    if (!username || !password) {
      setLoginError('Please enter both username and password');
      return;
    }

    try {
      setIsLoading(true);

      // Try to fetch admin data to check if credentials are valid
      await api.admin.getDashboardStats();

      // If successful, set admin status and fetch dashboard data
      setIsAdmin(true);
      fetchDashboardData();
    } catch (error) {
      console.error('Admin login failed:', error);
      setLoginError('Invalid username or password');
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch dashboard data periodically if user is admin
  useEffect(() => {
    if (!isAdmin) return;

    // Set up polling for real-time updates
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        console.log('Refreshing dashboard data...');
        fetchDashboardData();

        // Also refresh data for the current tab
        if (selectedTab === 'agents') {
          fetchAgents();
          fetchPendingAgents();
        } else if (selectedTab === 'collections') {
          fetchWasteReports();
        } else if (selectedTab === 'users') {
          fetchUsers();
        }
      }
    }, 30000); // Refresh every 30 seconds

    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [selectedTab, isAdmin]);

  // Fetch data based on selected tab
  useEffect(() => {
    if (selectedTab === 'agents') {
      fetchAgents();
      fetchPendingAgents();
    } else if (selectedTab === 'collections') {
      fetchWasteReports();
    } else if (selectedTab === 'users') {
      fetchUsers();
    }
  }, [selectedTab]);

  // Clear messages when changing tabs
  useEffect(() => {
    setError('');
    setSuccess('');
  }, [selectedTab]);

  // Fetch dashboard statistics
  const fetchDashboardData = async () => {
    try {
      setError('');
      setLoadingStats(true);
      const response = await api.admin.getDashboardStats();

      if (response && response.stats) {
        setStats(response.stats);
      } else {
        // If no data is returned, initialize with zeros
        setStats({
          totalUsers: 0,
          totalAgents: 0,
          pendingAgents: 0,
          totalWasteReports: 0,
          totalCollections: 0,
          totalProcessed: 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);

      // Handle 403 error (not admin)
      if (error.response && error.response.status === 403) {
        setError('Access denied: You need admin privileges to view this dashboard.');
      } else {
        setError('Failed to load dashboard statistics: ' + (error.message || 'Unknown error'));
      }

      // Initialize with zeros on error
      setStats({
        totalUsers: 0,
        totalAgents: 0,
        pendingAgents: 0,
        totalWasteReports: 0,
        totalCollections: 0,
        totalProcessed: 0
      });
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch all agents
  const fetchAgents = async () => {
    try {
      setLoadingAgents(true);
      const response = await api.agent.getAllAgents();
      console.log('Agents response:', response); // Debug log

      // Ensure we have an array of agents
      const agentsList = Array.isArray(response) ? response : (response?.agents || []);
      setAgents(agentsList);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      setError('Failed to load agents');
    } finally {
      setLoadingAgents(false);
    }
  };

  // Fetch pending agents
  const fetchPendingAgents = async () => {
    try {
      const response = await api.agent.getPendingAgents();
      console.log('Pending agents response:', response); // Debug log

      // Ensure we have an array of pending agents
      const pendingAgentsList = Array.isArray(response) ? response : (response?.agents || []);
      setPendingAgents(pendingAgentsList);
    } catch (error) {
      console.error('Failed to fetch pending agents:', error);
    }
  };

  // Fetch waste reports
  const fetchWasteReports = async () => {
    try {
      setLoadingReports(true);
      const response = await api.waste.getWasteReports();
      setWasteReports(response.reports || []);
    } catch (error) {
      console.error('Failed to fetch waste reports:', error);
      setError('Failed to load waste reports');
    } finally {
      setLoadingReports(false);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await api.admin.getUsers();
      console.log('Users response:', response); // Debug log

      // Filter out agents from users list
      const filteredUsers = (response.users || []).filter(user => user.userType !== 'agent');
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setError('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Approve agent
  const handleApproveAgent = async (agentId) => {
    try {
      setAgentActionLoading(agentId);
      setError('');
      setSuccess('');

      await api.agent.approveAgent(agentId);

      // Refresh agent lists
      fetchAgents();
      fetchPendingAgents();

      setSuccess('Agent approved successfully');
    } catch (error) {
      console.error('Failed to approve agent:', error);
      setError('Failed to approve agent: ' + (error.message || 'Unknown error'));
    } finally {
      setAgentActionLoading(null);
    }
  };

  // Reject agent
  const handleRejectAgent = async (agentId) => {
    try {
      setAgentActionLoading(agentId);
      setError('');
      setSuccess('');

      await api.agent.rejectAgent(agentId);

      // Refresh agent lists
      fetchAgents();
      fetchPendingAgents();

      setSuccess('Agent rejected successfully');
    } catch (error) {
      console.error('Failed to reject agent:', error);
      setError('Failed to reject agent: ' + (error.message || 'Unknown error'));
    } finally {
      setAgentActionLoading(null);
    }
  };

  // Format date
  const formatDate = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (error) {
      return 'Unknown';
    }
  };

  // Reusable stat card component
  const StatCard = ({ title, value, icon: Icon, color = 'gray' }) => (
    <Card className="flex-1">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className={`bg-${color}-100 p-2 rounded-full`}>
          <Icon className={`h-4 w-4 text-${color}-500`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );

  // Show login form if not authenticated
  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">WasteVan Admin</h1>
            <p className="mt-2 text-gray-600">Enter your credentials to access the admin dashboard</p>
          </div>

          {loginError && (
            <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
              {loginError}
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 flex justify-center items-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Show admin dashboard if authenticated
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">WasteVan Admin Dashboard</h1>
          <p className="text-gray-500">System administration and monitoring</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            console.log('Manual refresh triggered');
            fetchDashboardData();

            // Also refresh data for the current tab
            if (selectedTab === 'agents') {
              fetchAgents();
              fetchPendingAgents();
            } else if (selectedTab === 'collections') {
              fetchWasteReports();
            } else if (selectedTab === 'users') {
              fetchUsers();
            }

            // Show success message
            setSuccess('Dashboard refreshed successfully');

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(''), 3000);
          }}
          className="flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Dashboard
        </Button>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* System Status Alert */}
      {isSystemPaused && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            System is currently paused. All operations are restricted.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      {loadingStats ? (
        <div className="flex justify-center items-center py-8">
          <div className="flex flex-col items-center">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mb-2" />
            <p className="text-gray-500">Loading dashboard statistics...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard title="Total Users" value={stats.totalUsers || 0} icon={Users} color="blue" />
            <StatCard title="Total Agents" value={stats.totalAgents || 0} icon={Award} color="green" />
            <StatCard title="Pending Agents" value={stats.pendingAgents || 0} icon={Clock} color="yellow" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard title="Waste Reports" value={stats.totalWasteReports || 0} icon={FileText} color="purple" />
            <StatCard title="Collections" value={stats.totalCollections || 0} icon={Truck} color="indigo" />
            <StatCard title="Processed" value={stats.totalProcessed || 0} icon={Recycle} color="teal" />
          </div>
        </>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap space-x-2 mb-6">
        {['overview', 'agents', 'collections', 'users', 'settings'].map((tab) => (
          <Button
            key={tab}
            variant={selectedTab === tab ? "default" : "outline"}
            onClick={() => setSelectedTab(tab)}
            className={`capitalize mb-2 ${selectedTab === tab ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <Card className="w-full">
        <CardContent className="p-6">
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">System Overview</h2>
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {wasteReports.slice(0, 5).map((report, index) => (
                        <div key={report._id || index} className="flex justify-between items-center">
                          <span>Report {report._id ? `#${report._id.substring(0, 6)}...` : `#${index + 1}`}</span>
                          <span>{report.quantity || 0}g {report.plasticType || 'Unknown'}</span>
                        </div>
                      ))}

                      {wasteReports.length === 0 && (
                        <div className="text-gray-500 text-center py-2">
                          No recent activity
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>System Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>System Status</span>
                        <span className={`px-2 py-1 rounded-full text-sm ${isSystemPaused ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {isSystemPaused ? 'Paused' : 'Active'}
                        </span>
                      </div>
                      <Button
                        variant={isSystemPaused ? "default" : "destructive"}
                        onClick={() => setIsSystemPaused(!isSystemPaused)}
                        className="w-full bg-gray-800"
                      >
                        {isSystemPaused ? 'Resume System' : 'Pause System'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {selectedTab === 'agents' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Agent Management</h2>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      fetchAgents();
                      fetchPendingAgents();
                    }}
                    className="flex items-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Pending Agents Section */}
              {pendingAgents.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <span className="bg-yellow-100 p-1 rounded-full mr-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                    </span>
                    Pending Approval ({pendingAgents.length})
                  </h3>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead>Wallet Address</TableHead>
                        <TableHead>Registration Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingAgents.map((agent) => (
                        <TableRow key={agent._id}>
                          <TableCell>
                            <div className="font-medium">{agent.user?.username || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{agent.user?.email || 'No email'}</div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {agent.walletAddress ? (
                              <span className="truncate">{agent.walletAddress}</span>
                            ) : (
                              <span className="text-gray-500">No wallet connected</span>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(agent.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-green-600 hover:bg-green-700 flex items-center"
                                onClick={() => handleApproveAgent(agent._id)}
                                disabled={agentActionLoading === agent._id}
                              >
                                {agentActionLoading === agent._id ? (
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex items-center"
                                onClick={() => handleRejectAgent(agent._id)}
                                disabled={agentActionLoading === agent._id}
                              >
                                {agentActionLoading === agent._id ? (
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <XCircle className="h-3 w-3 mr-1" />
                                )}
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* All Agents Section */}
              <div>
                <h3 className="text-lg font-medium mb-4">All Agents ({agents.length})</h3>

                {loadingAgents ? (
                  <div className="flex justify-center items-center p-8">
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : agents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No agents found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead>Wallet Address</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Collections</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agents.map((agent) => (
                        <TableRow key={agent._id}>
                          <TableCell>
                            <div className="font-medium">{agent.user?.username || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{agent.user?.email || 'No email'}</div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {agent.walletAddress ? (
                              <span className="truncate">{agent.walletAddress}</span>
                            ) : (
                              <span className="text-gray-500">No wallet connected</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              agent.status === 'approved' ? 'bg-green-100 text-green-800' :
                              agent.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {agent.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>Collections: {agent.totalCollections || 0}</div>
                              <div>Processed: {agent.totalProcessed || 0}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {agent.status === 'pending' ? (
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700 flex items-center"
                                  onClick={() => handleApproveAgent(agent._id)}
                                  disabled={agentActionLoading === agent._id}
                                >
                                  {agentActionLoading === agent._id ? (
                                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="flex items-center"
                                  onClick={() => handleRejectAgent(agent._id)}
                                  disabled={agentActionLoading === agent._id}
                                >
                                  {agentActionLoading === agent._id ? (
                                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <XCircle className="h-3 w-3 mr-1" />
                                  )}
                                  Reject
                                </Button>
                              </div>
                            ) : agent.status === 'approved' ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex items-center"
                                onClick={() => handleRejectAgent(agent._id)}
                                disabled={agentActionLoading === agent._id}
                              >
                                {agentActionLoading === agent._id ? (
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <XCircle className="h-3 w-3 mr-1" />
                                )}
                                Revoke
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-green-600 hover:bg-green-700 flex items-center"
                                onClick={() => handleApproveAgent(agent._id)}
                                disabled={agentActionLoading === agent._id}
                              >
                                {agentActionLoading === agent._id ? (
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                )}
                                Approve
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'collections' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Waste Collections</h2>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={fetchWasteReports}
                    className="flex items-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh
                  </Button>
                </div>
              </div>

              {loadingReports ? (
                <div className="flex justify-center items-center p-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : wasteReports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No waste reports found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity (g)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wasteReports.map((report) => (
                      <TableRow key={report._id}>
                        <TableCell className="font-mono text-xs">
                          {report._id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{report.user?.username || 'Unknown'}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {report.walletAddress ? report.walletAddress.substring(0, 8) + '...' : 'No wallet'}
                          </div>
                        </TableCell>
                        <TableCell>{report.plasticType}</TableCell>
                        <TableCell>{report.quantity}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            report.status === 'reported' ? 'bg-blue-100 text-blue-800' :
                            report.status === 'collected' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {report.status}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(report.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {selectedTab === 'users' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">User Management</h2>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={fetchUsers}
                    className="flex items-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh
                  </Button>
                </div>
              </div>

              {loadingUsers ? (
                <div className="flex justify-center items-center p-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No users found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Wallet Address</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="bg-gray-100 p-2 rounded-full">
                              <User className="h-4 w-4 text-gray-500" />
                            </div>
                            <div>
                              <div className="font-medium">{user.username}</div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {user.walletAddress ? (
                            <span className="truncate">{user.walletAddress}</span>
                          ) : (
                            <span className="text-red-500 font-semibold">No wallet connected</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.userType === 'admin' ? 'bg-purple-100 text-purple-800' :
                            user.userType === 'agent' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {user.userType}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(user.createdAt)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {selectedTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">System Settings</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-md">Reward Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium mb-2">Points per kg (PET Plastic)</h3>
                        <div className="flex space-x-2">
                          <Input type="number" defaultValue="10" />
                          <Button className="bg-green-600 hover:bg-green-700">Update</Button>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium mb-2">Points per kg (HDPE Plastic)</h3>
                        <div className="flex space-x-2">
                          <Input type="number" defaultValue="15" />
                          <Button className="bg-green-600 hover:bg-green-700">Update</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-md">System Controls</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium mb-2">System Status</h3>
                        <Button
                          variant={isSystemPaused ? "default" : "destructive"}
                          onClick={() => setIsSystemPaused(!isSystemPaused)}
                          className="w-full"
                        >
                          {isSystemPaused ? 'Resume System' : 'Pause System'}
                        </Button>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium mb-2">Blockchain Connection</h3>
                        <Button
                          variant="outline"
                          className="w-full"
                        >
                          Test Connection
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


// Generate Reports after every verifcation