"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";
import {
  Bell,
  MessageCircle,
  Heart,
  UserPlus,
  X,
  Check,
  CheckCheck,
  Trash2,
  RefreshCw,
  Clock,
  ChevronRight,
} from "lucide-react";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "@/lib/actions/notificationActions";
import { formatTimeAgo } from "@/lib/utils";

const NotificationsPage = () => {
  const { user } = useAuthStore();
  const router = useRouter();
  
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastNotificationId, setLastNotificationId] = useState(null);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(new Set());

  // Load notifications
  const loadNotifications = useCallback(async (loadMore = false) => {
    if (!user?.id) return;

    try {
      if (loadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      const result = await getUserNotifications(
        user.id,
        20,
        loadMore ? lastNotificationId : null
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      if (loadMore) {
        setNotifications(prev => [...prev, ...result.notifications]);
      } else {
        setNotifications(result.notifications);
      }

      setHasMore(result.hasMore);
      setLastNotificationId(result.lastNotificationId);
      setError("");

    } catch (err) {
      console.error("Error loading notifications:", err);
      setError("Failed to load notifications");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [user?.id, lastNotificationId]);

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case "comment":
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case "like":
        return <Heart className="w-5 h-5 text-red-500" />;
      case "follow":
        return <UserPlus className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    // Mark as read if not already
    if (!notification.isRead) {
      setActionLoading(prev => new Set([...prev, notification.id]));
      await markNotificationAsRead(notification.id);
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(notification.id);
        return newSet;
      });

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, isRead: true } : n
        )
      );
    }

    // Navigate to post
    if (notification.postId) {
      router.push(`/post/${notification.postId}`);
    }
  };

  // Mark single notification as read
  const handleMarkAsRead = async (notificationId, e) => {
    e.stopPropagation();
    setActionLoading(prev => new Set([...prev, notificationId]));
    
    try {
      const result = await markNotificationAsRead(notificationId);
      if (result.success) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    
    setActionLoading(prev => new Set([...prev, "mark-all"]));
    
    try {
      const result = await markAllNotificationsAsRead(user.id);
      if (result.success) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true }))
        );
      }
    } catch (err) {
      console.error("Error marking all as read:", err);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete("mark-all");
        return newSet;
      });
    }
  };

  // Delete notification
  const handleDeleteNotification = async (notificationId, e) => {
    e.stopPropagation();
    setActionLoading(prev => new Set([...prev, notificationId]));
    
    try {
      const result = await deleteNotification(notificationId);
      if (result.success) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  // Get unread count
  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              {unreadCount > 0 && (
                <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => loadNotifications(false)}
                disabled={isLoading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
              
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={actionLoading.has("mark-all")}
                  className="flex items-center space-x-1 px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading.has("mark-all") ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCheck className="w-4 h-4" />
                  )}
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {notifications.length === 0 && !isLoading ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications yet</h3>
            <p className="text-gray-600">You&apos;ll see notifications here when others interact with your posts.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {notifications.map((notification, index) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`relative flex items-start p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.isRead ? "bg-blue-50/50" : ""
                } ${index !== notifications.length - 1 ? "border-b border-gray-100" : ""}`}
              >
                {/* Unread indicator */}
                {!notification.isRead && (
                  <div className="absolute left-2 top-6 w-2 h-2 bg-primary rounded-full"></div>
                )}

                {/* Icon */}
                <div className="flex-shrink-0 ml-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 ml-4 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.isRead ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                        {notification.message}
                      </p>
                      
                      {notification.postTitle && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          on &quot;{notification.postTitle}&quot;
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-2 mt-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-1 ml-2">
                      {!notification.isRead && (
                        <button
                          onClick={(e) => handleMarkAsRead(notification.id, e)}
                          disabled={actionLoading.has(notification.id)}
                          className="p-1 text-gray-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          title="Mark as read"
                        >
                          {actionLoading.has(notification.id) ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      
                      <button
                        onClick={(e) => handleDeleteNotification(notification.id, e)}
                        disabled={actionLoading.has(notification.id)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Delete notification"
                      >
                        {actionLoading.has(notification.id) ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                      
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Load more button */}
            {hasMore && (
              <div className="p-4 border-t border-gray-100">
                <button
                  onClick={() => loadNotifications(true)}
                  disabled={isLoadingMore}
                  className="w-full py-2 px-4 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isLoadingMore ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Loading more...</span>
                    </>
                  ) : (
                    <span>Load more notifications</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;