"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Post from "@/components/Post";
import { getUserCommentedPostsEfficient } from "@/lib/actions/postActions";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatTimeAgo } from "@/lib/utils";
import { MessageSquare, Clock } from "lucide-react";

const CommentedPosts = () => {
  const [commentedPosts, setCommentedPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastCommentedAt, setLastCommentedAt] = useState(null);
  const [expandedComments, setExpandedComments] = useState({});

  const { user: currentUser } = useAuthStore();
  const router = useRouter();

  const loadCommentedPosts = async (isInitial = false) => {
    if (loading || !currentUser?.id) return;
    setLoading(true);

    try {
      const result = await getUserCommentedPostsEfficient(currentUser.id, 10, isInitial ? null : lastCommentedAt);

      if (!result.error) {
        if (isInitial) setCommentedPosts(result.commentedPosts);
        else setCommentedPosts((prev) => [...prev, ...result.commentedPosts]);

        setHasMore(result.hasMore);
        setLastCommentedAt(result.lastCommentedAt);
      } else console.error(result.error);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      if (isInitial) setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) loadCommentedPosts(true);
  }, [currentUser?.id]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 500 &&
        hasMore &&
        !loading &&
        !initialLoading
      ) {
        loadCommentedPosts(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, loading, initialLoading, lastCommentedAt]);

  const toggleComments = (postId) => {
    setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  if (!currentUser) return null;

  if (initialLoading)
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="mt-3 text-gray-600">Loading commented posts...</span>
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
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Commented Posts</h1>
              <p className="text-gray-600 mt-1">
                {commentedPosts.length} {commentedPosts.length === 1 ? "post" : "posts"} you&apos;ve commented on
              </p>
            </div>
          </div>

          {commentedPosts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No comments yet</h3>
              <p className="text-gray-500 mb-6">
                Posts you comment on will appear here. Start engaging with posts you like!
              </p>
              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Explore Posts
              </button>
            </div>
          ) : (
            commentedPosts.map((item) => (
              <div key={item.commentId} className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-500 px-4">
                  <Clock className="w-4 h-4" />
                  <span>Commented {formatTimeAgo(item.commentedAt)}</span>
                </div>

                <Post
                  post={item.post}
                  expandedComments={expandedComments}
                  toggleComments={toggleComments}
                  formatTimeAgo={formatTimeAgo}
                  onPostUpdate={() => loadCommentedPosts(true)}
                  currentUser={currentUser}
                  showEditOptions={item.post.user.id === currentUser.id}
                />
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading more posts...</span>
            </div>
          )}

          {!hasMore && commentedPosts.length > 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>You&apos;ve seen all your commented posts!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentedPosts;
