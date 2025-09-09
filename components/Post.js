"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Comments from "./Comments";
import {
  MoreHorizontal,
  Bookmark,
  Hash,
  Sparkles,
  TrendingUp,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  FlagTriangleRight,
  Trash,
  Pencil,
} from "lucide-react";

import {
  togglePostLike,
  checkUserLike,
  togglePostVote,
  checkUserVote,
  togglePostSave,
  checkUserSave,
  deletePost,
} from "@/lib/actions/postActions";
import { getCommentsCount } from "@/lib/actions/commentActions";
import { PostActions } from "./PostActions";
import CreateEditPostModal from "./CreateEditPostModal";

const Post = ({ post, expandedComments, toggleComments, formatTimeAgo, onPostUpdated, currentUser }) => {
  const router = useRouter();
  const pathname = usePathname();

  // States
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [savesCount, setSavesCount] = useState(post.saves || 0);

  const [userVoteStatus, setUserVoteStatus] = useState(null);
  const [upvotesCount, setUpvotesCount] = useState(post.upvotes || 0);
  const [downvotesCount, setDownvotesCount] = useState(post.downvotes || 0);

  const [commentsCount, setCommentsCount] = useState(post.comments || 0);

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Edit Post Modal state and functions
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleOpenEditModal = () => {
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handlePostUpdated = (updatedPost) => {
    if (onPostUpdated) {
      onPostUpdated(updatedPost);
    }
    setIsEditModalOpen(false);
  };

  // Memoized values
  const mediaItems = useMemo(
    () => [
      ...(post.images || []).map((img) => ({ type: "image", src: img })),
      ...(post.videos || []).map((video) => ({ type: "video", src: video })),
    ],
    [post.images, post.videos]
  );

  const engagementLevel = useMemo(() => {
    const score = (post.upvotes || 0) + commentsCount;
    if (score > 50) return "high";
    if (score > 30) return "medium";
    return "low";
  }, [post.upvotes, commentsCount]);

  // Handlers
  const handleNavigate = useCallback(
    (options = {}) => {
      if (!post?.id) return;

      // Options (override defaults)
      const {
        basePath = "/post", // default base route
        allowSamePage = false, // allow navigating even if already on the same page
      } = options;

      const targetPath = `${basePath}/${post.id}`;

      // Avoid unnecessary push if already there
      if (!allowSamePage && pathname === targetPath) return;

      router.push(targetPath);
    },
    [pathname, router, post?.id]
  );

  const handleLike = useCallback(async () => {
    if (!currentUser) return;

    const optimisticLiked = !isLiked;
    setIsLiked(optimisticLiked);
    setLikeCount((prev) => prev + (optimisticLiked ? 1 : -1));

    try {
      const result = await togglePostLike(post.id, currentUser, isLiked);
      if (result.success) {
        setIsLiked(result.isLiked);
        setLikeCount(result.likesCount);
      }
    } catch {
      setIsLiked(isLiked);
      setLikeCount(likeCount);
    }
  }, [isLiked, currentUser, post.id, likeCount]);

  const handleVote = useCallback(
    async (voteType) => {
      if (!currentUser) return;

      let optimisticStatus = userVoteStatus;
      let optimisticUp = upvotesCount;
      let optimisticDown = downvotesCount;

      if (voteType === "up") {
        if (userVoteStatus === "up") {
          optimisticStatus = null;
          optimisticUp -= 1;
        } else if (userVoteStatus === "down") {
          optimisticStatus = "up";
          optimisticUp += 1;
          optimisticDown -= 1;
        } else {
          optimisticStatus = "up";
          optimisticUp += 1;
        }
      } else {
        if (userVoteStatus === "down") {
          optimisticStatus = null;
          optimisticDown -= 1;
        } else if (userVoteStatus === "up") {
          optimisticStatus = "down";
          optimisticDown += 1;
          optimisticUp -= 1;
        } else {
          optimisticStatus = "down";
          optimisticDown += 1;
        }
      }

      setUserVoteStatus(optimisticStatus);
      setUpvotesCount(optimisticUp);
      setDownvotesCount(optimisticDown);

      try {
        const result = await togglePostVote(post.id, currentUser, voteType);
        if (result.success) {
          setUserVoteStatus(result.userVoteStatus);
          setUpvotesCount(result.upvotesCount);
          setDownvotesCount(result.downvotesCount);
        }
      } catch {
        setUserVoteStatus(userVoteStatus);
        setUpvotesCount(upvotesCount);
        setDownvotesCount(downvotesCount);
      }
    },
    [currentUser, post.id, userVoteStatus, upvotesCount, downvotesCount]
  );

  const handleSave = useCallback(async () => {
    if (!currentUser) return;

    const optimisticSaved = !isBookmarked;
    setIsBookmarked(optimisticSaved);
    setSavesCount((prev) => prev + (optimisticSaved ? 1 : -1));

    try {
      const result = await togglePostSave(post.id, currentUser, isBookmarked);
      if (result.success) {
        setIsBookmarked(result.isSaved);
        setSavesCount(result.savesCount);
      }
    } catch {
      setIsBookmarked(isBookmarked);
      setSavesCount(savesCount);
    }
  }, [isBookmarked, currentUser, post.id, savesCount]);

  // Delete a post from database
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      const result = await deletePost(post.id, currentUser.id);
      if (result.success) {
        alert("Post deleted successfully");
        router.push("/my-posts");
        router.refresh();
      } else {
        alert(result.error || "Failed to delete post");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  // Modal controls
  const openModal = useCallback((index) => {
    setCurrentMediaIndex(index);
    setShowModal(true);
    document.body.style.overflow = "hidden";
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    document.body.style.overflow = "unset";
  }, []);

  const nextMedia = useCallback(() => {
    setCurrentMediaIndex((prev) => (prev === mediaItems.length - 1 ? 0 : prev + 1));
  }, [mediaItems.length]);

  const prevMedia = useCallback(() => {
    setCurrentMediaIndex((prev) => (prev === 0 ? mediaItems.length - 1 : prev - 1));
  }, [mediaItems.length]);

  // Escape key for modal
  useEffect(() => {
    if (!showModal) return;
    const handleEscape = (e) => e.key === "Escape" && closeModal();
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showModal, closeModal]);

  // Fetch statuses once
  useEffect(() => {
    if (!currentUser || !post.id) return;

    const init = async () => {
      try {
        const [userHasLiked, userVote, userHasSaved, count] = await Promise.all([
          checkUserLike(post.id, currentUser.id),
          checkUserVote(post.id, currentUser.id),
          checkUserSave(post.id, currentUser.id),
          getCommentsCount(post.id),
        ]);

        setIsLiked(userHasLiked);
        setUserVoteStatus(userVote);
        setIsBookmarked(userHasSaved);
        setCommentsCount(count);
      } catch (err) {
        console.error("Init error:", err);
      }
    };

    init();
  }, [post.id, currentUser]);

  useEffect(() => {
    const initCount = async () => {
      const count = await getCommentsCount(post.id);
      setCommentsCount(count);
    };
    initCount();
  }, [post.id]);

  const user = post.user || {};

  return (
    <>
      <article
        className={`bg-white rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-500 relative 
          ${pathname === "/" ? "cursor-pointer" : ""} 
          ${
            engagementLevel === "high"
              ? "border-yellow-200 shadow-yellow-50"
              : engagementLevel === "medium"
              ? "border-blue-200 shadow-blue-50"
              : "border-slate-200"
          }`}
      >
        {/* Trending Badge */}
        {engagementLevel === "high" && (
          <div className="absolute top-2 right-2 z-10">
            <div className="flex items-center space-x-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
              <TrendingUp className="w-3 h-3" />
              <span>Trending</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-4" onClick={() => handleNavigate({ allowSamePage: true })}>
          <div className="flex items-start space-x-4">
            <div className="min-w-0 w-full">
              <div className="flex items-center justify-between space-x-2 mb-4">
                <div className="relative flex gap-3 items-center">
                  <div
                    className={`w-14 h-14 flex items-center justify-center rounded-full transition-transform ${
                      engagementLevel === "high"
                        ? "bg-gradient-to-br from-yellow-100 to-orange-100 ring-2 ring-yellow-300"
                        : "bg-gradient-to-br from-slate-100 to-slate-200"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-primary to-primary/80">
                      {user?.profileImage ? (
                        <img src={user.profileImage} alt="user" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-semibold text-lg">
                          {user?.fullName
                            ? user.fullName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                            : "U"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="flex gap-2 items-center font-bold text-slate-900">
                      {user?.fullName || "Unknown User"}
                      {engagementLevel === "high" && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <Sparkles className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </h3>
                    <div className="flex items-center space-x-1 text-slate-500 text-xs">
                      <Clock className="w-3 h-3" />
                      <time>{formatTimeAgo(post.createdAt)}</time>
                    </div>
                  </div>
                </div>

                {/* More menu */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMoreMenu((prev) => !prev);
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>

                  {showMoreMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSave();
                          setShowMoreMenu(false);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-left text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Bookmark className={`w-4 h-4 ${isBookmarked ? "text-yellow-600 fill-current" : ""}`} />
                        <span>{isBookmarked ? "Remove Saved" : "Save post"}</span>
                      </button>
                      {currentUser.id === user.id && (
                        <>
                          <button
                            className="mt-2 w-full flex items-center space-x-3 px-4 py-2 text-left text-gray-900 hover:bg-red-50 transition-colors"
                            onClick={handleOpenEditModal}
                          >
                            <Pencil className="h-4 w-4" />
                            <span>Edit</span>
                          </button>
                          {isEditModalOpen && (
                            <CreateEditPostModal
                              handleCloseModal={handleCloseEditModal}
                              handleEditPost={handlePostUpdated}
                              editingPost={post}
                              isEditing={true}
                            />
                          )}
                          <button
                            onClick={handleDelete}
                            className="mt-2 w-full flex items-center space-x-3 px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash className="h-4 w-4" />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                      <hr className="my-2 border-slate-100" />
                      <button className="w-full flex items-center space-x-3 px-4 py-2 text-left text-red-800 hover:bg-red-50 transition-colors">
                        <FlagTriangleRight className="h-4 w-4" />
                        <span>Report</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <h2
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigate({ allowSamePage: true });
                }}
                className={`font-bold mb-3 hover:text-primary transition-colors cursor-pointer ${
                  post.title && post.title.length > 50 ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
                }`}
              >
                {post.title || "Untitled Post"}
              </h2>

              <p className="text-slate-700 leading-relaxed mb-4">{post.content || ""}</p>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-xs font-medium cursor-pointer transition-all hover:scale-105"
                    >
                      <Hash className="w-3 h-3" />
                      <span>{typeof tag === "string" ? tag.replace("#", "") : tag}</span>
                    </span>
                  ))}
                  {post.tags.length > 3 && (
                    <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs">
                      +{post.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Media */}
              <div className="flex flex-col lg:flex-row mt-4 relative group items-center justify-center gap-2">
                {/* Images */}
                {post.images && post.images.length > 0 && (
                  <div className="flex-1 relative group">
                    <img
                      src={post.images[0]}
                      alt="Post content"
                      className="w-full max-w-2xl h-80 object-cover rounded-xl shadow-md cursor-pointer transition-shadow group-hover:shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal(0);
                      }}
                    />
                    {post.images.length > 1 && (
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium">
                        1 of {post.images.length}
                      </div>
                    )}
                  </div>
                )}

                {/* Videos */}
                {post.videos && post.videos.length > 0 && post.videos[0]?.trim() && (
                  <div className="flex-1 relative group">
                    <video
                      src={post.videos[0]}
                      className="w-full max-w-2xl h-80 object-cover rounded-xl shadow-md group-hover:shadow-lg transition-shadow cursor-pointer"
                      controls={false}
                      onClick={(e) => {
                        e.stopPropagation();
                        const videoIndex = (post.images || []).length;
                        openModal(videoIndex);
                      }}
                    />
                    {post.videos.length > 1 && (
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium">
                        1 of {post.videos.length}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <PostActions
          post={post}
          handleVote={handleVote}
          userVoteStatus={userVoteStatus}
          upvotesCount={upvotesCount || 0}
          downvotesCount={downvotesCount || 0}
          toggleComments={toggleComments}
          isLiked={isLiked}
          handleLike={handleLike}
          likeCount={likeCount}
          isBookmarked={isBookmarked}
          engagementLevel={engagementLevel}
          commentsCount={commentsCount}
        />

        {/* Comments */}
        {expandedComments[post.id] && (
          <div className="border-t border-slate-100 bg-slate-50/30">
            <Comments
              post={post}
              formatTimeAgo={formatTimeAgo}
              onCommentsUpdate={(newCount) => setCommentsCount(newCount)}
            />
          </div>
        )}
      </article>

      {/* Fullscreen Modal */}
      {showModal && mediaItems.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 bg-opacity-90">
          {/* Close */}
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 z-60 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 z-60 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
            {currentMediaIndex + 1} of {mediaItems.length}
          </div>

          {/* Prev */}
          {mediaItems.length > 1 && (
            <button
              onClick={prevMedia}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-60 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Next */}
          {mediaItems.length > 1 && (
            <button
              onClick={nextMedia}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-60 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Content */}
          <div className="max-w-4xl max-h-full w-full h-full flex items-center justify-center p-4">
            {mediaItems[currentMediaIndex]?.type === "image" ? (
              <img
                src={mediaItems[currentMediaIndex].src}
                alt={`Media ${currentMediaIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <video
                src={mediaItems[currentMediaIndex].src}
                className="max-w-full max-h-full object-contain"
                controls
                autoPlay
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Post;
