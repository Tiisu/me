'use client';

import React from 'react';
import { Check, Trash2, Bell, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function NotificationDropdown({
  notifications,
  loading,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  unreadCount
}) {
  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'waste_reported':
        return <div className="bg-blue-100 p-2 rounded-full"><Bell className="h-4 w-4 text-blue-500" /></div>;
      case 'waste_collected':
        return <div className="bg-green-100 p-2 rounded-full"><Check className="h-4 w-4 text-green-500" /></div>;
      case 'waste_processed':
        return <div className="bg-purple-100 p-2 rounded-full"><Check className="h-4 w-4 text-purple-500" /></div>;
      default:
        return <div className="bg-gray-100 p-2 rounded-full"><Bell className="h-4 w-4 text-gray-500" /></div>;
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

  // Handle click on notification
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      onMarkAsRead(notification._id);
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50 overflow-hidden">
      <div className="p-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-medium">Notifications</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Mark all as read
          </Button>
        )}
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center p-4 h-24">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No notifications
          </div>
        ) : (
          <div>
            {notifications.map((notification) => (
              <div 
                key={notification._id} 
                className={`p-3 border-b border-gray-100 hover:bg-gray-50 flex items-start ${!notification.read ? 'bg-blue-50' : ''}`}
              >
                <div className="mr-3 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <Link 
                    href={getNotificationLink(notification)}
                    onClick={() => handleNotificationClick(notification)}
                    className="block"
                  >
                    <p className={`text-sm ${!notification.read ? 'font-medium' : ''}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTime(notification.createdAt)}
                    </p>
                  </Link>
                </div>
                
                <div className="ml-2 flex flex-col space-y-1">
                  {!notification.read && (
                    <button
                      onClick={() => onMarkAsRead(notification._id)}
                      className="text-blue-500 hover:text-blue-700"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(notification._id)}
                    className="text-red-500 hover:text-red-700"
                    title="Delete notification"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-2 border-t border-gray-200 text-center">
        <Link 
          href="/notifications"
          className="text-sm text-blue-600 hover:text-blue-800"
          onClick={onClose}
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
}
