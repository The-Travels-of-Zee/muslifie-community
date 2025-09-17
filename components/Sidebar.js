"use client";
import { useEffect, useState } from "react";
import {
  Bookmark,
  FileText,
  Settings,
  LogOut,
  Users,
  MessageCircle,
  Heart,
  MapPin,
  LogIn,
  UserPlus,
  Globe,
  Download,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { getUserSavedPostsCount } from "@/lib/actions/postActions";

const Sidebar = () => {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const [activeLink, setActiveLink] = useState("");
  const [numberOfSavedPosts, setNumberOfSavedPosts] = useState(0);

  const loadSavedPostsCount = async () => {
    if (!user?.id) return;

    try {
      const result = await getUserSavedPostsCount(user.id);

      if (result.error) {
        console.error("Error loading saved posts count:", result.error);
      } else {
        setNumberOfSavedPosts(result.count);
      }
    } catch (error) {
      console.error("Error in loadSavedPostsCount:", error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadSavedPostsCount();
    }
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navItems = [
    { icon: FileText, label: "My Posts", href: "/my-posts", count: user?.postsCount || 0 },
    { icon: Bookmark, label: "Saved Posts", href: "/saved-posts", count: numberOfSavedPosts || 0 },
    { icon: Heart, label: "Liked Posts", href: "/liked-posts", count: user?.likesCount || 0 },
    { icon: MessageCircle, label: "My Comments", href: "/my-comments", count: user?.commentsCount || 0 },
  ];

  const communityStats = [
    { label: "Active Members", value: "5.5K", icon: Users },
    { label: "Posts Today", value: "100+", icon: FileText },
    { label: "Places Shared", value: "1.2K", icon: MapPin },
  ];

  if (isLoading) {
    return (
      <aside className="hidden lg:flex lg:flex-col w-80 flex-shrink-0 space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-pulse">
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
      </aside>
    );
  }

  // Authenticated
  if (isAuthenticated && user) {
    return (
      <aside className="hidden lg:flex lg:flex-col w-80 flex-shrink-0 space-y-6">
        {/* Profile */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center relative">
              {user?.profileImage ? (
                <img src={user.profileImage} alt="user" className="w-14 h-14 rounded-full object-cover" />
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
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 truncate">{user?.fullName || "User"}</h3>
              <p className="text-sm text-slate-600 w-42 truncate">{user?.email}</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeLink === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setActiveLink(item.href)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group ${
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
                  {item.count > 0 && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        isActive ? "bg-primary text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Settings + Logout */}
          <div className="mt-4 space-y-2">
            <Link
              href="/settings"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              <Settings className="w-5 h-5 text-slate-500" />
              <span>Settings & Privacy</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* App Download */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-3">
            <Download className="w-5 h-5 text-amber-600" />
            <h4 className="font-semibold text-amber-900">Download Muslifie App</h4>
          </div>
          <div className="flex flex-col space-y-4 items-center">
            <Link href="https://apps.apple.com/pk/app/muslifie/id6749224199" target="_blank">
              <img src="/stores/app-store.svg" alt="App Store" className="rounded-sm h-12 w-44 object-cover" />
            </Link>
            <Link
              href="https://play.google.com/store/apps/details?id=com.app.muslifie&pcampaignid=web_share"
              target="_blank"
            >
              <img src="/stores/google-play.svg" alt="Google Play" className="rounded-sm h-12 w-44 object-cover" />
            </Link>
          </div>
        </div>
      </aside>
    );
  }

  // Unauthenticated
  return (
    <aside className="hidden lg:flex lg:flex-col w-80 flex-shrink-0 space-y-6">
      {/* Welcome */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center space-x-2 mb-3">
          <img src="/favicon/logo.png" alt="Muslifie Logo" className="w-8 h-8" />
          <h3 className="font-bold text-xl text-slate-900">Welcome to Muslifie</h3>
        </div>
        <p className="text-slate-600 mb-6">
          Join our vibrant community to share your travel experiences, discover hidden gems, and connect with fellow
          explorers.
        </p>
        <div className="flex flex-col space-y-2">
          <Link href="/signup">
            <button className="w-full bg-secondary text-white py-3 px-4 rounded-lg font-semibold hover:bg-secondary/90">
              <UserPlus className="w-5 h-5 inline mr-2" />
              Join Community
            </button>
          </Link>
          <Link href="/login">
            <button className="w-full bg-white border border-slate-200 text-slate-700 py-3 px-4 rounded-lg font-medium hover:bg-slate-50">
              <LogIn className="w-5 h-5 inline mr-2" />
              Sign In
            </button>
          </Link>
        </div>
      </div>

      {/* Community Stats */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2 text-primary" />
          Community Pulse
        </h4>
        <div className="space-y-3">
          {communityStats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
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
    </aside>
  );
};

export default Sidebar;
