"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Post from "@/components/Post";
import { getUserLikedPostsEfficient } from "@/lib/actions/postActions";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatTimeAgo } from "@/lib/utils";
import { Heart, Clock } from "lucide-react";

const LikedPosts = () => {
  const [likedPosts, setLikedPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastLikedAt, setLastLikedAt] = useState(null);
  const [expandedComments, setExpandedComments] = useState({});

  const { user: currentUser } = useAuthStore();
  const router = useRouter();

  const loadLikedPosts = async (isInitial = false) => {
    if (loading || !currentUser?.id) return;
    setLoading(true);

    try {
      const result = await getUserLikedPostsEfficient(currentUser.id, 10, isInitial ? null : lastLikedAt);

      if (!result.error) {
        if (isInitial) setLikedPosts(result.likedPosts);
        else setLikedPosts((prev) => [...prev, ...result.likedPosts]);

        setHasMore(result.hasMore);
        setLastLikedAt(result.lastLikedAt);
      } else {
        console.error("Error loading liked posts:", result.error);
      }
    } catch (error) {
      console.error("Error in loadLikedPosts:", error);
    } finally {
      setLoading(false);
      if (isInitial) setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) loadLikedPosts(true);
  }, [currentUser?.id]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 500 &&
        hasMore &&
        !loading &&
        !initialLoading
      ) {
        loadLikedPosts(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, loading, initialLoading, lastLikedAt]);

  const toggleComments = (postId) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  if (!currentUser) return null;

  if (initialLoading)
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
        <span className="mt-3 text-gray-600">Loading liked posts...</span>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-2 py-6 flex gap-6">
        {/* Sidebar */}
        <div className="hidden lg:flex lg:flex-col w-80 flex-shrink-0 sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto">
          <Sidebar />
        </div>

        {/* Posts Column */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 flex items-center space-x-3">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Heart className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Liked Posts</h1>
              <p className="text-gray-600 mt-1">
                {likedPosts.length} {likedPosts.length === 1 ? "post" : "posts"} you&apos;ve liked
              </p>
            </div>
          </div>

          {likedPosts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="max-w-sm mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 bg-pink-100 rounded-full flex items-center justify-center">
                  <Heart className="w-8 h-8 text-pink-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No liked posts yet</h3>
                <p className="text-gray-500 mb-6">
                  Posts you like will appear here. Start exploring and show some love to posts you enjoy!
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
            likedPosts.map((likedPost) => (
              <div key={likedPost.likeId} className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-500 px-4">
                  <Clock className="w-4 h-4" />
                  <span>Liked {formatTimeAgo(likedPost.likedAt)}</span>
                </div>

                <Post
                  post={likedPost.post}
                  expandedComments={expandedComments}
                  toggleComments={toggleComments}
                  formatTimeAgo={formatTimeAgo}
                  onPostUpdated={() => loadLikedPosts(true)}
                  currentUser={currentUser}
                  showEditOptions={likedPost.post.user.id === currentUser.id}
                />
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600"></div>
              <span className="ml-3 text-gray-600">Loading more liked posts...</span>
            </div>
          )}

          {!hasMore && likedPosts.length > 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>You&apos;ve seen all your liked posts!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LikedPosts;
