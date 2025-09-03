// app/post/[slug]/page.js
"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Post from "@/components/Post";
import { getPost } from "@/lib/actions/posts";
import { useAuthStore } from "@/stores/useAuthStore";

function DetailedPost({ slug }) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [votes, setVotes] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  // Extract post ID
  const extractPostId = (slug) => slug.split("-").pop();

  useEffect(() => {
    async function fetchPost() {
      try {
        const postId = extractPostId(slug);
        const result = await getPost(postId);
        if (result.success) {
          setPost(result.post);
          setExpandedComments({ [result.post.id]: true });
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError("Failed to load post");
      } finally {
        setLoading(false);
      }
    }

    if (slug) fetchPost();
  }, [slug]);

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) return "just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const toggleComments = (postId) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleVote = (postId, type) => {
    setVotes((prev) => ({
      ...prev,
      [postId]: prev[postId] === type ? null : type,
    }));
  };

  const handleBackClick = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-2 py-6">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading post...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-2 py-6">
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Post Not Found</h2>
            <p className="text-gray-600 mb-6">{error || "The post you're looking for doesn't exist."}</p>
            <button
              onClick={handleBackClick}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-2 py-6 md:flex gap-4 items-start">
        <div className="flex-1">
          {/* Back button */}
          <button
            onClick={handleBackClick}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to posts
          </button>
          <Post
            post={post}
            expandedComments={expandedComments}
            toggleComments={toggleComments}
            formatTimeAgo={formatTimeAgo}
            onPostUpdate={() => {
              // Optionally refresh the specific post or do nothing
              console.log("Post updated:", post.id);
            }}
            currentUser={currentUser}
          />
        </div>

        <Sidebar />
      </div>
    </div>
  );
}

export default DetailedPost;
