"use client";
import { useState, useRef, useEffect } from "react";
import {
  Search,
  Bell,
  Plus,
  Menu,
  ChevronDown,
  User,
  Settings,
  LogOut,
  X,
  Bookmark,
  FileText,
  LogIn,
  UserPlus,
} from "lucide-react";
import CreatePost from "./CreatePostModal";
import Notifications from "./Notifications";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore"; // Adjust path as needed

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const dropdownRef = useRef(null);
  const router = useRouter();

  // Get auth state from Zustand store
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();

  const links = [
    { label: "My Posts", icon: FileText },
    { label: "Saved Posts", icon: Bookmark },
    { label: "Settings", icon: Settings },
  ];

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle create post click
  const handleCreatePostClick = () => {
    if (isAuthenticated) {
      setShowCreatePost(true);
    } else {
      router.push("/login");
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      setShowSidebar(false);
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Render auth buttons for unauthenticated users
  const renderAuthButtons = () => (
    <div className="flex items-center space-x-2">
      <Link href="/login">
        <button className="flex items-center space-x-2 text-slate-600 hover:bg-(--secondary-light)/50 px-3 py-2 rounded-lg transition-colors">
          <LogIn className="w-4 h-4" />
          <span className="font-medium">Login</span>
        </button>
      </Link>
      <Link href="/signup">
        <button className="flex items-center space-x-2 bg-secondary text-white px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors">
          <UserPlus className="w-4 h-4" />
          <span className="font-medium">Sign Up</span>
        </button>
      </Link>
    </div>
  );

  // Render user profile section for authenticated users
  const renderUserProfile = () => (
    <div className="relative hidden sm:block" ref={dropdownRef}>
      <Link href="/my-posts">
        <button className="flex items-center space-x-2 text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center relative">
            {user?.profileImage ? (
              <img src={user?.profileImage} className="w-8 h-8 rounded-full" alt="user-profile" />
            ) : (
              <span className="text-white text-sm font-medium">
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
          <span className="font-medium">{user?.fullName?.split(" ")[0] || "User"}</span>
        </button>
      </Link>
    </div>
  );

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <img src="/favicon/logo.png" alt="Muslifie Logo" className="w-8 h-8" />
                <div>
                  <span className="font-amiri text-xl text-dark hidden sm:block">Muslifie</span>
                  <span className="text-sm hidden sm:block">Community</span>
                </div>
              </Link>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-lg mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search tours, places, questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* Create Post Button - Desktop */}
              <button
                onClick={handleCreatePostClick}
                className="hidden sm:flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="font-medium">Create Post</span>
              </button>

              {/* Conditional rendering based on auth state */}
              {isLoading ? (
                <div className="hidden sm:block w-8 h-8 rounded-full bg-slate-200 animate-pulse"></div>
              ) : isAuthenticated ? (
                <>
                  {/* Notifications - only for authenticated users */}
                  <button
                    onClick={() => setShowNotifications(true)}
                    className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  </button>

                  {/* User Profile */}
                  {renderUserProfile()}
                </>
              ) : (
                /* Auth buttons for unauthenticated users - Desktop */
                <div className="hidden sm:block">{renderAuthButtons()}</div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="sm:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Create Post Modal */}
      {showCreatePost && (
        <CreatePost
          handleCloseCreatePost={() => setShowCreatePost(false)}
          handleCreatePost={(post) => {
            console.log("New post from navbar:", post);
            setShowCreatePost(false); // close modal after creating
          }}
        />
      )}

      {/* Notification Modal - only show if authenticated */}
      {isAuthenticated && <Notifications isOpen={showNotifications} onClose={() => setShowNotifications(false)} />}

      {/* Mobile Sidebar with Blurred Background */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Blurred backdrop */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowSidebar(false)}></div>

          {/* Sidebar content */}
          <div className="relative bg-white/95 backdrop-blur-md w-80 h-full shadow-xl border-r border-white/20 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-200/50">
              <div className="flex items-center justify-between mb-4">
                <Link href="/" className="flex items-center space-x-2">
                  <img src="/favicon/logo.png" alt="Muslifie Logo" className="w-8 h-8" />
                  <div>
                    <p className="font-amiri text-lg text-dark font-semibold">Muslifie</p>
                    <span className="text-sm">Community</span>
                  </div>
                </Link>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="text-slate-500 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Profile Section or Auth Buttons */}
              {isLoading ? (
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-slate-200 rounded-full animate-pulse"></div>
                  <div className="flex-1 min-w-0">
                    <div className="h-4 bg-slate-200 rounded animate-pulse mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded animate-pulse w-2/3"></div>
                  </div>
                </div>
              ) : isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    {user?.profileImage ? (
                      <img src={user?.profileImage} className="w-12 h-12 rounded-full" alt="user-profile" />
                    ) : (
                      <span className="text-white text-lg font-medium">
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
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-slate-900 truncate">{user?.fullName || "User"}</p>
                    <p className="text-sm text-slate-600 truncate">{user?.email || ""}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col space-y-4">
                  <p className="text-sm text-slate-600 mb-3">
                    Join Muslifie Community to create posts and connect with others
                  </p>
                  <Link href="/login">
                    <button className="flex items-center space-x-3 w-full bg-slate-100 text-slate-700 hover:bg-(--secondary-light)/50 px-4 py-3 rounded-lg transition-colors">
                      <LogIn className="w-5 h-5" />
                      <span className="font-medium">Login</span>
                    </button>
                  </Link>
                  <Link href="/signup">
                    <button className="flex items-center space-x-3 w-full bg-secondary hover:bg-secondary/90 text-white px-4 py-3 rounded-lg transition-colors">
                      <UserPlus className="w-5 h-5" />
                      <span className="font-medium">Sign Up</span>
                    </button>
                  </Link>
                </div>
              )}
            </div>

            {/* Menu Items */}
            <div className="flex-1 px-4 py-6 space-y-4 overflow-y-auto">
              <button
                onClick={() => {
                  handleCreatePostClick();
                  if (isAuthenticated) {
                    // Only close sidebar if user is authenticated and modal will open
                    setShowSidebar(false);
                  }
                }}
                className="flex items-center space-x-3 w-full bg-primary text-white px-4 py-3 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Create Post</span>
              </button>

              {/* Show these menu items only for authenticated users */}
              {isAuthenticated && (
                <>
                  {/* Notifications Button for Mobile */}
                  <button
                    onClick={() => {
                      setShowNotifications(true);
                      setShowSidebar(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-3 text-left text-slate-700 bg-primary/10 active:text-primary rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Bell className="w-5 h-5" />
                      <span className="font-medium">Notifications</span>
                    </div>
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  </button>

                  {links.map((link, index) => {
                    const Icon = link.icon;
                    return (
                      <button
                        key={index}
                        className="flex items-center space-x-3 w-full px-4 py-3 text-left text-slate-700 bg-primary/10 active:text-primary rounded-lg"
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{link.label}</span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Bottom section - Logout for authenticated users */}
            {isAuthenticated && (
              <div className="p-4 border-t border-slate-200/50">
                <button
                  className="flex items-center space-x-3 w-full px-4 py-3 text-red-600 bg-red-50 hover:bg-red-50/50 rounded-lg transition-colors"
                  onClick={handleLogout}
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
