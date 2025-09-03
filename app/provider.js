"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { usePathname, useRouter } from "next/navigation";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/otp-confirm",
  "/reset-password",
  "/post/[slug]",
  "/contact-us",
  "/privacy-policy",
  "/terms-and-conditions",
];
const AUTH_ROUTES = ["/login", "/signup", "/otp-confirm"];

export function AuthProvider({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { checkAuthStatus, isAuthenticated, isLoading, user } = useAuthStore();

  useEffect(() => {
    // Check auth status on mount
    checkAuthStatus();
  }, []);

  useEffect(() => {
    // Handle route protection
    if (!isLoading) {
      // public if explicitly in PUBLIC_ROUTES or matches `/post/*`
      const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || pathname.startsWith("/post/");
      const isAuthRoute = AUTH_ROUTES.includes(pathname);

      if (!isAuthenticated && !isPublicRoute) {
        // Redirect to login if trying to access protected route
        router.push("/login");
      } else if (isAuthenticated && isAuthRoute) {
        // Redirect to dashboard if already authenticated and trying to access auth routes
        if (user && !user.emailVerified && pathname !== "/otp-confirm") {
          // Allow access to OTP confirmation page
          return;
        }
        router.push("/");
      }
    }
  }, [isAuthenticated, isLoading, pathname, router, user]);

  // Show loading state while checking auth
  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
