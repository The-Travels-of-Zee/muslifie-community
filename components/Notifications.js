import React, { useState, useEffect } from "react";
import { X, Bell, Check, Trash2, MoreVertical, Heart, MessageCircle, UserPlus, Star } from "lucide-react";

const Notifications = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "like",
      message: "Sarah liked your post about Mecca",
      description: "Your spiritual journey post received a new like",
      time: "2 min ago",
      unread: true,
      profileImage: null,
      initials: "SL",
      action: "liked",
    },
    {
      id: 2,
      type: "comment",
      message: "Ahmed commented on your tour guide",
      description: '"This is really helpful! Thanks for sharing."',
      time: "1 hour ago",
      unread: true,
      profileImage: null,
      initials: "AH",
      action: "commented on",
    },
    {
      id: 3,
      type: "follow",
      message: "Fatima started following you",
      description: "You have a new follower",
      time: "3 hours ago",
      unread: false,
      profileImage: null,
      initials: "FM",
      action: "started following",
    },
    {
      id: 4,
      type: "bookmark",
      message: "Your post was bookmarked by 5 people",
      description: "Your Hajj preparation guide is gaining popularity",
      time: "5 hours ago",
      unread: false,
      profileImage: null,
      initials: "★",
      action: "bookmarked",
    },
    {
      id: 5,
      type: "like",
      message: "Omar and 3 others liked your comment",
      description: "Your thoughtful response is being appreciated",
      time: "1 day ago",
      unread: false,
      profileImage: null,
      initials: "OM",
      action: "liked",
    },
  ]);

  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [showActions, setShowActions] = useState(false);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getNotificationIcon = (type) => {
    switch (type) {
      case "like":
        return <Heart className="w-4 h-4 text-red-500" />;
      case "comment":
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case "follow":
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case "bookmark":
        return <Star className="w-4 h-4 text-yellow-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const getNotificationBgColor = (type) => {
    switch (type) {
      case "like":
        return "bg-red-50";
      case "comment":
        return "bg-blue-50";
      case "follow":
        return "bg-green-50";
      case "bookmark":
        return "bg-yellow-50";
      default:
        return "bg-slate-50";
    }
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, unread: false } : notification))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, unread: false })));
  };

  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  };

  const deleteSelected = () => {
    setNotifications((prev) => prev.filter((notification) => !selectedNotifications.includes(notification.id)));
    setSelectedNotifications([]);
    setShowActions(false);
  };

  const toggleSelection = (id) => {
    setSelectedNotifications((prev) => (prev.includes(id) ? prev.filter((notifId) => notifId !== id) : [...prev, id]));
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="relative h-full flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200/50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Notifications</h2>
                {unreadCount > 0 && <p className="text-sm text-slate-600">{unreadCount} unread</p>}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {selectedNotifications.length > 0 && (
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={onClose}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Actions Bar */}
          {(showActions || unreadCount > 0) && (
            <div className="flex items-center justify-between px-6 py-3 bg-slate-50/50 border-b border-slate-200/50">
              <div className="flex items-center space-x-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {selectedNotifications.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-600">{selectedNotifications.length} selected</span>
                  <button
                    onClick={deleteSelected}
                    className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <Bell className="w-12 h-12 mb-4 text-slate-300" />
                <p className="text-lg font-medium">No notifications</p>
                <p className="text-sm">You{"'"}re all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`relative p-4 sm:p-6 hover:bg-slate-50/50 transition-colors group ${
                      notification.unread ? "bg-blue-50/30" : ""
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      {/* Selection Checkbox */}
                      <div className="flex items-center h-6">
                        <input
                          type="checkbox"
                          checked={selectedNotifications.includes(notification.id)}
                          onChange={() => toggleSelection(notification.id)}
                          className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary focus:ring-2"
                        />
                      </div>

                      {/* Avatar */}
                      <div
                        className={`relative w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationBgColor(
                          notification.type
                        )}`}
                      >
                        {notification.profileImage ? (
                          <img
                            src={notification.profileImage}
                            alt="Avatar"
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-slate-700">{notification.initials}</span>
                        )}

                        {/* Notification type icon */}
                        <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-sm border border-slate-200">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p
                              className={`text-sm font-medium ${
                                notification.unread ? "text-slate-900" : "text-slate-700"
                              }`}
                            >
                              {notification.message}
                            </p>

                            {notification.description && (
                              <p className="text-sm text-slate-600 mt-1">{notification.description}</p>
                            )}

                            <p className="text-xs text-slate-500 mt-2">{notification.time}</p>
                          </div>

                          {/* Unread indicator */}
                          {notification.unread && (
                            <div className="w-2 h-2 bg-primary rounded-full ml-2 mt-2 flex-shrink-0"></div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {notification.unread && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200/50 bg-slate-50/50">
            <button
              onClick={onClose}
              className="w-full py-2 text-sm text-slate-600 hover:text-slate-800 font-medium transition-colors"
            >
              View all notifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
