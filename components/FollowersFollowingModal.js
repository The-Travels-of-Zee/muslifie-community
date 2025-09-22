"use client";
import React, { useState, useEffect } from "react";
import { X, MoreVertical, UserPlus, UserMinus, UserX } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
  checkUserFollowing,
  removeFollower,
  toggleReportUser,
  checkIfUserReported,
} from "@/lib/actions/userActions";
import toast from "react-hot-toast";

const FollowersFollowingModal = ({ isOpen, onClose, userId, initialTab = "followers", onCountUpdate }) => {
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [openMenus, setOpenMenus] = useState({});
  const [followingStatus, setFollowingStatus] = useState({});
  const [reportStatus, setReportStatus] = useState({});

  // Load followers
  const loadFollowers = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await getFollowers(userId);
      if (result.success) {
        setFollowers(result.followers);
        // Check following status for each follower
        if (currentUser?.id) {
          const statusChecks = await Promise.all(
            result.followers.map(async (follower) => {
              const [followingRes, reportRes] = await Promise.all([
                checkUserFollowing(follower.id, currentUser.id),
                checkIfUserReported(follower.id, currentUser.id),
              ]);
              return {
                userId: follower.id,
                isFollowing: followingRes.isFollowing,
                isReported: reportRes,
              };
            })
          );

          const statusMap = {};
          const reportMap = {};
          statusChecks.forEach(({ userId, isFollowing, isReported }) => {
            statusMap[userId] = isFollowing;
            reportMap[userId] = isReported;
          });
          setFollowingStatus(statusMap);
          setReportStatus(reportMap);
        }
      }
    } catch (error) {
      console.error("Error loading followers:", error);
      toast.error("Failed to load followers");
    } finally {
      setLoading(false);
    }
  };

  // Load following
  const loadFollowing = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await getFollowing(userId);
      if (result.success) {
        setFollowing(result.following);
        // Check report status for each following
        if (currentUser?.id) {
          const reportChecks = await Promise.all(
            result.following.map(async (user) => {
              const reportRes = await checkIfUserReported(user.id, currentUser.id);
              return {
                userId: user.id,
                isReported: reportRes,
              };
            })
          );

          const reportMap = {};
          reportChecks.forEach(({ userId, isReported }) => {
            reportMap[userId] = isReported;
          });
          setReportStatus(reportMap);
        }
      }
    } catch (error) {
      console.error("Error loading following:", error);
      toast.error("Failed to load following");
    } finally {
      setLoading(false);
    }
  };

  // Handle follow/unfollow
  const handleToggleFollow = async (targetUserId, isCurrentlyFollowing) => {
    if (!currentUser?.id || targetUserId === currentUser.id) return;

    setActionLoading((prev) => ({ ...prev, [`follow-${targetUserId}`]: true }));

    try {
      const result = isCurrentlyFollowing
        ? await unfollowUser(targetUserId, currentUser.id)
        : await followUser(targetUserId, currentUser.id);

      if (result.success) {
        toast.success(isCurrentlyFollowing ? "Unfollowed user" : "Followed user");
        setFollowingStatus((prev) => ({
          ...prev,
          [targetUserId]: !isCurrentlyFollowing,
        }));
        // Update counts in parent component
        if (onCountUpdate) {
          onCountUpdate();
        }
      } else {
        toast.error(result.error || "Failed to update follow status");
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error("Something went wrong");
    } finally {
      setActionLoading((prev) => ({ ...prev, [`follow-${targetUserId}`]: false }));
    }
  };

  // Handle remove follower
  const handleRemoveFollower = async (followerId) => {
    if (!currentUser?.id || userId !== currentUser.id) return;

    setActionLoading((prev) => ({ ...prev, [`remove-${followerId}`]: true }));

    try {
      const result = await removeFollower(currentUser.id, followerId);
      if (result.success) {
        toast.success("Follower removed");
        setFollowers((prev) => prev.filter((f) => f.id !== followerId));
        if (onCountUpdate) {
          onCountUpdate();
        }
      } else {
        toast.error(result.error || "Failed to remove follower");
      }
    } catch (error) {
      console.error("Error removing follower:", error);
      toast.error("Something went wrong");
    } finally {
      setActionLoading((prev) => ({ ...prev, [`remove-${followerId}`]: false }));
      setOpenMenus((prev) => ({ ...prev, [followerId]: false }));
    }
  };

  // Handle report user
  const handleToggleReport = async (targetUserId) => {
    if (!currentUser?.id || targetUserId === currentUser.id) return;

    setActionLoading((prev) => ({ ...prev, [`report-${targetUserId}`]: true }));

    try {
      const result = await toggleReportUser(targetUserId, currentUser.id, "inappropriate_behavior");

      if (result.success) {
        const isReported = result.action === "reported";
        toast.success(isReported ? "User reported" : "Report removed");
        setReportStatus((prev) => ({
          ...prev,
          [targetUserId]: isReported,
        }));
      } else {
        toast.error(result.error || "Failed to toggle report");
      }
    } catch (error) {
      console.error("Error toggling report:", error);
      toast.error("Something went wrong");
    } finally {
      setActionLoading((prev) => ({ ...prev, [`report-${targetUserId}`]: false }));
      setOpenMenus((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  // Load data when tab changes
  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === "followers") {
      loadFollowers();
    } else {
      loadFollowing();
    }
  }, [activeTab, isOpen, userId]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenus({});
    };

    if (Object.keys(openMenus).some((key) => openMenus[key])) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openMenus]);

  if (!isOpen) return null;

  const currentData = activeTab === "followers" ? followers : following;
  const isOwnProfile = userId === currentUser?.id;

  const UserCard = ({ user }) => {
    const isFollowing = followingStatus[user.id];
    const isReported = reportStatus[user.id];
    const menuOpen = openMenus[user.id];

    return (
      <div className="flex items-center justify-between p-4 hover:bg-gray-50">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user?.fullName || "user"}
                className="w-12 h-12 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none"; // hide broken img
                  e.currentTarget.insertAdjacentHTML(
                    "afterend",
                    `<span class="text-white font-semibold text-lg">
                                ${
                                  user?.fullName
                                    ? user.fullName
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .toUpperCase()
                                    : "U"
                                }
                              </span>`
                  );
                }}
              />
            ) : (
              <span className="text-white font-semibold text-lg">
                {user?.fullName
                  ? user.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                  : "U"}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{user.fullName}</p>
            {user.bio && <p className="text-sm text-gray-500 truncate">{user.bio}</p>}
          </div>
        </div>

        {user.id !== currentUser?.id && (
          <div className="flex items-center gap-2">
            {/* Follow/Unfollow button for followers tab */}
            {activeTab === "followers" && (
              <button
                onClick={() => handleToggleFollow(user.id, isFollowing)}
                disabled={actionLoading[`follow-${user.id}`]}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  isFollowing
                    ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                } disabled:opacity-50`}
              >
                {actionLoading[`follow-${user.id}`] ? "..." : isFollowing ? "Unfollow" : "Follow Back"}
              </button>
            )}

            {/* Unfollow button for following tab */}
            {activeTab === "following" && (
              <button
                onClick={() => handleToggleFollow(user.id, true)}
                disabled={actionLoading[`follow-${user.id}`]}
                className="px-4 py-1.5 rounded-md text-sm font-medium bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50"
              >
                {actionLoading[`follow-${user.id}`] ? "..." : "Unfollow"}
              </button>
            )}

            {/* More options menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenus((prev) => ({ ...prev, [user.id]: !prev[user.id] }));
                }}
                className="p-1.5 rounded-full hover:bg-gray-100 transition"
              >
                <MoreVertical className="w-4 h-4 text-gray-600" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-8 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-100 z-50">
                  {/* Remove follower (only for own profile followers) */}
                  {activeTab === "followers" && isOwnProfile && (
                    <button
                      onClick={() => handleRemoveFollower(user.id)}
                      disabled={actionLoading[`remove-${user.id}`]}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <UserX className="w-4 h-4" />
                      {actionLoading[`remove-${user.id}`] ? "Removing..." : "Remove Follower"}
                    </button>
                  )}

                  {/* Report user */}
                  <button
                    onClick={() => handleToggleReport(user.id)}
                    disabled={actionLoading[`report-${user.id}`]}
                    className={`flex items-center gap-2 w-full text-left px-4 py-2 text-sm disabled:opacity-50 ${
                      isReported ? "text-yellow-600 hover:bg-yellow-50" : "text-red-600 hover:bg-red-50"
                    }`}
                  >
                    <UserMinus className="w-4 h-4" />
                    {actionLoading[`report-${user.id}`] ? "..." : isReported ? "Unreport User" : "Report User"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1" />
          <h2 className="text-lg font-semibold">{activeTab === "followers" ? "Followers" : "Following"}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("followers")}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition ${
              activeTab === "followers"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Followers ({followers.length})
          </button>
          <button
            onClick={() => setActiveTab("following")}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition ${
              activeTab === "following"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Following ({following.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : currentData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <UserPlus className="w-8 h-8 mb-2" />
              <p className="text-sm">No {activeTab === "followers" ? "followers" : "following"} yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {currentData.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowersFollowingModal;
