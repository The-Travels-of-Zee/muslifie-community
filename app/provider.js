"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { usePathname, useRouter } from "next/navigation";

const AUTH_ROUTES = new Set(["/login", "/signup", "/otp-confirm"]);

export function AuthProvider({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { checkAuthStatus, user, isLoading } = useAuthStore();
  const [authResolved, setAuthResolved] = useState(false);

  // ✅ Run auth check on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // ✅ Timer fallback to resolve auth after 2 seconds max
  useEffect(() => {
    if (!isLoading) {
      setAuthResolved(true);
      return;
    }

    const timeout = setTimeout(() => setAuthResolved(true), 2000);
    return () => clearTimeout(timeout);
  }, [isLoading]);

  // ✅ Determine if a route is protected
  const isProtectedRoute = (path) => {
    // Public routes: /, /post/:id, /search
    if (path === "/" || /^\/post\/[^/]+/.test(path) || path.startsWith("/search")) {
      return false;
    }
    return true;
  };

  // ✅ Redirect logic
  useEffect(() => {
    if (!authResolved) return;

    const isAuthPage = AUTH_ROUTES.has(pathname);

    if (!user) {
      // Not logged in → redirect only from protected routes
      if (isProtectedRoute(pathname)) {
        router.replace("/login");
      }
      return;
    }

    // Logged-in user → block auth pages
    if (user && isAuthPage) {
      if (!user.emailVerified && pathname !== "/otp-confirm") return;
      router.replace("/"); // redirect to home
    }
  }, [user, authResolved, pathname, router]);

  // ✅ Loader until auth state resolves
  if (!authResolved || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="text-center">
          <img src="/favicon/logo.png" className="mx-auto mb-4" height={64} width={64} alt="Muslifie logo" />
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Muslifie Community</h1>
          <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
