"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Helper function to set auth cookies
async function setAuthCookie(token, userData) {
  const cookieStore = await cookies();

  // Set HTTP-only cookie for token
  cookieStore.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  // Set user data cookie (not HTTP-only so client can read it)
  cookieStore.set("user-data", JSON.stringify(userData), {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

// Clear auth cookies
async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete("auth-token");
  cookieStore.delete("user-data");
}

// Sign up with email
export async function signUpUserWithEmail(email, password, { name }) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/signup/traveler`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName: name,
        email,
        password,
      }),
    });

    const data = await response.json();
    console.log(data);

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to sign up",
      };
    }

    // Check if email verification is required
    // if (data.requiresEmailVerification || !data.user?.emailVerified) {
    //   return {
    //     success: true,
    //     requiresEmailVerification: true,
    //     message: "Please verify your email address first",
    //     user: data.user,
    //     token: data.token,
    //   };
    // }

    if (data.user?.verificationStatus !== "not_required") {
      return {
        success: true,
        requiresEmailVerification: true,
        message: "Please verify your email address",
        user: data.user,
        token: data.token,
      };
    }

    // If token is provided, set cookies
    if (data.token) {
      await setAuthCookie(data.token, data.user);
    }

    return {
      success: true,
      user: data.user,
      token: data.token,
    };
  } catch (error) {
    console.error("Sign up error:", error);
    return {
      success: false,
      error: "Network error. Please try again.",
    };
  }
}

// Sign in with email and password
export async function signInWithEmail(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Invalid email or password",
      };
    }

    // Check if email verification is required
    // if (data.requiresEmailVerification || !data.user?.emailVerified) {
    //   return {
    //     success: true,
    //     requiresEmailVerification: true,
    //     message: "Please verify your email address first",
    //     user: data.user,
    //     token: data.token,
    //   };
    // }

    if (data.user?.verificationStatus !== "not_required") {
      return {
        success: true,
        requiresEmailVerification: true,
        message: "Please verify your email address first",
        user: data.user,
        token: data.token,
      };
    }

    // Set auth cookies
    if (data.token) {
      await setAuthCookie(data.token, data.user);
    }

    return {
      success: true,
      user: data.user,
      token: data.token,
    };
  } catch (error) {
    console.error("Sign in error:", error);
    return {
      success: false,
      error: "Network error. Please try again.",
    };
  }
}

// Verify email with OTP
export async function confirmEmailOTP(email, otp, accessToken) {
  console.log("Confirming email OTP:", { email, otp, accessToken });

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: accessToken,
        otp,
        email,
      }),
    });

    const data = await response.json();
    console.log(data);

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Invalid verification code",
      };
    }

    // If token is provided after verification, set cookies
    if (data.token) {
      await setAuthCookie(data.token, data.user);
    }

    return {
      success: true,
      user: data.user,
      token: data.token,
      message: "Email verified successfully",
    };
  } catch (error) {
    console.error("Email verification error:", error);
    return {
      success: false,
      error: "Network error. Please try again.",
    };
  }
}

// Resend email verification
export async function resendEmailOTP(email, accessToken) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/resend-email-verification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: accessToken, email }),
    });

    const data = await response.json();

    console.log(data);

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to resend verification code",
      };
    }

    return {
      success: true,
      message: "Verification code sent successfully",
    };
  } catch (error) {
    console.error("Resend verification error:", error);
    return {
      success: false,
      error: "Network error. Please try again.",
    };
  }
}

// Send password reset email
export async function sendPasswordResetEmail(email) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/send-password-reset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to send password reset email",
      };
    }

    return {
      success: true,
      message: "Password reset email sent successfully",
    };
  } catch (error) {
    console.error("Password reset error:", error);
    return {
      success: false,
      error: "Network error. Please try again.",
    };
  }
}

// Reset password with otp
export async function resetPassword(email, otp, newPassword) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        otp,
        newPassword,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to reset password",
      };
    }

    return {
      success: true,
      message: "Password reset successfully",
    };
  } catch (error) {
    console.error("Password reset error:", error);
    return {
      success: false,
      error: "Network error. Please try again.",
    };
  }
}

// Get current user status
export async function getUserStatus() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return {
        success: false,
        error: "No authentication token found",
      };
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // If unauthorized, clear cookies
      if (response.status === 401) {
        await clearAuthCookies();
      }
      return {
        success: false,
        error: data.message || "Failed to get user status",
      };
    }

    // Update user data cookie
    if (data.user) {
      const cookieStore = await cookies();
      cookieStore.set("user-data", JSON.stringify(data.user), {
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });
    }

    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    console.error("Get user status error:", error);
    return {
      success: false,
      error: "Network error. Please try again.",
    };
  }
}

// Sign out
export async function signOut() {
  try {
    await clearAuthCookies();
    return { success: true };
  } catch (error) {
    console.error("Sign out error:", error);
    return { success: false };
  }
}

// Complete user login (helper function to finalize login process)
export async function completeUserLogin(user) {
  try {
    // This function can be used to perform any additional setup after login
    // For now, we just ensure cookies are set properly

    // You might want to fetch user status to get the token
    const statusResponse = await getUserStatus();

    if (!statusResponse.success) {
      // If we can't get status, user might need to log in again
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error("Complete login error:", error);
    return { success: false };
  }
}

// Google Sign In (placeholder - needs OAuth implementation)
export async function signInWithGoogle() {
  // This would require OAuth implementation with Google
  // For now, returning a placeholder response
  return {
    success: false,
    error: "Google Sign In not available. Please use email/password.",
  };
}
