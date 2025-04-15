'use client';

import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/services/api';
import NotificationDropdown from './NotificationDropdown';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch notification count on mount and every 30 seconds
  useEffect(() => {
    fetchNotificationCount();

    // Set up polling for new notifications
    const interval = setInterval(() => {
      console.log('Checking for new notifications...');
      fetchNotificationCount();
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, []);

  // Fetch notifications when dropdown is opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotificationCount = async () => {
    try {
      const response = await api.notification.getNotificationCount();
      console.log('Notification count response:', response);
      setUnreadCount(response.unreadCount);

      // If we have unread notifications, fetch them immediately
      if (response.unreadCount > 0) {
        console.log(`Found ${response.unreadCount} unread notifications, fetching details...`);
        fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      console.log('Fetching notifications for dropdown...');
      const response = await api.notification.getNotifications({ limit: 10 });
      console.log('Notifications response:', response);
      setNotifications(response.notifications);
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
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
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
      // Reset unread count
      setUnreadCount(0);
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
      // Update unread count if needed
      const deletedNotification = notifications.find(n => n._id === notificationId);
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const toggleDropdown = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={toggleDropdown}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          loading={loading}
          onClose={() => setIsOpen(false)}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onDelete={handleDeleteNotification}
          unreadCount={unreadCount}
        />
      )}
    </div>
  );
}
