"use client";
import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Post from "@/components/Post";
import CreateEditPostModal from "@/components/CreateEditPostModal";
import { getUserPosts } from "@/lib/actions/postActions";
import { getFollowersCount, getFollowingCount } from "@/lib/actions/userActions";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatTimeAgo } from "@/lib/utils";
import { Plus } from "lucide-react";

const MyPosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastPostId, setLastPostId] = useState(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const { user: currentUser } = useAuthStore();

  const loadUserPosts = async (isInitial = false) => {
    if (loading || !currentUser?.id) return;
    setLoading(true);

    try {
      const result = await getUserPosts(currentUser.id, 10, isInitial ? null : lastPostId);

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

  // Load followers/following counts
  const loadCounts = async () => {
    if (!currentUser?.id) return;
    try {
      const [followersRes, followingRes] = await Promise.all([
        getFollowersCount(currentUser.id),
        getFollowingCount(currentUser.id),
      ]);
      setFollowersCount(followersRes.count);
      setFollowingCount(followingRes.count);
    } catch (err) {
      console.error("Error fetching counts:", err);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      loadUserPosts(true);
      loadCounts();
    }
  }, [currentUser?.id]);

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

  if (!currentUser) return null;

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
          {/* ✅ Profile Header Section */}
          {initialLoading ? (
            <ProfileHeaderSkeleton />
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-6 flex items-center gap-6">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-200 flex items-center justify-center">
                {currentUser?.profileImage ? (
                  <img
                    src={currentUser.profileImage}
                    alt={currentUser.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-slate-500">
                    {currentUser?.fullName?.[0]?.toUpperCase() || "U"}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{currentUser?.fullName || "Unknown User"}</h2>
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
          )}

          {/* Page Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Posts</h1>
              <p className="text-gray-600 mt-1">
                {posts.length} {posts.length === 1 ? "post" : "posts"} created
              </p>
            </div>
            <button
              onClick={() => setShowCreatePost(true)}
              className="hidden sm:flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">Create Post</span>
            </button>
          </div>

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
                  You haven&apos;t created any posts yet. Share your thoughts with the community!
                </p>

                {/* CTA button */}
                <button
                  onClick={() => setShowCreatePost(true)}
                  className="inline-flex items-center justify-center space-x-2 bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span className="font-medium">Create Your First Post</span>
                </button>
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
                  currentUser={currentUser}
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
                  <p>You&apos;ve seen all your posts!</p>
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

export default MyPosts;
