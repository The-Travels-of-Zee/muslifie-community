"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { usePathname, useRouter } from "next/navigation";

const PUBLIC_ROUTES = new Set(["/", "/search", "/reset-password", "/otp-confirm"]);
const AUTH_ROUTES = new Set(["/login", "/signup"]);

// Routes that match patterns (like /post/[id])
const isPublicPatternRoute = (path) => {
  return /^\/post\/[^/]+/.test(path); // Matches /post/:id
};

export function AuthProvider({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { checkAuthStatus, user, isLoading } = useAuthStore();
  const [authResolved, setAuthResolved] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // ✅ Run auth check on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // ✅ Handle auth resolution with fallback timer
  useEffect(() => {
    if (!isLoading && initialLoad) {
      setAuthResolved(true);
      setInitialLoad(false);
      return;
    }

    // Fallback timer only for initial load
    if (initialLoad) {
      const timeout = setTimeout(() => {
        setAuthResolved(true);
        setInitialLoad(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }

    // For subsequent loads, resolve immediately when loading stops
    if (!isLoading && !initialLoad) {
      setAuthResolved(true);
    }
  }, [isLoading, initialLoad]);

  // ✅ Determine if a route is protected
  const isProtectedRoute = (path) => {
    // Check if it's a public route
    if (PUBLIC_ROUTES.has(path) || isPublicPatternRoute(path)) {
      return false;
    }

    // Check if it's an auth route
    if (AUTH_ROUTES.has(path)) {
      return false;
    }

    // Everything else is protected
    return true;
  };

  // ✅ Redirect logic - only runs after auth is resolved
  useEffect(() => {
    if (!authResolved) return;

    const isAuthPage = AUTH_ROUTES.has(pathname);
    const isProtected = isProtectedRoute(pathname);

    // Case 1: User is not logged in
    if (!user) {
      // If on a protected route, redirect to login
      if (isProtected) {
        router.replace("/login");
      }
      // If on auth pages or public routes, allow access
      return;
    }

    // Case 2: User is logged in
    if (user) {
      // If user is verified and on auth pages, redirect to home
      if (isAuthPage) {
        router.replace("/");
        return;
      }

      // For all other cases, allow access
    }
  }, [user, authResolved, pathname, router]);

  // ✅ Show loading screen while auth resolves
  if (!authResolved) {
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
