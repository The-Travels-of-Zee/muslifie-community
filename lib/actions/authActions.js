"use server";

import { cookies } from "next/headers";
import { adminDb } from "@/lib/firebase/admin";
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

// Helper function to save/update user in Firestore
async function saveUserToFirestore(user) {
  try {
    const userRef = adminDb.collection("users").doc(user.id);
    const snapshot = await userRef.get();

    if (!snapshot.exists) {
      await userRef.set({
        ...user,
        updatedAt: new Date().toISOString(),
      });
      console.log("New user created in Firestore:", user);
    } else {
      const existingData = snapshot.data();
      const updateData = {};

      if (user.profileImage !== undefined && user.profileImage !== existingData.profileImage) {
        updateData.profileImage = user.profileImage;
      }
      if (user.fullName !== undefined && user.fullName !== existingData.fullName) {
        updateData.fullName = user.fullName;
      }
      if (user.email !== undefined && user.email !== existingData.email) {
        updateData.email = user.email;
      }
      if (user.phone !== undefined && user.phone !== existingData.phone) {
        updateData.phone = user.phone;
      }
      if (user.bio !== undefined && user.bio !== existingData.bio) {
        updateData.bio = user.bio;
      }
      if (user.city !== undefined && user.city !== existingData.city) {
        updateData.city = user.city;
      }

      if (Object.keys(updateData).length > 0) {
        updateData.updatedAt = new Date().toISOString();
        await userRef.update(updateData);
        console.log("User updated in Firestore:", updateData);
      } else {
        console.log("No changes detected, skipping Firestore update.");
      }
    }
  } catch (err) {
    console.error("Firestore save/update error:", err);
    throw new Error("Failed to sync user data with Firestore");
  }
}

