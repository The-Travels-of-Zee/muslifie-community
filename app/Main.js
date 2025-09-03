"use client";
import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import MobileSidebar from "@/components/MobileSidebar";
import Post from "@/components/Post";
import CreatePostModal from "@/components/CreatePostModal";
import { getPosts } from "@/lib/actions/posts";
import { useAuthStore } from "@/stores/useAuthStore";

const Main = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastPostId, setLastPostId] = useState(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const [votes, setVotes] = useState({});

  const { user: currentUser } = useAuthStore();

  // Load posts function
  const loadPosts = async (isInitial = false) => {
    if (loading) return;

    setLoading(true);
    console.log(isInitial ? "Loading initial posts..." : "Loading more posts...");

    try {
      const result = await getPosts(10, isInitial ? null : lastPostId);

      if (result.error) {
        console.error("Error loading posts:", result.error);
        return;
      }

      console.log("Loaded posts:", result.posts.length);

      if (isInitial) {
        setPosts(result.posts);
      } else {
        setPosts((prev) => [...prev, ...result.posts]);
      }

      setHasMore(result.hasMore);
      setLastPostId(result.lastPostId);
    } catch (error) {
      console.error("Error in loadPosts:", error);
    } finally {
      setLoading(false);
      if (isInitial) setInitialLoading(false);
    }
  };

  // Load initial posts
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
        console.log("Loading more posts...");
        loadPosts(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, loading, initialLoading, lastPostId]);

  // Simple format time function
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) return "just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  // Toggle comments
  const toggleComments = (postId) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  // Handle voting
  const handleVote = (postId, type) => {
    setVotes((prev) => ({
      ...prev,
      [postId]: prev[postId] === type ? null : type,
    }));
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-2 py-6">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading posts...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-2 py-6 md:flex gap-4 items-start">
        <div className="flex-1 space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500">No posts found. Create the first one!</p>
              <button
                onClick={() => setShowCreatePost(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Post
              </button>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <Post
                  key={post.id}
                  post={post}
                  votes={votes}
                  handleVote={handleVote}
                  expandedComments={expandedComments}
                  toggleComments={toggleComments}
                  formatTimeAgo={formatTimeAgo}
                  onPostUpdate={() => {
                    // Optionally refresh the specific post or do nothing
                    console.log("Post updated:", post.id);
                  }}
                  currentUser={currentUser}
                />
              ))}

              {/* Loading more indicator */}
              {loading && (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading more posts...</span>
                </div>
              )}

              {/* End of posts indicator */}
              {!hasMore && (
                <div className="text-center py-8 text-gray-500">
                  <p>You&apos;ve reached the end!</p>
                </div>
              )}
            </>
          )}
        </div>

        <Sidebar />
      </div>

      {showSidebar && <MobileSidebar setShowSidebar={setShowSidebar} />}
      {showCreatePost && (
        <CreatePostModal
          handleCloseCreatePost={() => setShowCreatePost(false)}
          handleCreatePost={(newPost) => {
            console.log("New post created:", newPost);
            setShowCreatePost(false);
            // Refresh posts
            loadPosts(true);
          }}
        />
      )}
    </div>
  );
};

export default Main;
