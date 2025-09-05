import { useAuthStore } from "@/stores/useAuthStore";
import { Heart, MessageCircle, Sparkles } from "lucide-react";
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

  // ✅ wrapper to ensure login check
  const requireAuth = (action) => {
    if (!user) {
      router.push("/login");
      return;
    }
    action();
  };

  return (
    <div
      className={`px-4 py-4 ${
        engagementLevel === "high" ? "bg-gradient-to-r from-yellow-50 to-orange-50" : "bg-slate-50/50"
      } border-t border-slate-100`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Voting */}
          <div className="flex items-center bg-white rounded-full shadow-sm border border-slate-200 overflow-hidden">
            <button
              onClick={() => requireAuth(() => handleVote("up"))}
              disabled={votesLoading}
              className={`flex items-center space-x-2 px-2 py-2 transition-all font-medium
              ${
                votesLoading
                  ? "opacity-50 cursor-not-allowed bg-white border border-slate-200 text-slate-400"
                  : userVoteStatus === "up"
                  ? "bg-green-500 text-white shadow-lg scale-105"
                  : "text-slate-600 hover:bg-green-50 hover:text-green-600"
              }`}
            >
              <FaRegThumbsUp className={`w-4 h-4 ${userVoteStatus === "up" ? "fill-current" : ""}`} />
              <span className="text-sm font-bold">{upvotesCount || 0}</span>
            </button>

            <div className="w-px h-6 bg-slate-200"></div>

            <button
              onClick={() => requireAuth(() => handleVote("down"))}
              disabled={votesLoading}
              className={`flex items-center space-x-2 px-4 py-2 transition-all font-medium
              ${
                votesLoading
                  ? "opacity-50 cursor-not-allowed bg-white border border-slate-200 text-slate-400"
                  : userVoteStatus === "down"
                  ? "bg-red-500 text-white shadow-lg scale-105"
                  : "text-slate-600 hover:bg-red-50 hover:text-red-600"
              }`}
            >
              <FaRegThumbsDown className={`w-4 h-4 ${userVoteStatus === "down" ? "fill-current" : ""}`} />
              <span className="text-sm font-bold">{downvotesCount || 0}</span>
            </button>
          </div>

          {/* Comments */}
          <button
            onClick={() => requireAuth(() => toggleComments(post.id))}
            className="flex items-center space-x-2 px-2 py-2 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-600 rounded-full transition-all hover:scale-105 shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{commentsCount}</span>
            <span className="text-xs">{commentsCount === 1 ? "comment" : "comments"}</span>
          </button>

          {/* Like */}
          <button
            onClick={() => requireAuth(handleLike)}
            disabled={likesLoading}
            className={`flex items-center space-x-2 px-4 py-2 border rounded-full transition-all hover:scale-105 shadow-sm ${
              likesLoading
                ? "opacity-50 cursor-not-allowed bg-white border-slate-200 text-slate-400"
                : isLiked
                ? "bg-pink-500 text-white border-pink-500 shadow-lg"
                : "bg-white hover:bg-pink-50 border-slate-200 hover:border-pink-200 text-slate-600 hover:text-pink-600"
            }`}
          >
            <Heart className={`w-4 h-4 transition-all ${isLiked ? "fill-current scale-110" : ""}`} />
            <span className="text-sm font-medium">{likeCount}</span>
          </button>
        </div>
      </div>

      {/* Engagement Stats */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center space-x-4 text-xs text-slate-500">
          <span>{upvotesCount + downvotesCount} total reactions</span>
          <span>
            {commentsCount} {commentsCount === 1 ? "comment" : "comments"}
          </span>
        </div>

        {engagementLevel === "high" && (
          <div className="flex items-center space-x-1 text-yellow-600 text-xs font-medium">
            <Sparkles className="w-3 h-3" />
            <span>High engagement</span>
          </div>
        )}
      </div>
    </div>
  );
};