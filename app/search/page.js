"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, FileText, Filter, SortDesc, Calendar, TrendingUp } from "lucide-react";
import { searchPosts } from "@/lib/actions/postActions";
import { useAuthStore } from "@/stores/useAuthStore";
import Post from "@/components/Post"; // Adjust path as needed
import { formatTimeAgo } from "@/lib/utils";

const SearchPage = () => {
  const searchParams = useSearchParams();
  const query = searchParams.get("query") || "";

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalResults, setTotalResults] = useState(0);
  const [sortBy, setSortBy] = useState("relevance"); // relevance, newest, oldest, popular
  const [expandedComments, setExpandedComments] = useState({});
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const handleBackClick = () => {
    router.back();
  };

  // Load search results
  useEffect(() => {
    if (query) {
      performSearch(query);
    } else {
      setLoading(false);
    }
  }, [query, sortBy]);

  const performSearch = async (searchQuery) => {
    setLoading(true);
    setError(null);

    try {
      const result = await searchPosts(searchQuery, 50); // Get more results for full page

      if (result.success) {
        let sortedPosts = [...result.posts];

        // Apply sorting
        switch (sortBy) {
          case "newest":
            sortedPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
          case "oldest":
            sortedPosts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
          case "popular":
            sortedPosts.sort((a, b) => b.upvotes + b.likes + b.comments - (a.upvotes + a.likes + a.comments));
            break;
          case "relevance":
          default:
            // Already sorted by relevance from server
            break;
        }

        setPosts(sortedPosts);
        setTotalResults(result.totalResults || sortedPosts.length);
      } else {
        setError(result.error || "Failed to search posts");
        setPosts([]);
        setTotalResults(0);
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("An error occurred while searching");
      setPosts([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  const toggleComments = (postId) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const getSortIcon = () => {
    switch (sortBy) {
      case "newest":
      case "oldest":
        return <Calendar className="w-4 h-4" />;
      case "popular":
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <SortDesc className="w-4 h-4" />;
    }
  };

  if (!query) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={handleBackClick}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to posts
          </button>
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Search Posts</h1>
            <p className="text-slate-600">Enter a search term to find relevant posts</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={handleBackClick}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to posts
        </button>
        {/* Search Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Search className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-slate-900">Search Results</h1>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-slate-600">
                Results for <span className="font-semibold text-slate-900">&quot;{query}&quot;</span>
              </p>
              {!loading && (
                <p className="text-sm text-slate-500">
                  {totalResults} {totalResults === 1 ? "result" : "results"} found
                </p>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">Sort by:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="relevance">Relevance</option>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="popular">Most Popular</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  {getSortIcon()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-slate-600">Searching posts...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Search Error</h2>
            <p className="text-slate-600 mb-4">{error}</p>
            <button
              onClick={() => performSearch(query)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* No Results */}
        {!loading && !error && posts.length === 0 && (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No Results Found</h2>
            <p className="text-slate-600 mb-4">
              No posts found for &quot;{query}&quot;. Try different keywords or check your spelling.
            </p>
            <div className="text-sm text-slate-500 space-y-1">
              <p>Search tips:</p>
              <ul className="list-disc list-inside space-y-1 max-w-md mx-auto text-left">
                <li>Try broader or more general terms</li>
                <li>Check for typos in your search</li>
                <li>Use different keywords that mean the same thing</li>
                <li>Try searching for tags with # symbol</li>
              </ul>
            </div>
          </div>
        )}

        {/* Search Results */}
        {!loading && !error && posts.length > 0 && (
          <div className="space-y-6">
            {posts.map((post) => (
              <Post
                key={post.id}
                post={post}
                expandedComments={expandedComments}
                toggleComments={toggleComments}
                formatTimeAgo={formatTimeAgo}
                onPostUpdate={() => {
                  console.log("Post updated:", post.id);
                }}
                currentUser={currentUser}
              />
            ))}
          </div>
        )}

        {/* Load More Results */}
        {!loading && !error && posts.length > 0 && posts.length < totalResults && (
          <div className="text-center py-8">
            <button
              onClick={() => performSearch(query)}
              className="px-6 py-3 bg-white text-primary border border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
            >
              Load More Results
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