// Sign up with email
export async function signUpUserWithEmail(email, password, { name }) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/signup/traveler`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: name,
        email,
        password,
      }),
    });

    const data = await response.json();
    // console.log(data);

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to sign up",
      };
    }

    // if (data.user?.verificationStatus !== "not_required") {
    if (data.requiresEmailVerification) {
      return {
        success: true,
        requiresEmailVerification: true,
        message: "Please verify your email address",
        user: data.user,
        token: data.token,
      };
    }

    if (data.token) {
      await setAuthCookie(data.token, data.user);
    }

    // ✅ Save to Firestore
    if (data.user) {
      await saveUserToFirestore(data.user);
    }

    return {
      success: true,
      user: data.user,
      token: data.token,
    };
  } catch (error) {
    console.error("Sign up error:", error);
    return { success: false, error: "Network error. Please try again." };
  }
}

// Sign in with email and password
export async function signInWithEmail(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Invalid email or password",
      };
    }

    // if (data.user?.verificationStatus !== "not_required") {
    if (data.requiresEmailVerification) {
      return {
        success: true,
        requiresEmailVerification: true,
        message: "Please verify your email address first",
        user: data.user,
        token: data.token,
      };
    }

    if (data.token) {
      await setAuthCookie(data.token, data.user);
    }

    // ✅ Ensure user exists in Firestore
    if (data.user) {
      await saveUserToFirestore(data.user);
    }

    return {
      success: true,
      user: data.user,
      token: data.token,
    };
  } catch (error) {
    console.error("Sign in error:", error);
    return { success: false, error: "Network error. Please try again." };
  }
}

// Verify email with OTP
export async function confirmEmailOTP(otp, accessToken) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`, // ✅ Required
      },
      body: JSON.stringify({ otp }),
    });

    const data = await response.json();
    console.log(data);

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Invalid verification code",
      };
    }

    //set cookies
    await setAuthCookie(accessToken, data.user);

    // ✅ Ensure user exists in Firestore
    if (data.user) {
      await saveUserToFirestore(data.user);
    }

    return {
      success: true,
      user: data.user,
      token: accessToken,
      message: data.message || "Email verified successfully",
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
export async function resendEmailOTP(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/resend-email-verification`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: "Server did not return valid JSON",
        raw: text,
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to resend verification code",
      };
    }

    return {
      success: true,
      message: data.message || "Verification code sent successfully",
    };
  } catch (error) {
    console.error("Resend verification error:", error);
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
    // console.log(token);

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

// Google Sign In (placeholder - needs OAuth implementation)
export async function signInWithGoogle() {
  // This would require OAuth implementation with Google
  // For now, returning a placeholder response
  return {
    success: false,
    error: "Google Sign In not available. Please use email/password.",
  };
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

// User Updating Actions

// Server action to handle ONLY profile image upload
export async function uploadProfileImage(formData) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth-token")?.value;

    if (!authToken) {
      return { success: false, error: "Authentication required" };
    }

    const imageFile = formData.get("image");
    if (!imageFile || imageFile.size === 0) {
      return { success: false, error: "No image file provided" };
    }

    // Validate size/type
    if (imageFile.size > 5 * 1024 * 1024) {
      return { success: false, error: "Image size must be less than 5MB" };
    }
    if (!imageFile.type.startsWith("image/")) {
      return { success: false, error: "Invalid file type. Must be an image." };
    }

    // Convert to Base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const body = {
      fileData: base64Data,
      fileName: imageFile.name,
      mimeType: imageFile.type,
      documentType: "profile_image",
    };

    // Call your API
    const response = await fetch(`${API_BASE_URL}/api/auth/profile/image`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.message || "Failed to update profile image" };
    }

    // Sync Firestore
    if (data.user) {
      try {
        await saveUserToFirestore({
          id: data.user.id || data.user._id,
          profileImage: data.user.profileImage,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error("Firestore sync failed (image):", err);
      }
    }

    return {
      success: true,
      message: "Profile image updated successfully!",
      user: data.user,
    };
  } catch (error) {
    console.error("Image upload error:", error);
    return { success: false, error: error.message || "Failed to upload image" };
  }
}

// Server action to update user profile (text fields only)
export async function updateUserProfile(formData) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth-token")?.value;

    if (!authToken) {
      return { success: false, error: "Authentication required" };
    }

    // Extract fields
    const fullName = formData.get("fullName");
    const phone = formData.get("phone");
    const bio = formData.get("bio");
    const city = formData.get("city");

    const requestBody = { fullName, phone, bio, city };

    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.message || "Failed to update profile" };
    }

    // Sync Firestore
    if (data.user) {
      try {
        await saveUserToFirestore({
          id: data.user.id || data.user._id,
          fullName: data.user.fullName,
          email: data.user.email,
          phone: data.user.phone,
          bio: data.user.bio,
          city: data.user.city,
          profileImage: data.user.profileImage,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error("Firestore sync failed (profile):", err);
      }
    }

    return {
      success: true,
      message: "Profile updated successfully!",
      user: data.user,
    };
  } catch (error) {
    console.error("Update profile error:", error);
    return { success: false, error: "Network error. Please try again." };
  }
}

// Server action to delete user account
export async function deleteUserAccount(userId) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth-token")?.value;

    if (!authToken) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    // 1️⃣ Call your backend API to delete user from your auth service
    const response = await fetch(`${API_BASE_URL}/api/auth/account`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      return {
        success: false,
        error: data.message || "Failed to delete account",
      };
    }

    // 2️⃣ Delete user document from Firestore
    const userRef = adminDb.collection("users").doc(userId);
    await userRef.delete();

    // 3️⃣ Delete all posts created by this user (via reference)
    const postsSnapshot = await adminDb
      .collection("posts")
      .where("userRef", "==", userRef) // 👈 use the reference, not string
      .get();

    const batch = adminDb.batch();
    postsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    if (!postsSnapshot.empty) {
      await batch.commit();
    }

    // 4️⃣ Clear auth cookie
    cookieStore.delete("auth-token");

    // 5️⃣ Redirect to login page
    return { success: true };
  } catch (error) {
    console.error("Delete account error:", error);
    return {
      success: false,
      error: "Network error. Please try again.",
    };
  }
}
