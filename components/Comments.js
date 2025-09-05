// components/Comments.js
"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  getComments,
  getReplies,
  addComment,
  addReply,
  updateComment,
  deleteComment,
  updateReply,
  deleteReply,
} from "@/lib/actions/commentActions";
import { User, Reply, Send, MoreHorizontal, Edit3, Trash2 } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";

const Comments = ({ post, formatTimeAgo, onCommentsUpdate }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [expandedReplies, setExpandedReplies] = useState({});
  const [replyInputs, setReplyInputs] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Edit/Delete states
  const [showMenus, setShowMenus] = useState({});
  const [editingComment, setEditingComment] = useState(null);
  const [editingReply, setEditingReply] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Get auth state from Zustand store
  const { user } = useAuthStore();
  console.log(user);

  // Refs for click outside detection
  const menuRefs = useRef({});

  // Load comments when component mounts
  useEffect(() => {
    loadComments();
  }, [post.id]);

  // Handle click outside to close menus
  useEffect(() => {
    const handleClickOutside = (event) => {
      let shouldClose = true;

      Object.keys(menuRefs.current).forEach((key) => {
        if (menuRefs.current[key]?.contains(event.target)) {
          shouldClose = false;
        }
      });

      if (shouldClose) {
        setShowMenus({});
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadComments = async () => {
    setLoading(true);
    try {
      const fetchedComments = await getComments(post.id);
      setComments(fetchedComments);
      if (onCommentsUpdate) {
        onCommentsUpdate(fetchedComments.length);
      }
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submitting || !user) return;

    setSubmitting(true);
    try {
      if (editingComment) {
        // Update existing comment
        const result = await updateComment(post.id, editingComment, { content: newComment.trim() }, user.id);

        if (result.success) {
          setComments((prev) =>
            prev.map((comment) =>
              comment.id === editingComment ? { ...comment, content: newComment.trim(), isEdited: true } : comment
            )
          );
          setNewComment("");
          setEditingComment(null);
        }
      } else {
        // Add new comment - pass userId directly, not user object
        const result = await addComment(post.id, {
          content: newComment.trim(),
          userId: user.id, // ✅ pass only ID, let server build userRef
        });

        if (result.success) {
          // Add user info to the new comment for immediate display
          const newCommentWithUser = {
            ...result.comment,
            user: {
              id: user.id,
              fullName: user.fullName,
              profileImage: user.profileImage,
            },
            repliesCount: 0,
          };

          setComments((prev) => [newCommentWithUser, ...prev]);
          setNewComment("");
          if (onCommentsUpdate) {
            onCommentsUpdate(comments.length + 1);
          }
        }
      }
    } catch (error) {
      console.error("Error adding/updating comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    setDeleteLoading(true);
    try {
      const result = await deleteComment(post.id, commentId, user.id);
      if (result.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setExpandedReplies((prev) => {
          const updated = { ...prev };
          delete updated[commentId];
          return updated;
        });
        if (onCommentsUpdate) {
          onCommentsUpdate(comments.length - 1);
        }
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(null);
    }
  };

  const handleEditComment = (commentId, content) => {
    setEditingComment(commentId);
    setNewComment(content);
    setShowMenus({});
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setEditingReply(null);
    setNewComment("");
    setReplyInputs({});
  };

  const loadReplies = async (commentId) => {
    try {
      const replies = await getReplies(post.id, commentId);
      setExpandedReplies((prev) => ({
        ...prev,
        [commentId]: replies,
      }));
    } catch (error) {
      console.error("Error loading replies:", error);
    }
  };

  const toggleReplies = (commentId) => {
    if (expandedReplies[commentId]) {
      setExpandedReplies((prev) => ({
        ...prev,
        [commentId]: null,
      }));
    } else {
      loadReplies(commentId);
    }
  };

  const handleAddReply = async (commentId) => {
    const replyContent = replyInputs[commentId];
    if (!replyContent?.trim() || !user) return;

    try {
      if (editingReply?.commentId === commentId) {
        // Update existing reply
        const result = await updateReply(
          post.id,
          commentId,
          editingReply.replyId,
          { content: replyContent.trim() },
          user.id
        );

        if (result.success) {
          setExpandedReplies((prev) => ({
            ...prev,
            [commentId]: prev[commentId].map((reply) =>
              reply.id === editingReply.replyId ? { ...reply, content: replyContent.trim(), isEdited: true } : reply
            ),
          }));
          setReplyInputs((prev) => ({ ...prev, [commentId]: "" }));
          setEditingReply(null);
        }
      } else {
        // Add new reply - fix: pass userId directly
        const result = await addReply(post.id, commentId, {
          content: replyContent.trim(),
          userId: user.id, // ✅ Fixed: pass userId instead of user object
        });

        if (result.success) {
          // Add user info to the new reply for immediate display
          const newReplyWithUser = {
            ...result.reply,
            user: {
              id: user.id,
              fullName: user.fullName,
              profileImage: user.profileImage,
            },
          };

          setExpandedReplies((prev) => ({
            ...prev,
            [commentId]: [...(prev[commentId] || []), newReplyWithUser],
          }));
          setReplyInputs((prev) => ({ ...prev, [commentId]: "" }));

          // Update the comment's reply count
          setComments((prev) =>
            prev.map((comment) =>
              comment.id === commentId ? { ...comment, repliesCount: (comment.repliesCount || 0) + 1 } : comment
            )
          );
        }
      }
    } catch (error) {
      console.error("Error adding/updating reply:", error);
    }
  };

  const handleDeleteReply = async (commentId, replyId) => {
    setDeleteLoading(true);
    try {
      const result = await deleteReply(post.id, commentId, replyId, user.id);
      if (result.success) {
        setExpandedReplies((prev) => ({
          ...prev,
          [commentId]: prev[commentId].filter((r) => r.id !== replyId),
        }));

        // Update the comment's reply count
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === commentId
              ? { ...comment, repliesCount: Math.max((comment.repliesCount || 0) - 1, 0) }
              : comment
          )
        );
      }
    } catch (error) {
      console.error("Error deleting reply:", error);
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(null);
    }
  };

  const handleEditReply = (commentId, replyId, content) => {
    setEditingReply({ commentId, replyId });
    setReplyInputs((prev) => ({ ...prev, [commentId]: content }));
    setShowMenus({});
  };

  const toggleMenu = (type, id) => {
    const menuKey = `${type}-${id}`;
    setShowMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  // Don't render anything if user is not authenticated
  if (!user) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">Please log in to view and post comments.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading comments...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4">
        {/* Add Comment Form */}
        <form onSubmit={handleAddComment} className="mb-6">
          <div className="flex space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user?.profileImage ? (
                <img src={user.profileImage} alt={user.fullName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={editingComment ? "Update your comment..." : "Write a comment..."}
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
              <div className="flex justify-between items-center mt-2">
                {editingComment && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <div className="ml-auto">
                  <button
                    type="submit"
                    disabled={!newComment.trim() || submitting}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {submitting
                        ? editingComment
                          ? "Updating..."
                          : "Posting..."
                        : editingComment
                        ? "Update"
                        : "Comment"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Comments List */}
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                {/* Comment Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                      {comment.user?.profileImage ? (
                        <img
                          src={comment.user.profileImage}
                          alt={comment.user.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900 text-sm sm:text-base">
                          {comment.user?.fullName || "Anonymous"}
                        </span>
                        <span className="text-xs text-gray-500">{formatTimeAgo(comment.createdAt)}</span>
                        {comment.isEdited && <span className="text-xs text-gray-400">(edited)</span>}
                      </div>
                    </div>
                  </div>

                  {/* Three dots menu for comment owner */}
                  {user && comment.user?.id === user.id && (
                    <div className="relative" ref={(el) => (menuRefs.current[`comment-${comment.id}`] = el)}>
                      <button
                        onClick={() => toggleMenu("comment", comment.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>

                      {showMenus[`comment-${comment.id}`] && (
                        <div className="absolute right-0 top-full mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                          <button
                            onClick={() => handleEditComment(comment.id, comment.content)}
                            className="w-full flex items-center space-x-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span className="text-sm">Edit</span>
                          </button>
                          <button
                            onClick={() => setShowDeleteModal({ type: "comment", id: comment.id })}
                            className="w-full flex items-center space-x-2 px-3 py-2 text-left text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="text-sm">Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Comment Content */}
                <p className="text-gray-800 text-sm sm:text-base mt-3 ml-12">{comment.content}</p>

                {/* Comment Actions */}
                <div className="flex items-center space-x-4 ml-12 mt-2">
                  <button
                    onClick={() => toggleReplies(comment.id)}
                    className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 text-sm transition-colors"
                  >
                    <Reply className="w-4 h-4" />
                    <span>
                      {comment.repliesCount > 0
                        ? `${comment.repliesCount} ${comment.repliesCount === 1 ? "reply" : "replies"}`
                        : "Reply"}
                    </span>
                  </button>
                </div>

                {/* Reply Input */}
                {expandedReplies[comment.id] !== null && (
                  <div className="mt-4 ml-12">
                    <div className="flex space-x-3 mb-4">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {user?.profileImage ? (
                          <img src={user.profileImage} alt={user.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col space-y-2">
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={replyInputs[comment.id] || ""}
                              onChange={(e) =>
                                setReplyInputs((prev) => ({
                                  ...prev,
                                  [comment.id]: e.target.value,
                                }))
                              }
                              placeholder={
                                editingReply?.commentId === comment.id ? "Update your reply..." : "Write a reply..."
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                  handleAddReply(comment.id);
                                }
                              }}
                            />
                            <button
                              onClick={() => handleAddReply(comment.id)}
                              disabled={!replyInputs[comment.id]?.trim()}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                          {editingReply?.commentId === comment.id && (
                            <button
                              onClick={cancelEdit}
                              className="self-start text-xs text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Replies List */}
                    {expandedReplies[comment.id] && expandedReplies[comment.id].length > 0 && (
                      <div className="space-y-3">
                        {expandedReplies[comment.id].map((reply) => (
                          <div key={reply.id} className="flex justify-between items-start bg-gray-50 rounded-lg p-3">
                            <div className="flex space-x-3 flex-1">
                              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                                {reply.user?.profileImage ? (
                                  <img
                                    src={reply.user.profileImage}
                                    alt={reply.user.fullName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-4 h-4 text-white" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span className="font-medium text-gray-900 text-sm">
                                    {reply.user?.fullName || "Anonymous"}
                                  </span>
                                  <span className="text-xs text-gray-500">{formatTimeAgo(reply.createdAt)}</span>
                                  {reply.isEdited && <span className="text-xs text-gray-400">(edited)</span>}
                                </div>
                                <p className="text-gray-800 text-sm">{reply.content}</p>
                              </div>
                            </div>

                            {/* Three dots menu for reply owner */}
                            {user && reply.user?.id === user.id && (
                              <div className="relative ml-2" ref={(el) => (menuRefs.current[`reply-${reply.id}`] = el)}>
                                <button
                                  onClick={() => toggleMenu("reply", reply.id)}
                                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>

                                {showMenus[`reply-${reply.id}`] && (
                                  <div className="absolute right-0 top-full mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                    <button
                                      onClick={() => handleEditReply(comment.id, reply.id, reply.content)}
                                      className="w-full flex items-center space-x-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                      <span className="text-sm">Edit</span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        setShowDeleteModal({
                                          type: "reply",
                                          id: reply.id,
                                          commentId: comment.id,
                                        })
                                      }
                                      className="w-full flex items-center space-x-2 px-3 py-2 text-left text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      <span className="text-sm">Delete</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete {showDeleteModal.type === "comment" ? "Comment" : "Reply"}?
            </h3>
            <p className="text-gray-600 mb-6">
              {showDeleteModal.type === "comment"
                ? "This will permanently delete your comment and all its replies. This action cannot be undone."
                : "This will permanently delete your reply. This action cannot be undone."}
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showDeleteModal.type === "comment") {
                    handleDeleteComment(showDeleteModal.id);
                  } else {
                    handleDeleteReply(showDeleteModal.commentId, showDeleteModal.id);
                  }
                }}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
              >
                {deleteLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Comments;
