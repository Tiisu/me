'use client';

import React, { useState, useEffect } from 'react';
import { Check, Trash2, Bell, Loader2, CheckCheck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import api from '@/services/api';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  useEffect(() => {
    fetchNotifications();
  }, [page, filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = { 
        page, 
        limit: 10,
        unreadOnly: filter === 'unread'
      };
      
      const response = await api.notification.getNotifications(params);
      setNotifications(response.notifications);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.notification.markAsRead([notificationId]);
      // Update the notification in the list
      setNotifications(prev => 
        prev.map(notification => 
          notification._id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.notification.markAllAsRead();
      // Update all notifications in the list
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await api.notification.deleteNotification(notificationId);
      // Remove the notification from the list
      setNotifications(prev => 
        prev.filter(notification => notification._id !== notificationId)
      );
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'waste_reported':
        return <div className="bg-blue-100 p-3 rounded-full"><Bell className="h-5 w-5 text-blue-500" /></div>;
      case 'waste_collected':
        return <div className="bg-green-100 p-3 rounded-full"><Check className="h-5 w-5 text-green-500" /></div>;
      case 'waste_processed':
        return <div className="bg-purple-100 p-3 rounded-full"><Check className="h-5 w-5 text-purple-500" /></div>;
      default:
        return <div className="bg-gray-100 p-3 rounded-full"><Bell className="h-5 w-5 text-gray-500" /></div>;
    }
  };

  // Get notification link based on type and related item
  const getNotificationLink = (notification) => {
    const { type, relatedItem } = notification;
    
    if (type === 'waste_reported' && relatedItem?.itemType === 'waste_report') {
      return `/agent/collect?reportId=${relatedItem.itemId}`;
    }
    
    return '#';
  };

  // Format notification time
  const formatTime = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (error) {
      return 'Unknown time';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>
      
      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
          <CardTitle className="text-2xl font-bold">Notifications</CardTitle>
          
          <div className="flex space-x-2">
            <div className="flex rounded-md overflow-hidden border border-gray-300">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 text-sm ${filter === 'unread' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
              >
                Unread
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-3 py-1 text-sm ${filter === 'read' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
              >
                Read
              </button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="flex items-center"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No notifications found
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div 
                  key={notification._id} 
                  className={`p-4 border rounded-lg ${!notification.read ? 'bg-blue-50 border-blue-100' : 'border-gray-200'}`}
                >
                  <div className="flex items-start">
                    <div className="mr-4">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <Link 
                        href={getNotificationLink(notification)}
                        className="block"
                      >
                        <h3 className={`text-lg ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
                          {notification.title}
                        </h3>
                        <p className="text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center mt-2 text-sm text-gray-500">
                          <span>{formatTime(notification.createdAt)}</span>
                          {notification.sender && (
                            <span className="ml-4">
                              From: {notification.sender.username}
                            </span>
                          )}
                        </div>
                      </Link>
                    </div>
                    
                    <div className="ml-4 flex space-x-2">
                      {!notification.read && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification._id)}
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteNotification(notification._id)}
                        title="Delete notification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <div className="flex space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <Button
                        key={p}
                        variant={p === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    ))}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
