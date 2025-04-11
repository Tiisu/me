'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Loader2, MapPin, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '@/services/api';
import Link from 'next/link';

export default function RecentWasteReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  useEffect(() => {
    fetchRecentReports();
    fetchNotifications();
    
    // Set up polling for new reports and notifications
    const interval = setInterval(() => {
      fetchRecentReports();
      fetchNotifications();
    }, 60000); // 1 minute
    
    return () => clearInterval(interval);
  }, []);

  const fetchRecentReports = async () => {
    try {
      setLoading(true);
      const response = await api.waste.getWasteReports({ 
        status: 'reported',
        limit: 5
      });
      
      if (response && response.reports) {
        setReports(response.reports);
      }
    } catch (error) {
      console.error('Failed to fetch recent waste reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const response = await api.notification.getNotifications({
        limit: 5,
        unreadOnly: true
      });
      
      if (response && response.notifications) {
        // Filter to only waste_reported notifications
        const wasteReportedNotifications = response.notifications.filter(
          notification => notification.type === 'waste_reported'
        );
        setNotifications(wasteReportedNotifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.notification.markAsRead([notificationId]);
      // Remove the notification from the list
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Format time
  const formatTime = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (error) {
      return 'Unknown time';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center">
          <Bell className="h-5 w-5 mr-2 text-blue-500" />
          New Waste Reports
          {notifications.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
              {notifications.length} new
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No new waste reports</p>
        ) : (
          <div className="space-y-4">
            {/* New notifications */}
            {notifications.length > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <h3 className="font-medium text-blue-800 mb-2 flex items-center">
                  <Bell className="h-4 w-4 mr-1" />
                  New Notifications
                </h3>
                <div className="space-y-2">
                  {notifications.map(notification => (
                    <div 
                      key={notification._id} 
                      className="bg-white p-2 rounded border border-blue-100 flex justify-between items-start"
                    >
                      <div>
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-gray-500">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatTime(notification.createdAt)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead(notification._id)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Dismiss
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Recent reports */}
            {reports.map((report) => (
              <div key={report._id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{report.plasticType} - {report.quantity}g</div>
                  <div className="text-sm text-gray-500 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTime(report.createdAt)}
                  </div>
                  {report.location && report.location.coordinates && (
                    <div className="text-xs text-gray-500 flex items-center mt-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      Location available
                    </div>
                  )}
                </div>
                <Link href={`/agent/collect?reportId=${report._id}`}>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    Collect
                  </Button>
                </Link>
              </div>
            ))}
            
            <div className="text-center mt-4">
              <Link href="/agent/collect">
                <Button variant="outline" size="sm">
                  View All Reports
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
