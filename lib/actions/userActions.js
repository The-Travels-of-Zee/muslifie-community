"use server";

import { adminDb } from "@/lib/firebase/admin";

// Follow a user
// Follow a user (updated to include notification)
export async function followUser(targetUserId, currentUserId) {
  try {
    if (!targetUserId || !currentUserId) {
      return { success: false, error: "User IDs are required" };
    }

    if (targetUserId === currentUserId) {
      return { success: false, error: "Cannot follow yourself" };
    }

    const currentUserRef = adminDb.collection("users").doc(currentUserId);
    const targetUserRef = adminDb.collection("users").doc(targetUserId);

    // Check if users exist and get current user's name
    const [currentUserDoc, targetUserDoc] = await Promise.all([currentUserRef.get(), targetUserRef.get()]);

    if (!currentUserDoc.exists || !targetUserDoc.exists) {
      return { success: false, error: "User not found" };
    }

    // Check if already following
    const followDoc = await targetUserRef.collection("followers").doc(currentUserId).get();

    if (followDoc.exists) {
      return { success: false, error: "Already following this user" };
    }

    // Add follower to target user's followers subcollection
    await targetUserRef.collection("followers").doc(currentUserId).set({
      userRef: currentUserRef,
      createdAt: new Date(),
    });

    // Add following to current user's following subcollection
    await currentUserRef.collection("following").doc(targetUserId).set({
      userRef: targetUserRef,
      createdAt: new Date(),
    });

    // Create follow notification (import createFollowNotification from notificationActions)
    const currentUserData = currentUserDoc.data();
    const { createFollowNotification } = await import("@/lib/actions/notificationActions");
    console.log(currentUserData);

    await createFollowNotification({
      followerId: currentUserId,
      profileImage: currentUserData.profileImage,
      targetUserId: targetUserId,
      followerName: currentUserData.fullName || "Someone",
    });

    return { success: true };
  } catch (error) {
    console.error("Error following user:", error);
    return { success: false, error: "Failed to follow user" };
  }
}

// Unfollow a user
export async function unfollowUser(targetUserId, currentUserId) {
  try {
    if (!targetUserId || !currentUserId) {
      return { success: false, error: "User IDs are required" };
    }

    const currentUserRef = adminDb.collection("users").doc(currentUserId);
    const targetUserRef = adminDb.collection("users").doc(targetUserId);

    // Remove follower from target user's followers subcollection
    await targetUserRef.collection("followers").doc(currentUserId).delete();

    // Remove following from current user's following subcollection
    await currentUserRef.collection("following").doc(targetUserId).delete();

    return { success: true };
  } catch (error) {
    console.error("Error unfollowing user:", error);
    return { success: false, error: "Failed to unfollow user" };
  }
}

// Check if current user is following target user
export async function checkUserFollowing(targetUserId, currentUserId) {
  try {
    if (!targetUserId || !currentUserId) {
      return { isFollowing: false };
    }

    if (targetUserId === currentUserId) {
      return { isFollowing: false };
    }

    const followDoc = await adminDb
      .collection("users")
      .doc(targetUserId)
      .collection("followers")
      .doc(currentUserId)
      .get();

    return { isFollowing: followDoc.exists };
  } catch (error) {
    console.error("Error checking follow status:", error);
    return { isFollowing: false };
  }
}

// Report a user
export async function toggleReportUser(targetUserId, currentUserId, reason = "inappropriate_behavior") {
  try {
    if (!targetUserId || !currentUserId) {
      return { success: false, error: "User IDs are required" };
    }

    if (targetUserId === currentUserId) {
      return { success: false, error: "Cannot report yourself" };
    }

    const targetUserRef = adminDb.collection("users").doc(targetUserId);
    const currentUserRef = adminDb.collection("users").doc(currentUserId);

    // Check if target user exists
    const targetUserDoc = await targetUserRef.get();
    if (!targetUserDoc.exists) {
      return { success: false, error: "User not found" };
    }

    // Check if already reported
    const existingReport = await adminDb
      .collection("reported-users")
      .where("reportedUserRef", "==", targetUserRef)
      .where("reportedByRef", "==", currentUserRef)
      .get();

    if (!existingReport.empty) {
      // ✅ If report exists → remove it (Un-report)
      const batch = adminDb.batch();
      existingReport.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      return { success: true, action: "unreported" };
    }

    // ✅ Otherwise → create new report
    await adminDb.collection("reported-users").add({
      reportedUserRef: targetUserRef,
      reportedByRef: currentUserRef,
      reason,
      createdAt: new Date(),
      status: "pending",
    });

    return { success: true, action: "reported" };
  } catch (error) {
    console.error("Error toggling report:", error);
    return { success: false, error: "Failed to toggle report" };
  }
}

