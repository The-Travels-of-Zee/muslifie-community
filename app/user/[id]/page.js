"use client";
import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Post from "@/components/Post";
import CreateEditPostModal from "@/components/CreateEditPostModal";
import { getUserPosts } from "@/lib/actions/postActions";
import {
  checkIfUserReported,
  getFollowersCount,
  getFollowingCount,
  getUser,
  toggleReportUser,
  followUser,
  unfollowUser,
  checkUserFollowing,
} from "@/lib/actions/userActions";
import { formatTimeAgo } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { MoreVertical } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/useAuthStore";

const UserProfile = () => {
  const searchParams = useSearchParams();
  const userId = searchParams.get("query");

  const { user: currentUser } = useAuthStore();

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastPostId, setLastPostId] = useState(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [isReported, setIsReported] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // ✅ Load user profile
  const loadUserProfile = async () => {
    if (!userId) return;
    try {
      const result = await getUser(userId);
      if (result.success) {
        setUser(result.user);
      } else {
        console.error(result.error);
      }
    } catch (err) {
      console.error("Error loading user:", err);
    }
  };

  // ✅ Load posts
  const loadUserPosts = async (isInitial = false) => {
    if (loading || !userId) return;
    setLoading(true);

    try {
      const result = await getUserPosts(userId, 10, isInitial ? null : lastPostId);

      if (!result.error) {
        if (isInitial) {
          setPosts(result.posts);
        } else {
          setPosts((prev) => [...prev, ...result.posts]);
        }
        setHasMore(result.hasMore);
        setLastPostId(result.lastPostId);
      } else {
        console.error("Error loading user posts:", result.error);
      }
    } catch (error) {
      console.error("Error in loadUserPosts:", error);
    } finally {
      setLoading(false);
      if (isInitial) setInitialLoading(false);
    }
  };

  // ✅ Load counts
  const loadCounts = async () => {
    if (!userId) return;
    try {
      const [followersRes, followingRes] = await Promise.all([getFollowersCount(userId), getFollowingCount(userId)]);
      setFollowersCount(followersRes.count);
      setFollowingCount(followingRes.count);
    } catch (err) {
      console.error("Error fetching counts:", err);
    }
  };

  const handleToggleReport = async () => {
    if (!currentUser?.id || userId === currentUser?.id) return;

    setReportLoading(true);

    try {
      const result = await toggleReportUser(userId, currentUser.id, "inappropriate_behavior");

      if (result.success) {
        if (result.action === "reported") {
          toast.success("User reported successfully");
          setIsReported(true); // update state instantly
        } else if (result.action === "unreported") {
          toast.success("Report removed");
          setIsReported(false); // update state instantly
        }
      } else {
        toast.error(result.error || "Failed to toggle report");
      }
    } catch (error) {
      console.error("Error toggling report:", error);
      toast.error("Failed to toggle report");
    } finally {
      setReportLoading(false);
    }
  };

  // ✅ Handle follow/unfollow
  const handleToggleFollow = async () => {
    if (!currentUser?.id || userId === currentUser?.id) return;

    setFollowLoading(true);

    try {
      if (isFollowing) {
        const result = await unfollowUser(userId, currentUser.id);
        if (result.success) {
          toast.success("Unfollowed user");
          setIsFollowing(false);
          setFollowersCount((prev) => prev - 1);
        } else {
          toast.error(result.error || "Failed to unfollow");
        }
      } else {
        const result = await followUser(userId, currentUser.id);
        if (result.success) {
          toast.success("Followed user");
          setIsFollowing(true);
          setFollowersCount((prev) => prev + 1);
        } else {
          toast.error(result.error || "Failed to follow");
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error("Something went wrong");
    } finally {
      setFollowLoading(false);
    }
  };

  // ✅ Check if following
  useEffect(() => {
    const fetchFollowingStatus = async () => {
      if (userId && currentUser?.id && userId !== currentUser.id) {
        const res = await checkUserFollowing(userId, currentUser.id);
        setIsFollowing(res.isFollowing);
      }
    };
    fetchFollowingStatus();
  }, [userId, currentUser?.id]);

  // ✅ Initial check: run only once when userId/currentUser changes
  useEffect(() => {
    const fetchReportStatus = async () => {
      if (userId && currentUser?.id && userId !== currentUser.id) {
        const reported = await checkIfUserReported(userId, currentUser.id);
        setIsReported(reported);
      }
    };
    fetchReportStatus();
  }, [userId, currentUser?.id]);

  useEffect(() => {
    if (userId) {
      loadUserProfile();
      loadUserPosts(true);
      loadCounts();
    }
  }, [userId]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 500 &&
        hasMore &&
        !loading &&
        !initialLoading
      ) {
        loadUserPosts(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, loading, initialLoading, lastPostId]);

  const toggleComments = (postId) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  if (!userId) return null;

  // ✅ Profile Header Skeleton
  const ProfileHeaderSkeleton = () => (
    <div className="bg-white rounded-lg shadow-sm p-6 flex items-center gap-6 animate-pulse">
      <div className="w-20 h-20 rounded-full bg-slate-200" />
      <div className="flex-1 space-y-3">
        <div className="h-5 w-40 bg-slate-200 rounded" />
        <div className="flex gap-6 mt-2">
          <div className="h-4 w-16 bg-slate-200 rounded" />
          <div className="h-4 w-16 bg-slate-200 rounded" />
          <div className="h-4 w-16 bg-slate-200 rounded" />
        </div>
      </div>
    </div>
  );

  // ✅ Post Skeleton
  const PostSkeleton = () => (
    <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-slate-200 rounded" />
          <div className="h-3 w-24 bg-slate-200 rounded" />
        </div>
      </div>
      <div className="h-4 w-full bg-slate-200 rounded" />
      <div className="h-4 w-5/6 bg-slate-200 rounded" />
      <div className="flex gap-6 mt-4">
        <div className="h-4 w-12 bg-slate-200 rounded" />
        <div className="h-4 w-12 bg-slate-200 rounded" />
        <div className="h-4 w-12 bg-slate-200 rounded" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-2 py-6 flex gap-6">
        {/* Sidebar */}
        <div className="hidden lg:flex lg:flex-col w-80 flex-shrink-0">
          <Sidebar />
        </div>

        {/* Posts Column */}
        <div className="flex-1 space-y-6">
          {/* ✅ Profile Header */}
          {initialLoading ? (
            <ProfileHeaderSkeleton />
          ) : (
            <div className="bg-secondary/5 rounded-lg shadow-sm p-6 flex items-center justify-between">
              {/* Left side - user info */}
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white flex items-center justify-center">
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-slate-500">
                      {user?.fullName?.[0]?.toUpperCase() || "U"}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{user?.fullName || "Unknown User"}</h2>
                  <div className="flex gap-6 mt-2 text-slate-600 text-sm">
                    <span>
                      <strong>{followersCount}</strong> Followers
                    </span>
                    <span>
                      <strong>{followingCount}</strong> Following
                    </span>
                    <span>
                      <strong>{posts.length}</strong> Posts
                    </span>
                  </div>
                </div>
              </div>

              {/* Right side - three dots menu */}
              {user?.id !== currentUser?.id && (
                <div className="flex items-center gap-3 relative">
                  {/* Follow/Unfollow button */}
                  <button
                    onClick={handleToggleFollow}
                    disabled={followLoading}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                      isFollowing
                        ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    } disabled:opacity-50`}
                  >
                    {followLoading ? "..." : isFollowing ? "Unfollow" : "Follow"}
                  </button>

                  {/* Three dots menu */}
                  <button
                    onClick={() => setMenuOpen((prev) => !prev)}
                    className="p-2 rounded-full hover:bg-gray-100 transition"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 top-8 mt-2 w-40 bg-white rounded-md shadow-lg border border-gray-100">
                      <button
                        onClick={() => {
                          handleToggleReport();
                          setMenuOpen(false);
                        }}
                        disabled={reportLoading}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          isReported ? "text-yellow-600 hover:bg-yellow-50" : "text-red-600 hover:bg-red-50"
                        } disabled:opacity-50`}
                      >
                        {isReported ? "Unreport User" : "Report User"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ✅ Initial Loading (show skeletons instead of spinner) */}
          {initialLoading ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-10 text-center">
              <div className="max-w-sm mx-auto">
                {/* Empty state icon */}
                <div className="w-16 h-16 mx-auto mb-6 bg-gray-50 rounded-full flex items-center justify-center border border-gray-200">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>

                {/* Subtitle */}
                <p className="text-gray-500 mb-6 text-sm leading-relaxed">
                  This User haven&apos;t created any posts yet.
                </p>
              </div>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <Post
                  key={post.id}
                  post={post}
                  expandedComments={expandedComments}
                  toggleComments={toggleComments}
                  formatTimeAgo={formatTimeAgo}
                  onPostUpdated={() => loadUserPosts(true)}
                  userId={userId}
                  showEditOptions={true}
                />
              ))}

              {/* ✅ Show skeletons when loading more posts */}
              {loading && (
                <>
                  <PostSkeleton />
                  <PostSkeleton />
                </>
              )}

              {!hasMore && posts.length > 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>You&apos;ve seen all posts!</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showCreatePost && (
        <CreateEditPostModal
          handleCloseModal={() => setShowCreatePost(false)}
          handleCreatePost={() => {
            setShowCreatePost(false);
            loadUserPosts(true);
          }}
        />
      )}
    </div>
  );
};

export default UserProfile;
