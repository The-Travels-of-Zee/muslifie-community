"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Clock, ArrowRight, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSearchSuggestions } from "@/lib/actions/postActions";

const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const router = useRouter();
  const debounceRef = useRef(null);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error("Error loading recent searches:", error);
      }
    }
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search function
  const performSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await getSearchSuggestions(query);
      if (result.success) {
        setSearchResults(result.posts || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowDropdown(true);

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounce
    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 700);
  };

  // Handle input focus
  const handleInputFocus = () => {
    setShowDropdown(true);
  };

  // Save search to recent searches
  const saveToRecentSearches = (query) => {
    if (!query.trim()) return;

    const newRecentSearches = [query, ...recentSearches.filter((search) => search !== query)].slice(0, 5); // Keep only 5 recent searches

    setRecentSearches(newRecentSearches);
    localStorage.setItem("recentSearches", JSON.stringify(newRecentSearches));
  };

  // Handle search submission
  const handleSearch = (query = searchQuery) => {
    if (!query.trim()) return;

    saveToRecentSearches(query.trim());
    setShowDropdown(false);
    router.push(`/search?query=${encodeURIComponent(query.trim())}`);
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  // Handle recent search click
  const handleRecentSearchClick = (query) => {
    setSearchQuery(query);
    handleSearch(query);
  };

  // Handle show all results
  const handleShowAll = () => {
    handleSearch();
  };

  // Truncate text helper
  const truncateText = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // Highlight matching text
  const highlightText = (text, query) => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="font-bold text-primary">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div className="relative flex-1 max-w-lg mx-4" ref={searchRef}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search questions..."
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyPress={handleKeyPress}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-primary focus:outline-none transition-colors"
        />
      </div>

      {/* Search Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-slate-200 max-h-96 overflow-y-auto z-50"
        >
          {/* Loading State */}
          {isLoading && (
            <div className="p-4 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              <span className="ml-2 text-slate-600">Searching...</span>
            </div>
          )}

          {/* Search Results */}
          {!isLoading && searchQuery.trim() && searchResults.length > 0 && (
            <>
              <div className="p-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">Search Results</h3>
              </div>

              {searchResults.map((post) => (
                <div
                  key={post.id}
                  onClick={() => router.push(`/post/${post.id}`)}
                  className="p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-b-0 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      {post.images && post.images.length > 0 ? (
                        <img src={post.images[0]} alt="Post" className="w-8 h-8 object-cover rounded-lg" />
                      ) : (
                        <FileText className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-slate-900 line-clamp-1">
                        {highlightText(post.title || "Untitled Post", searchQuery)}
                      </h4>
                      {post.content && (
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                          {highlightText(truncateText(post.content, 80), searchQuery)}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs text-slate-500">by {post.user?.fullName || "Unknown User"}</span>
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex items-center flex-wrap gap-1">
                            <span className="text-xs text-slate-400">•</span>
                            {post.tags.slice(0, 3).map((tag, index) => (
                              <span key={index} className="text-xs text-primary">
                                #{tag}
                              </span>
                            ))}
                            {post.tags.length > 3 && (
                              <span className="text-xs text-slate-400">+{post.tags.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Show All Results Button */}
              <div className="p-3 border-t border-slate-100">
                <button
                  onClick={handleShowAll}
                  className="flex items-center justify-center space-x-2 w-full py-2 text-primary hover:bg-primary/5 rounded-lg transition-colors"
                >
                  <span className="text-sm font-medium">Show all results</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* No Results */}
          {!isLoading && searchQuery.trim() && searchResults.length === 0 && (
            <div className="p-6 text-center">
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600 text-sm">No posts found for &quot;{searchQuery}&quot;</p>
              <p className="text-slate-500 text-xs mt-1">Try different keywords or check spelling</p>
            </div>
          )}

          {/* Recent Searches */}
          {!searchQuery.trim() && recentSearches.length > 0 && (
            <>
              <div className="p-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">Recent Searches</h3>
              </div>
              {recentSearches.map((recentQuery, index) => (
                <div
                  key={index}
                  onClick={() => handleRecentSearchClick(recentQuery)}
                  className="flex items-center space-x-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-b-0 transition-colors"
                >
                  <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-700 flex-1">{recentQuery}</span>
                </div>
              ))}
            </>
          )}

          {/* Empty State */}
          {!searchQuery.trim() && recentSearches.length === 0 && (
            <div className="p-6 text-center">
              <Search className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600 text-sm">Start typing to search posts</p>
              <p className="text-slate-500 text-xs mt-1">Search by title, content, or tags</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
