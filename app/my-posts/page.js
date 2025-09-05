"use client";
import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Post from "@/components/Post";
import CreatePostModal from "@/components/CreatePostModal";
import { getUserPosts } from "@/lib/actions/postActions";
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

  useEffect(() => {
    if (currentUser?.id) loadUserPosts(true);
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

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="mt-3 text-gray-600">Loading your posts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-2 py-6 flex gap-6">
        {/* Sidebar */}
        <div className="hidden lg:flex lg:flex-col w-80 flex-shrink-0">
          <Sidebar />
        </div>

        {/* Posts Column */}
        <div className="flex-1 space-y-6">
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

          {posts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="max-w-sm mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-500 mb-6">
                  You haven&apos;t created any posts yet. Share your thoughts with the community!
                </p>
                <button
                  onClick={() => setShowCreatePost(true)}
                  className="hidden sm:flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
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
                  onPostUpdate={() => loadUserPosts(true)}
                  currentUser={currentUser}
                  showEditOptions={true}
                />
              ))}

              {loading && (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading more posts...</span>
                </div>
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
        <CreatePostModal
          handleCloseCreatePost={() => setShowCreatePost(false)}
          handleCreatePost={(newPost) => {
            setShowCreatePost(false);
            loadUserPosts(true);
          }}
        />
      )}
    </div>
  );
};

export default MyPosts;
