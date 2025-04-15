'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Loader2, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '@/services/api';
import Link from 'next/link';

export default function RecentWasteReports({ onWasteCollected }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  useEffect(() => {
    // Initial fetch
    fetchRecentReports();
    fetchNotifications();

    // Set up polling for new reports and notifications
    const interval = setInterval(() => {
      console.log('Polling for new reports and notifications...');
      fetchRecentReports();
      fetchNotifications();
    }, 15000); // 15 seconds

    // Set up a more frequent check just for notifications
    const notificationInterval = setInterval(() => {
      console.log('Quick check for new notifications...');
      fetchNotifications();
    }, 5000); // 5 seconds

    return () => {
      clearInterval(interval);
      clearInterval(notificationInterval);
    };
  }, []);

  const fetchRecentReports = async () => {
    try {
      setLoading(true);
      // Get all waste reports with status 'reported'
      const response = await api.waste.getWasteReports({
        status: 'reported',
        limit: 20 // Increased limit to show more reports
      });

      if (response && response.reports) {
        console.log(`Fetched ${response.reports.length} waste reports with status 'reported'`);
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
      console.log('Fetching agent notifications...');
      const response = await api.notification.getNotifications({
        limit: 10,
        unreadOnly: true
      });

      if (response && response.notifications) {
        console.log('All notifications:', response.notifications);
        // Filter to only waste_reported notifications
        const wasteReportedNotifications = response.notifications.filter(
          notification => notification.type === 'waste_reported'
        );
        console.log('Waste report notifications:', wasteReportedNotifications);
        setNotifications(wasteReportedNotifications);
      } else {
        console.log('No notifications found in response');
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

  // Function to handle waste collection
  const handleCollectWaste = async (reportId) => {
    try {
      console.log(`Collecting waste report with ID: ${reportId}`);

      // Call the API to collect waste
      const response = await api.waste.collectWaste(reportId);

      if (response && response.success) {
        console.log('Waste collected successfully:', response);

        // Remove the report from the list
        setReports(prev => prev.filter(r => r._id !== reportId));

        // Refresh the reports list
        fetchRecentReports();

        // Notify parent component about the collection
        if (onWasteCollected) {
          onWasteCollected(reportId);
        }

        // Show success message
        alert('Waste collected successfully!');
      }
    } catch (error) {
      console.error('Failed to collect waste:', error);
      alert(`Failed to collect waste: ${error.message || 'Unknown error'}`);
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
            {/* New notifications - show at the top with animation */}
            {notifications.length > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg border-2 border-blue-300 shadow-md animate-pulse">
                <h3 className="font-bold text-blue-800 mb-2 flex items-center text-lg">
                  <Bell className="h-5 w-5 mr-2 animate-bounce" />
                  New Waste Reports Available!
                </h3>
                <div className="space-y-2">
                  {notifications.map(notification => (
                    <div
                      key={notification._id}
                      className="bg-white p-3 rounded-md border-2 border-blue-200 shadow-sm flex justify-between items-start hover:shadow-md transition-all"
                    >
                      <div className="flex-1">
                        <p className="text-base font-semibold text-blue-700">{notification.title}</p>
                        <p className="text-sm text-gray-700">{notification.message}</p>
                        <div className="flex items-center mt-2">
                          <Clock className="h-3 w-3 text-gray-400 mr-1" />
                          <p className="text-xs text-gray-500">{formatTime(notification.createdAt)}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsRead(notification._id)}
                        className="text-blue-600 hover:text-blue-800 text-xs border-blue-200 hover:bg-blue-50 ml-2"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent reports */}
            <h3 className="font-semibold text-lg mb-3">Waste Reports Awaiting Collection</h3>
            {reports.length === 0 ? (
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No waste reports awaiting collection</p>
              </div>
            ) : (
              reports.map((report) => (
                <div key={report._id} className="flex flex-col p-4 bg-gray-50 rounded-lg border border-gray-200 mb-3 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-lg">{report.plasticType} - {report.quantity}g</div>
                      <div className="text-sm text-gray-600 flex items-center mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTime(report.createdAt)}
                      </div>
                      {report.location && report.location.coordinates && (
                        <div className="text-xs text-gray-500 flex items-center mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          Location available
                        </div>
                      )}
                      {report.user && (
                        <div className="text-xs text-gray-500 mt-1">
                          Reported by: {report.user.username || report.walletAddress}
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <Link href={`/agent/collect?reportId=${report._id}`}>
                        <Button variant="outline" size="sm" className="text-blue-600 border-blue-200">
                          View Details
                        </Button>
                      </Link>

                      <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleCollectWaste(report._id)}
                      >
                        Collect Waste
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}

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