// ✅ Check if current user already reported target user
export async function checkIfUserReported(targetUserId, currentUserId) {
  try {
    if (!targetUserId || !currentUserId) {
      return false;
    }

    const targetUserRef = adminDb.collection("users").doc(targetUserId);
    const currentUserRef = adminDb.collection("users").doc(currentUserId);

    const reportSnap = await adminDb
      .collection("reported-users")
      .where("reportedUserRef", "==", targetUserRef)
      .where("reportedByRef", "==", currentUserRef)
      .get();

    return !reportSnap.empty; // ✅ true if already reported
  } catch (error) {
    console.error("Error checking report status:", error);
    return false;
  }
}

// Get followers list with user details
export async function getFollowers(userId) {
  try {
    if (!userId) {
      return { success: false, error: "User ID is required" };
    }

    const followersSnapshot = await adminDb
      .collection("users")
      .doc(userId)
      .collection("followers")
      .orderBy("createdAt", "desc")
      .get();

    const followers = [];

    for (const doc of followersSnapshot.docs) {
      const followerData = doc.data();
      if (followerData.userRef) {
        const userDoc = await followerData.userRef.get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          followers.push({
            id: userDoc.id,
            fullName: userData.fullName || "Unknown User",
            profileImage: userData.profileImage || null,
            bio: userData.bio || "",
            followedAt: followerData.createdAt?.toDate?.().toISOString?.() || null,
          });
        }
      }
    }

    return { success: true, followers };
  } catch (error) {
    console.error("Error getting followers:", error);
    return { success: false, error: "Failed to fetch followers" };
  }
}

// Get following list with user details
export async function getFollowing(userId) {
  try {
    if (!userId) {
      return { success: false, error: "User ID is required" };
    }

    const followingSnapshot = await adminDb
      .collection("users")
      .doc(userId)
      .collection("following")
      .orderBy("createdAt", "desc")
      .get();

    const following = [];

    for (const doc of followingSnapshot.docs) {
      const followingData = doc.data();
      if (followingData.userRef) {
        const userDoc = await followingData.userRef.get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          following.push({
            id: userDoc.id,
            fullName: userData.fullName || "Unknown User",
            profileImage: userData.profileImage || null,
            bio: userData.bio || "",
            followedAt: followingData.createdAt?.toDate?.().toISOString?.() || null,
          });
        }
      }
    }

    return { success: true, following };
  } catch (error) {
    console.error("Error getting following:", error);
    return { success: false, error: "Failed to fetch following" };
  }
}

// Remove a follower (only owner can remove their followers)
export async function removeFollower(ownUserId, followerUserId) {
  try {
    if (!ownUserId || !followerUserId) {
      return { success: false, error: "User IDs are required" };
    }

    if (ownUserId === followerUserId) {
      return { success: false, error: "Cannot remove yourself" };
    }

    const ownUserRef = adminDb.collection("users").doc(ownUserId);
    const followerUserRef = adminDb.collection("users").doc(followerUserId);

    // Remove follower from owner's followers subcollection
    await ownUserRef.collection("followers").doc(followerUserId).delete();

    // Remove owner from follower's following subcollection
    await followerUserRef.collection("following").doc(ownUserId).delete();

    return { success: true };
  } catch (error) {
    console.error("Error removing follower:", error);
    return { success: false, error: "Failed to remove follower" };
  }
}

// Get followers count for a user
export async function getFollowersCount(userId) {
  try {
    if (!userId) return { count: 0 };

    const followersSnapshot = await adminDb.collection("users").doc(userId).collection("followers").get();

    return { count: followersSnapshot.size };
  } catch (error) {
    console.error("Error getting followers count:", error);
    return { count: 0 };
  }
}

// Get following count for a user
export async function getFollowingCount(userId) {
  try {
    if (!userId) return { count: 0 };

    const followingSnapshot = await adminDb.collection("users").doc(userId).collection("following").get();

    return { count: followingSnapshot.size };
  } catch (error) {
    console.error("Error getting following count:", error);
    return { count: 0 };
  }
}

// ✅ Get a single user by ID with error handling
export async function getUser(userId) {
  try {
    if (!userId) {
      return {
        success: false,
        error: "User ID is required",
      };
    }

    const doc = await adminDb.collection("users").doc(userId).get();

    if (!doc.exists) {
      return {
        success: false,
        error: "User not found",
      };
    }

    const userData = doc.data();

    return {
      success: true,
      user: {
        id: doc.id,
        fullName: userData.fullName || "Unknown User",
        profileImage: userData.profileImage || null,
        bio: userData.bio || "",
        createdAt: userData.createdAt?.toDate?.().toISOString?.() || null,
        updatedAt: userData.updatedAt?.toDate?.().toISOString?.() || null,
      },
    };
  } catch (error) {
    console.error("Error getting user:", error);
    return {
      success: false,
      error: "Failed to fetch user",
    };
  }
}
