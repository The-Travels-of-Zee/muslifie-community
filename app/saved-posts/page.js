"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Post from "@/components/Post";
import { getUserSavedPostsEfficient } from "@/lib/actions/postActions";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatTimeAgo } from "@/lib/utils";
import { Bookmark, Clock } from "lucide-react";

const SavedPosts = () => {
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [expandedComments, setExpandedComments] = useState({});

  const { user: currentUser } = useAuthStore();
  const router = useRouter();

  const loadSavedPosts = async (isInitial = false) => {
    if (loading || !currentUser?.id) return;
    setLoading(true);

    try {
      const result = await getUserSavedPostsEfficient(currentUser.id, 10, isInitial ? null : lastSavedAt);

      if (!result.error) {
        if (isInitial) {
          setSavedPosts(result.savedPosts);
        } else {
          setSavedPosts((prev) => [...prev, ...result.savedPosts]);
        }
        setHasMore(result.hasMore);
        setLastSavedAt(result.lastSavedAt);
      } else {
        console.error("Error loading saved posts:", result.error);
      }
    } catch (error) {
      console.error("Error in loadSavedPosts:", error);
    } finally {
      setLoading(false);
      if (isInitial) setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      loadSavedPosts(true);
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
        loadSavedPosts(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, loading, initialLoading, lastSavedAt]);

  const toggleComments = (postId) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  if (!currentUser) return null;

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading saved posts...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-2 py-6 flex gap-6">
        {/* Sidebar Left */}
        <div className="hidden lg:flex lg:flex-col w-80 flex-shrink-0">
          <Sidebar />
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bookmark className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Saved Posts</h1>
                <p className="text-gray-600 mt-1">
                  {savedPosts.length} {savedPosts.length === 1 ? "post" : "posts"} you&apos;ve saved
                </p>
              </div>
            </div>
          </div>

          {savedPosts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="max-w-sm mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <Bookmark className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No saved posts yet</h3>
                <p className="text-gray-500 mb-6">
                  Posts you save will appear here. Save posts you find valuable and revisit them anytime!
                </p>
                <button
                  onClick={() => router.push("/")}
                  className="inline-flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <span className="font-medium">Explore Posts</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {savedPosts.map((savedPost) => (
                <div key={savedPost.saveId} className="space-y-2">
                  {/* Save timestamp */}
                  <div className="flex items-center space-x-2 text-sm text-gray-500 px-4">
                    <Clock className="w-4 h-4" />
                    <span>Saved {formatTimeAgo(savedPost.savedAt)}</span>
                  </div>

                  {/* Post */}
                  <Post
                    post={savedPost.post}
                    expandedComments={expandedComments}
                    toggleComments={toggleComments}
                    formatTimeAgo={formatTimeAgo}
                    onPostUpdated={() => loadSavedPosts(true)}
                    currentUser={currentUser}
                    showEditOptions={savedPost.post.user.id === currentUser.id}
                  />
                </div>
              ))}

              {loading && (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading more saved posts...</span>
                </div>
              )}

              {!hasMore && savedPosts.length > 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>You&apos;ve seen all your saved posts!</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedPosts;
