import { useState, useCallback } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  Heart,
  MessageCircle,
  Sparkles,
  Share2,
  Copy,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  MessageCircle as WhatsApp,
  Check,
  ExternalLink,
} from "lucide-react";
import { FaRegThumbsDown, FaRegThumbsUp } from "react-icons/fa";
import { useRouter } from "next/navigation";

export const PostActions = ({
  post,
  isLiked,
  handleLike,
  likeCount,
  handleVote,
  userVoteStatus,
  upvotesCount,
  downvotesCount,
  toggleComments,
  engagementLevel,
  commentsCount,
  likesLoading,
  votesLoading,
}) => {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  // Share functionality states
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // ✅ wrapper to ensure login check
  const requireAuth = (action) => {
    if (!user) {
      router.push("/login");
      return;
    }
    action();
  };

  // Generate the post URL
  const getPostUrl = useCallback(() => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/post/${post.id}`;
  }, [post.id]);

  // Copy link to clipboard
  const handleCopyLink = useCallback(async () => {
    try {
      const url = getPostUrl();
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = getPostUrl();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [getPostUrl]);

  // Share on Facebook
  const handleFacebookShare = useCallback(() => {
    const url = getPostUrl();
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareUrl, "_blank", "width=600,height=400,scrollbars=yes,resizable=yes");
    setShowShareMenu(false);
  }, [getPostUrl]);

  // Share on Twitter
  const handleTwitterShare = useCallback(() => {
    const url = getPostUrl();
    const text = post.title ? `Check out this post: ${post.title}` : "Check out this post";
    const hashtags = post.tags ? post.tags.slice(0, 3).join(",") : "";
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(
      url
    )}&hashtags=${encodeURIComponent(hashtags)}`;
    window.open(shareUrl, "_blank", "width=600,height=400,scrollbars=yes,resizable=yes");
    setShowShareMenu(false);
  }, [getPostUrl, post.title, post.tags]);

  // Share on LinkedIn
  const handleLinkedInShare = useCallback(() => {
    const url = getPostUrl();
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(shareUrl, "_blank", "width=600,height=400,scrollbars=yes,resizable=yes");
    setShowShareMenu(false);
  }, [getPostUrl]);

  // Share on Instagram
  const handleInstagramShare = useCallback(() => {
    const content = `${post.title || "Check out this post"}\n\n${post.content || ""}\n\n${getPostUrl()}`;

    navigator.clipboard
      .writeText(content)
      .then(() => {
        alert("Content copied to clipboard! You can now paste it in Instagram.");
        window.open("https://www.instagram.com/", "_blank");
      })
      .catch(() => {
        alert("Please copy this content manually and share on Instagram:\n\n" + content);
      });
    setShowShareMenu(false);
  }, [post.title, post.content, getPostUrl]);

  // Share via WhatsApp
  const handleWhatsAppShare = useCallback(() => {
    const url = getPostUrl();
    const text = `${post.title || "Check out this post"}\n${url}`;
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, "_blank");
    setShowShareMenu(false);
  }, [getPostUrl, post.title]);

  // Native Web Share API
  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || "Check out this post",
          text: post.content || "",
          url: getPostUrl(),
        });
        setShowShareMenu(false);
      } catch (err) {
        console.error("Error sharing:", err);
      }
    }
  }, [post.title, post.content, getPostUrl]);

  // Share menu items
  const shareOptions = [
    {
      id: "copy",
      label: copySuccess ? "Copied!" : "Copy link",
      icon: copySuccess ? Check : Copy,
      onClick: handleCopyLink,
      color: copySuccess ? "text-green-600" : "text-slate-600",
    },
    {
      id: "facebook",
      label: "Share on Facebook",
      icon: Facebook,
      onClick: handleFacebookShare,
      color: "text-blue-600",
    },
    {
      id: "twitter",
      label: "Share on Twitter",
      icon: Twitter,
      onClick: handleTwitterShare,
      color: "text-sky-500",
    },
    {
      id: "instagram",
      label: "Share on Instagram",
      icon: Instagram,
      onClick: handleInstagramShare,
      color: "text-pink-600",
    },
    {
      id: "whatsapp",
      label: "Share on WhatsApp",
      icon: WhatsApp,
      onClick: handleWhatsAppShare,
      color: "text-green-600",
    },
  ];

  // Add native share option for mobile
  if (typeof window !== "undefined" && navigator.share) {
    shareOptions.unshift({
      id: "native",
      label: "Share",
      icon: ExternalLink,
      onClick: handleNativeShare,
      color: "text-slate-600",
    });
  }

  return (
    <div
      className={`px-4 py-4 ${
        engagementLevel === "high" ? "bg-gradient-to-r from-yellow-50 to-orange-50" : "bg-slate-50/50"
      } border-t border-slate-100`}
    >
      {/* Main Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left actions (votes, comments, like) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Voting */}
          <div className="flex items-center bg-white rounded-full shadow-sm border border-slate-200 overflow-hidden">
            <button
              onClick={() => requireAuth(() => handleVote("up"))}
              disabled={votesLoading}
              className={`flex items-center space-x-1 px-2 py-2 text-sm font-medium transition-all
              ${
                votesLoading
                  ? "opacity-50 cursor-not-allowed bg-white text-slate-400"
                  : userVoteStatus === "up"
                  ? "bg-green-500 text-white shadow-lg scale-105"
                  : "text-slate-600 hover:bg-green-50 hover:text-green-600"
              }`}
            >
              <FaRegThumbsUp className="w-4 h-4" />
              <span>{upvotesCount || 0}</span>
            </button>

            <div className="w-px h-6 bg-slate-200"></div>

            <button
              onClick={() => requireAuth(() => handleVote("down"))}
              disabled={votesLoading}
              className={`flex items-center space-x-1 px-2 py-2 text-sm font-medium transition-all
              ${
                votesLoading
                  ? "opacity-50 cursor-not-allowed bg-white text-slate-400"
                  : userVoteStatus === "down"
                  ? "bg-red-500 text-white shadow-lg scale-105"
                  : "text-slate-600 hover:bg-red-50 hover:text-red-600"
              }`}
            >
              <FaRegThumbsDown className="w-4 h-4" />
              <span>{downvotesCount || 0}</span>
            </button>
          </div>

          {/* Comments */}
          <button
            onClick={() => requireAuth(() => toggleComments(post.id))}
            className="flex items-center space-x-1 px-3 py-2 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-600 rounded-full text-sm transition-all shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{commentsCount}</span>
            <span className="hidden sm:inline">{commentsCount === 1 ? "comment" : "comments"}</span>
          </button>

          {/* Like */}
          <button
            onClick={() => requireAuth(handleLike)}
            disabled={likesLoading}
            className={`flex items-center space-x-1 px-4 py-2 border rounded-full text-sm transition-all shadow-sm
              ${
                likesLoading
                  ? "opacity-50 cursor-not-allowed bg-white border-slate-200 text-slate-400"
                  : isLiked
                  ? "bg-pink-500 text-white border-pink-500 shadow-lg"
                  : "bg-white hover:bg-pink-50 border-slate-200 hover:border-pink-200 text-slate-600 hover:text-pink-600"
              }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-current scale-110" : ""}`} />
            <span>{likeCount}</span>
          </button>
        </div>

        {/* Right actions (share) */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowShareMenu(!showShareMenu);
            }}
            className="flex items-center space-x-1 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 rounded-full text-sm transition-all shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>

          {/* Share Menu */}
          {showShareMenu && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowShareMenu(false)} />

              {/* Mobile Bottom Sheet */}
              <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-xl sm:hidden animate-in slide-in-from-bottom duration-300">
                {/* Drag handle */}
                <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2 mb-3" />

                <div className="px-4 pb-4 max-h-[70vh] overflow-y-auto">
                  <h3 className="font-semibold text-slate-900 text-base mb-2">Share this post</h3>
                  <p className="text-xs text-slate-500 mb-3 truncate">{post.title || "Share with your network"}</p>

                  <div className="space-y-1">
                    {shareOptions.map((option) => {
                      const IconComponent = option.icon;
                      return (
                        <button
                          key={option.id}
                          onClick={option.onClick}
                          className="w-full flex items-center space-x-3 px-3 py-3 text-left hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <IconComponent className={`w-5 h-5 ${option.color}`} />
                          <span className="text-sm text-slate-700">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Stats */}
                  <div className="mt-4 border-t border-slate-200 pt-2 text-xs text-slate-500 flex justify-between">
                    <span>{upvotesCount} upvotes</span>
                    <span>{commentsCount} comments</span>
                    <span>{likeCount} likes</span>
                  </div>
                </div>
              </div>

              {/* Desktop Dropdown Menu */}
              <div className="hidden sm:block absolute bottom-full right-0 mb-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in slide-in-from-bottom-2 duration-200">
                <div className="px-4 py-2 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900 text-sm">Share this post</h3>
                  <p className="text-xs text-slate-500 mt-1 truncate">{post.title || "Share with your network"}</p>
                </div>

                <div className="py-1 max-h-[50vh] overflow-y-auto">
                  {shareOptions.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <button
                        key={option.id}
                        onClick={option.onClick}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors group"
                      >
                        <IconComponent className={`w-4 h-4 ${option.color}`} />
                        <span className="text-sm text-slate-700 group-hover:text-slate-900">{option.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="px-4 py-2 border-t border-slate-100 mt-1 text-xs text-slate-500 flex justify-between">
                  <span>{upvotesCount} upvotes</span>
                  <span>{commentsCount} comments</span>
                  <span>{likeCount} likes</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Engagement Stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-3">
          <span>{(upvotesCount || 0) + (downvotesCount || 0)} total reactions</span>
          <span>
            {commentsCount} {commentsCount === 1 ? "comment" : "comments"}
          </span>
        </div>
        {engagementLevel === "high" && (
          <div className="flex items-center space-x-1 text-yellow-600 font-medium">
            <Sparkles className="w-3 h-3" />
            <span>High engagement</span>
          </div>
        )}
      </div>
    </div>
  );
};
