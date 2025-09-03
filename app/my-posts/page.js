"use client";
import Post from "@/components/Post";
import Sidebar from "@/components/Sidebar";
import { myPosts } from "@/constants";
import { useAuthStore } from "@/stores/useAuthStore";
import { useEffect, useState } from "react";

const MyPosts = () => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const [votes, setVotes] = useState({});
  const [posts, setPosts] = useState([]);
  const [showCreatePost, setShowCreatePost] = useState(false);

  const { user } = useAuthStore();

  useEffect(() => {
    setPosts(myPosts);
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto pt-8">
        <h1 className="text-6xl font-bold font-amiri">My Posts</h1>
        <div className="px-2 py-6 md:flex gap-4 items-start">
          <div className="space-y-6">
            {posts.map((post) => (
              <Post
                user={user}
                key={post.id}
                post={post}
                votes={votes}
                handleVote={handleVote}
                expandedComments={expandedComments}
                toggleComments={toggleComments}
                formatTimeAgo={formatTimeAgo}
              />
            ))}
          </div>
          <Sidebar />
        </div>
      </div>
    </div>
  );
};

export default MyPosts;
