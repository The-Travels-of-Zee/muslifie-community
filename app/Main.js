"use client";
import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Post from "@/components/Post";
import CreateEditPostModal from "@/components/CreateEditPostModal";
import { getPosts } from "@/lib/actions/postActions";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatTimeAgo } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

const Main = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastPostId, setLastPostId] = useState(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});

  const router = useRouter();

  // Get auth state from Zustand store
  const { user: currentUser, isAuthenticated } = useAuthStore();

  const handleCreatePostClick = () => {
    if (isAuthenticated) {
      setShowCreatePost(true);
    } else {
      router.push("/login");
    }
  };

  // Load posts
  const loadPosts = async (isInitial = false) => {
    if (loading) return;
    setLoading(true);

    try {
      const result = await getPosts(10, isInitial ? null : lastPostId);

      if (!result.error) {
        if (isInitial) {
          setPosts(result.posts);
        } else {
          setPosts((prev) => [...prev, ...result.posts]);
        }
        setHasMore(result.hasMore);
        setLastPostId(result.lastPostId);
      } else {
        console.error("Error loading posts:", result.error);
      }
    } catch (error) {
      console.error("Error in loadPosts:", error);
    } finally {
      setLoading(false);
      if (isInitial) setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadPosts(true);
  }, []);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 500 &&
        hasMore &&
        !loading &&
        !initialLoading
      ) {
        loadPosts(false);
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

  if (initialLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-7xl mx-auto px-2 py-6 flex justify-center items-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="mt-3 text-gray-600">Loading posts...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-2 py-6 flex gap-6">
        {/* Sidebar */}
        <div className="hidden lg:flex lg:flex-col w-80 flex-shrink-0 sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto">
          <Sidebar />
        </div>

        {/* Posts Column */}
        <div className="flex-1 space-y-6">
          {posts.length === 0 ? (
            <div className="min-h-screen flex flex-col items-center">
              <p className="text-gray-500 mb-4 text-center">No posts found. Create the first one!</p>
              <button
                onClick={handleCreatePostClick}
                className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="font-medium">Create Post</span>
              </button>
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
                  onPostUpdated={() => console.log("Post updated:", post.id)}
                  currentUser={currentUser}
                />
              ))}

              {loading && (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading more posts...</span>
                </div>
              )}

              {!hasMore && (
                <div className="text-center py-8 text-gray-500">
                  <p>You&apos;ve reached the end!</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showCreatePost && (
        <CreateEditPostModal
          handleCloseModal={() => setShowCreatePost(false)}
          handleCreatePost={(newPost) => {
            setShowCreatePost(false);
            loadPosts(true);
          }}
        />
      )}
    </div>
  );
};

export default Main;
