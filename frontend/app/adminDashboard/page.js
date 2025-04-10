"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Award, Trash2, Settings } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const mockData = {
  agents: [
    { address: '0x123...abc', status: 'pending', timestamp: Date.now() },
    { address: '0x456...def', status: 'active', timestamp: Date.now() - 86400000 }
  ],
  collections: [
    { id: 1, type: 'Plastic', weight: 10, points: 100 },
    { id: 2, type: 'Metal', weight: 5, points: 75 }
  ]
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 156,
    totalPoints: 12450,
    totalCollections: 89
  });
  
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isSystemPaused, setIsSystemPaused] = useState(false);

  const StatCard = ({ title, value, icon: Icon }) => (
    <Card className="flex-1">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Waste Management Dashboard</h1>
        <p className="text-gray-500">System administration and monitoring</p>
      </div>

      {/* System Status Alert */}
      {isSystemPaused && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            System is currently paused. All operations are restricted.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard title="Total Users" value={stats.totalUsers} icon={Users} />
        <StatCard title="Total Points" value={stats.totalPoints} icon={Award} />
        <StatCard title="Total Collections" value={stats.totalCollections} icon={Trash2} />
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-6 ">
        {['overview', 'agents', 'collections', 'settings'].map((tab) => (
          <Button 
            key={tab}
            variant={selectedTab === tab ? "default" : "outline"}
            onClick={() => setSelectedTab(tab)}
            className="capitalize bg-green-800 font-bold text-white onhover:"
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
                      {mockData.collections.map((collection) => (
                        <div key={collection.id} className="flex justify-between items-center">
                          <span>Collection #{collection.id}</span>
                          <span>{collection.weight}kg {collection.type}</span>
                        </div>
                      ))}
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
              <h2 className="text-xl font-semibold mb-4">Agent Management</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockData.agents.map((agent) => (
                    <TableRow key={agent.address}>
                      <TableCell className="font-mono">{agent.address}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-sm ${
                          agent.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {agent.status}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(agent.timestamp).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {agent.status === 'pending' ? (
                          <div className="space-x-2">
                            <Button size="sm" variant="default">Approve</Button>
                            <Button size="sm" variant="destructive">Reject</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="destructive">Revoke</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {selectedTab === 'collections' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Waste Collections</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Weight (kg)</TableHead>
                    <TableHead>Points Awarded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockData.collections.map((collection) => (
                    <TableRow key={collection.id}>
                      <TableCell>#{collection.id}</TableCell>
                      <TableCell>{collection.type}</TableCell>
                      <TableCell>{collection.weight}</TableCell>
                      <TableCell>{collection.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {selectedTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">System Settings</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Points per kg (Plastic)</h3>
                    <div className="flex space-x-2">
                      <Input type="number" defaultValue="10" />
                      <Button className="bg-gray-800">Update</Button>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-2">Points per kg (Metal)</h3>
                    <div className="flex space-x-2">
                      <Input type="number" defaultValue="15" />
                      <Button className="bg-gray-800">Update</Button>
                    </div>
                  </div>
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