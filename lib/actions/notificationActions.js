"use server";

import { adminDb } from "@/lib/firebase/admin";
import { revalidatePath } from "next/cache";

// Create notification when someone comments on a post
export async function createCommentNotification(commentData) {
  try {
    const { postId, profileImage, commenterId, postOwnerId, commenterName, postTitle } = commentData;

    // Don't create notification if user comments on their own post
    if (commenterId === postOwnerId) {
      return { success: true, message: "No notification needed for own comment" };
    }

    const notificationData = {
      type: "comment",
      recipientId: postOwnerId,
      profileImage,
      senderId: commenterId,
      senderName: commenterName,
      postId: postId,
      postTitle: postTitle || "your post",
      message: `${commenterName} commented on your post`,
      isRead: false,
      createdAt: new Date(),
    };

    await adminDb.collection("notifications").add(notificationData);
    revalidatePath("/notifications");

    console.log("Comment notification created successfully");
    return { success: true };
  } catch (error) {
    console.error("Error creating comment notification:", error);
    return { success: false, error: error.message };
  }
}

// Create notification when someone replies to a comment
export async function createReplyNotification(replyData) {
  try {
    const { postId, profileImage, commentId, replierId, commentOwnerId, replierName, commentContent } = replyData;

    // Don't create notification if user replies to their own comment
    if (replierId === commentOwnerId) {
      return { success: true, message: "No notification needed for own reply" };
    }

    const notificationData = {
      type: "reply",
      recipientId: commentOwnerId,
      profileImage,
      senderId: replierId,
      senderName: replierName,
      postId: postId,
      commentId: commentId,
      commentContent: commentContent || "your comment",
      message: `${replierName} replied to your comment`,
      isRead: false,
      createdAt: new Date(),
    };

    await adminDb.collection("notifications").add(notificationData);
    revalidatePath("/notifications");

    console.log("Reply notification created successfully");
    return { success: true };
  } catch (error) {
    console.error("Error creating reply notification:", error);
    return { success: false, error: error.message };
  }
}

// Create notification when someone follows you
export async function createFollowNotification(followData) {
  try {
    const { followerId, profileImage, targetUserId, followerName } = followData;

    // Don't create notification if user follows themselves (shouldn't happen but safety check)
    if (followerId === targetUserId) {
      return { success: true, message: "No notification needed for self-follow" };
    }

    const notificationData = {
      type: "follow",
      recipientId: targetUserId,
      senderId: followerId,
      profileImage,
      senderName: followerName,
      message: `${followerName} started following you`,
      isRead: false,
      createdAt: new Date(),
    };

    await adminDb.collection("notifications").add(notificationData);

    console.log("Follow notification created successfully");
    return { success: true };
  } catch (error) {
    console.error("Error creating follow notification:", error);
    return { success: false, error: error.message };
  }
}

// Create notification when someone likes your post
export async function createLikeNotification(likeData) {
  try {
    const { postId, likerId, postOwnerId, likerName, postTitle, profileImage } = likeData;

    // Don't create notification if user likes their own post
    if (likerId === postOwnerId) {
      return { success: true, message: "No notification needed for own like" };
    }

    const notificationData = {
      type: "like",
      recipientId: postOwnerId,
      profileImage,
      senderId: likerId,
      senderName: likerName,
      postId: postId,
      postTitle: postTitle || "your post",
      message: `${likerName} liked your post`,
      isRead: false,
      createdAt: new Date(),
    };

    await adminDb.collection("notifications").add(notificationData);
    revalidatePath("/notifications");

    console.log("Like notification created successfully");
    return { success: true };
  } catch (error) {
    console.error("Error creating like notification:", error);
    return { success: false, error: error.message };
  }
}

// Get user's notifications with pagination
export async function getUserNotifications(userId, limit = 20, lastNotificationId = null) {
  try {
    if (!userId) {
      return {
        notifications: [],
        hasMore: false,
        lastNotificationId: null,
        error: "User ID is required",
      };
    }

    let query = adminDb
      .collection("notifications")
      .where("recipientId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (lastNotificationId) {
      const lastDoc = await adminDb.collection("notifications").doc(lastNotificationId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc.get("createdAt"));
      }
    }

    const snapshot = await query.get();

    const notifications = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        profileImage: data.profileImage,
        senderId: data.senderId,
        senderName: data.senderName,
        postId: data.postId,
        postTitle: data.postTitle,
        commentId: data.commentId, // For reply notifications
        commentContent: data.commentContent, // For reply notifications
        message: data.message,
        isRead: data.isRead || false,
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
      };
    });

    const hasMore = snapshot.size === limit;
    const newLastNotificationId = notifications.length > 0 ? notifications[notifications.length - 1].id : null;

    return {
      notifications,
      hasMore,
      lastNotificationId: newLastNotificationId,
    };
  } catch (error) {
    console.error("Error getting notifications:", error);
    return {
      notifications: [],
      hasMore: false,
      lastNotificationId: null,
      error: error.message,
    };
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId) {
  try {
    if (!notificationId) {
      return { success: false, error: "Notification ID is required" };
    }

    await adminDb.collection("notifications").doc(notificationId).update({
      isRead: true,
      readAt: new Date(),
    });

    revalidatePath("/notifications");
    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: error.message };
  }
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(userId) {
  try {
    if (!userId) {
      return { success: false, error: "User ID is required" };
    }

    const snapshot = await adminDb
      .collection("notifications")
      .where("recipientId", "==", userId)
      .where("isRead", "==", false)
      .get();

    const batch = adminDb.batch();
    const now = new Date();

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        isRead: true,
        readAt: now,
      });
    });

    await batch.commit();
    revalidatePath("/notifications");

    console.log(`Marked ${snapshot.size} notifications as read`);
    return { success: true, count: snapshot.size };
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return { success: false, error: error.message };
  }
}

// Get unread notification count
export async function getUnreadNotificationCount(userId) {
  try {
    if (!userId) {
      return { count: 0, error: "User ID is required" };
    }

    const snapshot = await adminDb
      .collection("notifications")
      .where("recipientId", "==", userId)
      .where("isRead", "==", false)
      .get();

    return { count: snapshot.size };
  } catch (error) {
    console.error("Error getting unread notification count:", error);
    return { count: 0, error: error.message };
  }
}

// Delete notification
export async function deleteNotification(notificationId) {
  try {
    if (!notificationId) {
      return { success: false, error: "Notification ID is required" };
    }

    await adminDb.collection("notifications").doc(notificationId).delete();
    revalidatePath("/notifications");

    return { success: true };
  } catch (error) {
    console.error("Error deleting notification:", error);
    return { success: false, error: error.message };
  }
}
