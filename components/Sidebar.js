"use client";
import { useState } from "react";
import {
  Bookmark,
  FileText,
  Settings,
  LogOut,
  User,
  TrendingUp,
  Users,
  MessageCircle,
  Heart,
  MapPin,
  Calendar,
  Award,
  ChevronRight,
  Plus,
  LogIn,
  UserPlus,
  Sparkles,
  Globe,
  Star,
  Download,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore"; // Adjust path as needed

const Sidebar = () => {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const [activeLink, setActiveLink] = useState("");

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Quick actions for unauthenticated users
  const quickActions = [
    { icon: TrendingUp, label: "Trending Posts", href: "/trending" },
    { icon: MapPin, label: "Popular Places", href: "/places" },
    { icon: Users, label: "Community", href: "/community" },
    { icon: Calendar, label: "Events", href: "/events" },
  ];

  // Navigation items for authenticated users
  const navItems = [
    { icon: FileText, label: "My Posts", href: "/my-posts", count: user?.postsCount || 0 },
    { icon: Bookmark, label: "Saved Posts", href: "/saved-posts", count: user?.savedCount || 0 },
    { icon: Heart, label: "Liked Posts", href: "/liked-posts", count: user?.likesCount || 0 },
    { icon: MessageCircle, label: "My Comments", href: "/my-comments", count: user?.commentsCount || 0 },
  ];

  // Community stats (mock data for demonstration)
  const communityStats = [
    { label: "Active Members", value: "5.5K", icon: Users },
    { label: "Posts Today", value: "100+", icon: FileText },
    { label: "Places Shared", value: "1.2K", icon: MapPin },
  ];

  // Loading skeleton
  if (isLoading) {
    return (
      <aside className="hidden lg:block w-80">
        <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-24 shadow-sm">
          <div className="animate-pulse">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-2/3"></div>
              </div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // Authenticated user sidebar
  if (isAuthenticated && user) {
    return (
      <aside className="hidden lg:block w-80">
        <div className="space-y-6">
          {/* User Profile Card */}
          <div className="bg-white bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/10 p-6 sticky top-24 shadow-sm">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center relative group cursor-pointer">
                {user?.profileImage ? (
                  <img src={user.profileImage} className="w-14 h-14 rounded-full object-cover" alt="user-profile" />
                ) : (
                  <span className="text-white text-lg font-semibold">
                    {user?.fullName
                      ? user.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                      : "U"}
                  </span>
                )}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 truncate text-lg">{user?.fullName || "User"}</h3>
                <p className="text-sm text-slate-600 truncate">{user?.email || ""}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs text-slate-500">{user?.reputation || 0} reputation</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-2 bg-white/50 rounded-lg">
                <div className="font-semibold text-slate-900">{user?.postsCount || 0}</div>
                <div className="text-xs text-slate-600">Posts</div>
              </div>
              <div className="text-center p-2 bg-white/50 rounded-lg">
                <div className="font-semibold text-slate-900">{user?.followersCount || 0}</div>
                <div className="text-xs text-slate-600">Followers</div>
              </div>
              <div className="text-center p-2 bg-white/50 rounded-lg">
                <div className="font-semibold text-slate-900">{user?.followingCount || 0}</div>
                <div className="text-xs text-slate-600">Following</div>
              </div>
            </div>

            {/* Create Post CTA */}
            <Link href="/create-post">
              <button className="w-full bg-primary text-white py-2.5 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2 group">
                <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Create New Post</span>
              </button>
            </Link>
          </div>

          {/* Navigation Menu */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-primary" />
              Your Activity
            </h4>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeLink === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setActiveLink(item.href)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                      isActive
                        ? "bg-primary/10 text-primary border-l-4 border-primary"
                        : "text-slate-700 hover:bg-slate-50 hover:text-primary"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon
                        className={`w-5 h-5 ${isActive ? "text-primary" : "text-slate-500 group-hover:text-primary"}`}
                      />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {item.count > 0 && (
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            isActive ? "bg-primary text-white" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          isActive ? "text-primary rotate-90" : "text-slate-400 group-hover:translate-x-1"
                        }`}
                      />
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Settings & Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <nav className="space-y-1">
              <Link
                href="/settings"
                className="flex items-center space-x-3 px-3 py-2.5 text-slate-700 hover:bg-slate-50 hover:text-primary rounded-lg transition-colors group"
              >
                <Settings className="w-5 h-5 text-slate-500 group-hover:text-primary" />
                <span className="font-medium">Settings & Privacy</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform ml-auto" />
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </nav>
          </div>
        </div>
      </aside>
    );
  }

  // Unauthenticated user sidebar
  return (
    <aside className="hidden lg:block w-80">
      <div className="space-y-6">
        {/* Welcome Card */}
        <div className="bg-white bg-gradient-to-br from-(--primary-light)/20 via-(--primary-light)/10 to-transparent rounded-xl border border-(--primary-light)/40 p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-(--primary-light)/30 rounded-full -translate-y-10 translate-x-10"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-(--primary-light)/20 rounded-full translate-y-8 -translate-x-8"></div>

          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-3">
              <img src="/favicon/logo.png" alt="Muslifie Logo" className="w-8 h-8" />
              <h3 className="font-bold text-xl text-slate-900">Welcome to Muslifie</h3>
            </div>
            <p className="text-slate-600 mb-6 leading-relaxed">
              Join our vibrant community to share your travel experiences, discover hidden gems, and connect with fellow
              explorers.
            </p>

            <div className="flex flex-col space-y-3">
              <Link href="/signup">
                <button className="w-full bg-secondary text-white py-3 px-4 rounded-lg font-semibold hover:bg-secondary/90 transition-all duration-200 flex items-center justify-center space-x-2 group shadow-lg shadow-secondary/25">
                  <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Join Community</span>
                </button>
              </Link>
              <Link href="/login">
                <button className="w-full bg-white text-slate-700 py-3 px-4 rounded-lg font-medium hover:bg-(--secondary-light)/50 transition-colors flex items-center justify-center space-x-2 border border-slate-200">
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Community Stats */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
            <Globe className="w-5 h-5 mr-2 text-primary" />
            Community Pulse
          </h4>
          <div className="space-y-3">
            {communityStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{stat.label}</span>
                  </div>
                  <span className="font-bold text-primary">{stat.value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Explore */}
        {/* <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-primary" />
            Explore Without Account
          </h4>
          <nav className="space-y-1">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center space-x-3 px-3 py-2.5 text-slate-700 hover:bg-slate-50 hover:text-primary rounded-lg transition-all duration-200 group"
                >
                  <Icon className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
                  <span className="font-medium">{action.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform ml-auto" />
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 text-center">
              <Link href="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>{" "}
              for personalized content and more features
            </p>
          </div>
        </div> */}

        {/* Featured Content Teaser */}
        <Link href="https://muslifie.com/blog/discovering-italy-the-halal-way" target="_blank">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6 shadow-sm">
            <div className="flex items-center space-x-2 mb-3">
              <Award className="w-5 h-5 text-amber-600" />
              <h4 className="font-semibold text-amber-900">Featured This Week</h4>
            </div>
            <p className="text-amber-800 text-sm mb-2 font-bold">Discovering Italy the Halal Way</p>
            <p className="text-amber-800 text-sm mb-3">
              Italy is one of the finest tourist destinations in Europe which is like a dream come true. It offers one
              of the world’s most historic architectural masterpieces, beautiful beaches, and breathtaking mountains
              views.
            </p>
            <button className="text-amber-700 hover:text-amber-800 font-medium text-sm flex items-center space-x-1 group">
              <span>Read Article</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </Link>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6 shadow-sm mt-6">
          <div className="flex items-center space-x-2 mb-3">
            <Download className="w-5 h-5 text-amber-600" />
            <h4 className="font-semibold text-amber-900">Download Muslifie App</h4>
          </div>
          <div className="mt-4 flex flex-col space-y-4 max-w-sm items-center justify-center">
            <img
              src="/stores/app-store.svg"
              width={120}
              height={120}
              alt="muslifie-logo"
              className="inline w-full h-12"
            />
            <img
              src="/stores/google-play.svg"
              width={120}
              height={120}
              alt="muslifie-logo"
              className="inline w-full h-12"
            />
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
