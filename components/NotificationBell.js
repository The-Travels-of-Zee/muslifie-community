"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { getUnreadNotificationCount } from "@/lib/actions/notificationActions";

const NotificationBell = () => {
  const { user } = useAuthStore();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Load unread count
  const loadUnreadCount = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const result = await getUnreadNotificationCount(user.id);
      if (!result.error) {
        setUnreadCount(result.count);
      }
    } catch (error) {
      console.error("Error loading unread count:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load count on mount and when user changes
  useEffect(() => {
    loadUnreadCount();
  }, [user?.id]);

  // Refresh count every 30 seconds when tab is active
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      if (!document.hidden) {
        loadUnreadCount();
      }
    }, 30000);

    // Also refresh when tab becomes active
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadUnreadCount();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?.id]);

  // Handle click
  const handleClick = () => {
    router.push("/notifications");
  };

  if (!user) return null;

  return (
    <button
      onClick={handleClick}
      className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      title={`${unreadCount} unread notifications`}
    >
      <Bell className={`w-6 h-6 ${isLoading ? "animate-pulse" : ""}`} />

      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
