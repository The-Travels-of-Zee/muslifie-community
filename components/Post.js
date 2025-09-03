"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { togglePostLike, checkUserLike, togglePostVote, checkUserVote } from "@/lib/actions/posts";
import { PostActions } from "./PostActions";

const Post = ({ post, expandedComments, toggleComments, formatTimeAgo, onPostUpdate, currentUser }) => {
  const router = useRouter();

  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [likesLoading, setLikesLoading] = useState(true);

  const [votesLoading, setVotesLoading] = useState(true);
  const [userVoteStatus, setUserVoteStatus] = useState(null);
  const [upvotesCount, setUpvotesCount] = useState(post.upvotes || 0);
  const [downvotesCount, setDownvotesCount] = useState(post.downvotes || 0);

  const [commentsCount, setCommentsCount] = useState(post.comments || 0);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const pathname = usePathname();

  // Combine images and videos into a single media array
  const mediaItems = [
    ...(post.images || []).map((img) => ({ type: "image", src: img })),
    ...(post.videos || []).map((video) => ({ type: "video", src: video })),
  ];

  // Navigate to post detail
  const handleNavigate = () => {
    if (pathname === "/") {
      router.push(`/post/${post.id}`);
    }
  };

  // Modal functions
  const openModal = (index) => {
    setCurrentMediaIndex(index);
    setShowModal(true);
    // Prevent body scroll
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setShowModal(false);
    document.body.style.overflow = "unset";
  };

  const nextMedia = () => {
    setCurrentMediaIndex((prev) => (prev === mediaItems.length - 1 ? 0 : prev + 1));
  };

  const prevMedia = () => {
    setCurrentMediaIndex((prev) => (prev === 0 ? mediaItems.length - 1 : prev - 1));
  };

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };

    if (showModal) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [showModal]);

  // Check if current user has liked this post
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (currentUser && post.id) {
        try {
          setLikesLoading(true);
          const userHasLiked = await checkUserLike(post.id, currentUser.id);
          setIsLiked(userHasLiked);
        } catch (error) {
          console.error("Error checking like status:", error);
        } finally {
          setLikesLoading(false);
        }
      } else {
        setLikesLoading(false);
      }
    };

    checkLikeStatus();
  }, [post.id, currentUser]);

  // Check if current user has voted this post
  useEffect(() => {
    const checkVoteStatus = async () => {
      if (currentUser && post.id) {
        try {
          setVotesLoading(true);
          const userVote = await checkUserVote(post.id, currentUser.id);
          setUserVoteStatus(userVote);
        } catch (error) {
          console.error("Error checking vote status:", error);
        } finally {
          setVotesLoading(false);
        }
      } else {
        setVotesLoading(false);
      }
    };

    checkVoteStatus();
  }, [post.id, currentUser]);

  // Sync updates from post prop
  useEffect(() => {
    setCommentsCount(post.comments || 0);
  }, [post.comments]);

  useEffect(() => {
    setLikeCount(post.likes || 0);
  }, [post.likes]);

  useEffect(() => {
    setUpvotesCount(post.upvotes || 0);
    setDownvotesCount(post.downvotes || 0);
  }, [post.upvotes, post.downvotes]);

  const handleLike = async () => {
    if (!currentUser || likesLoading) return;

    try {
      const newIsLiked = !isLiked;
      const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1;

      setIsLiked(newIsLiked);
      setLikeCount(newLikeCount);

      const result = await togglePostLike(post.id, currentUser, isLiked);

      if (result.success) {
        setIsLiked(result.isLiked);
        setLikeCount(result.likesCount);
      } else {
        setIsLiked(isLiked);
        setLikeCount(likeCount);
      }
    } catch {
      setIsLiked(isLiked);
      setLikeCount(likeCount);
    }
  };

  const handleVote = async (voteType) => {
    if (!currentUser) return;

    try {
      setVotesLoading(true);

      if (voteType === "up") {
        if (userVoteStatus === "up") {
          setUserVoteStatus(null);
          setUpvotesCount(upvotesCount - 1);
        } else if (userVoteStatus === "down") {
          setUserVoteStatus("up");
          setUpvotesCount(upvotesCount + 1);
          setDownvotesCount(downvotesCount - 1);
        } else {
          setUserVoteStatus("up");
          setUpvotesCount(upvotesCount + 1);
        }
      } else if (voteType === "down") {
        if (userVoteStatus === "down") {
          setUserVoteStatus(null);
          setDownvotesCount(downvotesCount - 1);
        } else if (userVoteStatus === "up") {
          setUserVoteStatus("down");
          setUpvotesCount(upvotesCount - 1);
          setDownvotesCount(downvotesCount + 1);
        } else {
          setUserVoteStatus("down");
          setDownvotesCount(downvotesCount + 1);
        }
      }

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
    } finally {
      setVotesLoading(false);
    }
  };

  const engagementLevel =
    (post.upvotes || 0) + commentsCount > 50 ? "high" : (post.upvotes || 0) + commentsCount > 30 ? "medium" : "low";

  const user = post.userInfo || {};

  return (
    <>
      <article
        className={`${
          pathname === "/" ? "cursor-pointer" : ""
        } bg-white rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-500 group relative ${
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
        <div className="p-4" onClick={handleNavigate}>
          <div className="flex items-start space-x-4">
            <div className="min-w-0 w-full">
              <div className="flex items-center justify-between space-x-2 mb-4">
                <div className="relative flex gap-3 items-center">
                  <div
                    className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full text-xl transition-transform ${
                      engagementLevel === "high"
                        ? "bg-gradient-to-br from-yellow-100 to-orange-100 ring-2 ring-yellow-300"
                        : "bg-gradient-to-br from-slate-100 to-slate-200"
                    }`}
                  >
                    {user?.profileImage === "" ? (
                      <img src={user?.profileImage} alt="User Avatar" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-slate-600" />
                    )}
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
                      e.stopPropagation(); // prevent navigation
                      setShowMoreMenu(!showMoreMenu);
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
                          setIsBookmarked(!isBookmarked);
                          setShowMoreMenu(false);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-left text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Bookmark className={`w-4 h-4 ${isBookmarked ? "text-yellow-600 fill-current" : ""}`} />
                        <span>{isBookmarked ? "Remove bookmark" : "Bookmark post"}</span>
                      </button>
                      <hr className="my-2 border-slate-100" />
                      <button className="w-full flex items-center space-x-3 px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors">
                        <span>🚫</span>
                        <span>Report post</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <h2
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigate();
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

              {/* Images */}
              {post.images && post.images.length > 0 && (
                <div className="mt-4 relative group">
                  <img
                    src={post.images[0]}
                    alt="Post content"
                    className="w-full max-w-2xl h-80 object-cover rounded-xl shadow-md cursor-pointer transition-all duration-500 hover:scale-[1.02] group-hover:shadow-lg"
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
              {post.videos && post.videos.length > 0 && (
                <div className="mt-4 relative group">
                  <video
                    src={post.videos[0]}
                    className="w-full max-w-2xl h-80 object-cover rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                    controls={false}
                    onClick={(e) => {
                      e.stopPropagation();
                      const videoIndex = (post.images || []).length; // Start from after images
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
          showShareMenu={showShareMenu}
          setShowShareMenu={setShowShareMenu}
          isBookmarked={isBookmarked}
          engagementLevel={engagementLevel}
          commentsCount={commentsCount}
          likesLoading={likesLoading}
          votesLoading={votesLoading}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
          {/* Close Button */}
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 z-60 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Media Counter */}
          <div className="absolute top-4 left-4 z-60 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
            {currentMediaIndex + 1} of {mediaItems.length}
          </div>

          {/* Previous Button */}
          {mediaItems.length > 1 && (
            <button
              onClick={prevMedia}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-60 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Next Button */}
          {mediaItems.length > 1 && (
            <button
              onClick={nextMedia}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-60 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Media Content */}
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

          {/* Click outside to close */}
          <div className="absolute inset-0 -z-10" onClick={closeModal} />
        </div>
      )}
    </>
  );
};

export default Post;
