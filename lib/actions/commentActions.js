"use server";

import { adminDb } from "@/lib/firebase/admin";
import { createCommentNotification, createReplyNotification } from "./notificationActions";

// Get comments for a specific post
export async function getComments(postId, limit = 20) {
  try {
    console.log("Getting comments for:", postId);

    const snapshot = await adminDb
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    // Map through comments concurrently
    const commentsPromises = snapshot.docs.map(async (doc) => {
      const data = doc.data();

      // Count replies for this comment
      const repliesSnapshot = await doc.ref.collection("replies").get();

      // Resolve user info
      let user = null;
      let userId = null;
      if (data.userRef) {
        try {
          userId = data.userRef.id; // ✅ extract ID
          const userDoc = await data.userRef.get();
          if (userDoc.exists) {
            user = { id: userDoc.id, ...userDoc.data() };
          }
        } catch (err) {
          console.error(`Error fetching user for comment ${doc.id}:`, err);
        }
      }

      return {
        id: doc.id,
        content: data.content || "",
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
        likes: data.likes || 0,
        isEdited: data.isEdited || false,
        userId, // ✅ safe to send
        user, // ✅ resolved user object
        repliesCount: repliesSnapshot.size,
      };
    });

    const comments = await Promise.all(commentsPromises);

    console.log("Comments loaded:", comments.length);
    return comments;
  } catch (error) {
    console.error("Error getting comments:", error);
    return [];
  }
}

// Get comments count for a specific post
export async function getCommentsCount(postId) {
  try {
    const snapshot = await adminDb.collection("posts").doc(postId).collection("comments").get();

    return snapshot.size;
  } catch (error) {
    console.error("Error getting comments count:", error);
    return 0;
  }
}

// Helper function to resolve user data
export async function resolveUserData(userRef) {
  try {
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      return { id: userSnap.id, ...userSnap.data() };
    }
  } catch (err) {
    console.error("Error fetching user:", err);
  }
  return null;
}

// Helper function to get post data
export async function getPostData(postId) {
  try {
    const postDoc = await adminDb.collection("posts").doc(postId).get();
    if (!postDoc.exists) return null;

    const postData = postDoc.data();
    let postOwnerId = null;

    if (postData.userRef) {
      if (typeof postData.userRef.get === "function") {
        const userDoc = await postData.userRef.get();
        postOwnerId = userDoc.exists ? userDoc.id : null;
      } else if (typeof postData.userRef === "string") {
        postOwnerId = postData.userRef.replace("/users/", "");
      }
    }

    return {
      title: postData.title || "your post",
      ownerId: postOwnerId,
      data: postData,
    };
  } catch (error) {
    console.error("Error getting post data:", error);
    return null;
  }
}

// Add comment with notification
export async function addComment(postId, commentData) {
  try {
    if (!postId || !commentData?.userId || !commentData?.content) {
      return { success: false, error: "Post ID, user, and content are required" };
    }

    const now = new Date();
    const userRef = adminDb.collection("users").doc(commentData.userId);

    // Create comment
    const comment = {
      content: commentData.content,
      createdAt: now,
      userRef: userRef,
      isEdited: false,
      likes: 0,
    };

    const docRef = await adminDb.collection("posts").doc(postId).collection("comments").add(comment);
    console.log("Comment added:", docRef.id);

    // Get user data and post data concurrently
    const [user, postInfo] = await Promise.all([resolveUserData(userRef), getPostData(postId)]);

    // Create notification if not commenting on own post
    if (postInfo?.ownerId && postInfo.ownerId !== commentData.userId && user) {
      await createCommentNotification({
        postId: postId,
        profileImage: commentData.profileImage,
        commenterId: commentData.userId,
        postOwnerId: postInfo.ownerId,
        commenterName: user.fullName || user.email?.split("@")[0] || "Someone",
        postTitle: postInfo.title,
      });
    }

    return {
      success: true,
      comment: {
        id: docRef.id,
        content: comment.content,
        createdAt: now.toISOString(),
        updatedAt: null,
        isEdited: false,
        likes: 0,
        userId: commentData.userId,
        user,
        repliesCount: 0,
      },
    };
  } catch (error) {
    console.error("Error adding comment:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Get replies for a comment, including user info from userRef
export async function getReplies(postId, commentId, limit = 10) {
  try {
    console.log("Getting replies for comment:", commentId);

    const snapshot = await adminDb
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .doc(commentId)
      .collection("replies")
      .orderBy("createdAt", "asc")
      .limit(limit)
      .get();

    // Map through replies concurrently
    const repliesPromises = snapshot.docs.map(async (doc) => {
      const data = doc.data();

      // Extract userId from reference
      const userId = data.userRef?.id || data.userRef?.path?.split("/").pop() || null;

      // Resolve user info
      let user = null;
      if (data.userRef) {
        try {
          const userDoc = await data.userRef.get();
          if (userDoc.exists) {
            user = { id: userDoc.id, ...userDoc.data() };
          }
        } catch (err) {
          console.error(`Error fetching user for reply ${doc.id}:`, err);
        }
      }

      return {
        id: doc.id,
        content: data.content || "",
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
        likes: data.likes || 0,
        isEdited: data.isEdited || false,
        userId, // ✅ plain string ID
        user, // ✅ resolved user data
      };
    });

    const replies = await Promise.all(repliesPromises);

    console.log("Replies loaded:", replies.length);
    return replies;
  } catch (error) {
    console.error("Error getting replies:", error);
    return [];
  }
}

// Add reply with notification
export async function addReply(postId, commentId, replyData) {
  try {
    if (!postId || !commentId || !replyData?.userId || !replyData?.content) {
      return { success: false, error: "Post ID, comment ID, user ID, and content are required" };
    }

    const now = new Date();
    const userRef = adminDb.collection("users").doc(replyData.userId);

    // Create reply
    const reply = {
      content: replyData.content,
      createdAt: now,
      likes: 0,
      isEdited: false,
      userRef: userRef,
    };

    const docRef = await adminDb
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .doc(commentId)
      .collection("replies")
      .add(reply);

    console.log("Reply added:", docRef.id);

    // Get user data and comment owner data concurrently
    const [user, commentDoc] = await Promise.all([
      resolveUserData(userRef),
      adminDb.collection("posts").doc(postId).collection("comments").doc(commentId).get(),
    ]);

    // Create notification for comment owner (if not replying to own comment)
    if (commentDoc.exists && user) {
      const commentData = commentDoc.data();
      let commentOwnerId = null;

      if (commentData.userRef) {
        if (typeof commentData.userRef.get === "function") {
          const commentOwnerDoc = await commentData.userRef.get();
          commentOwnerId = commentOwnerDoc.exists ? commentOwnerDoc.id : null;
        } else if (typeof commentData.userRef === "string") {
          commentOwnerId = commentData.userRef.replace("/users/", "");
        }
      }

      if (commentOwnerId && commentOwnerId !== replyData.userId) {
        await createReplyNotification({
          postId: postId,
          commentId: commentId,
          profileImage: replyData.profileImage,
          replierId: replyData.userId,
          commentOwnerId: commentOwnerId,
          replierName: user.fullName || user.email?.split("@")[0] || "Someone",
          commentContent: commentData.content?.substring(0, 50) + "..." || "your comment",
        });
      }
    }

    return {
      success: true,
      reply: {
        id: docRef.id,
        content: reply.content,
        createdAt: now.toISOString(),
        updatedAt: null,
        isEdited: false,
        likes: 0,
        userId: replyData.userId,
        user,
      },
    };
  } catch (error) {
    console.error("Error adding reply:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Update a comment
export async function updateComment(postId, commentId, commentData, userId) {
  try {
    console.log("Updating comment:", commentId);

    const commentRef = adminDb.collection("posts").doc(postId).collection("comments").doc(commentId);

    const commentDoc = await commentRef.get();
    if (!commentDoc.exists) {
      return { success: false, error: "Comment not found" };
    }

    const existing = commentDoc.data();

    // Ensure only the owner of the comment can edit
    const commentUserId = existing.userRef?.id || existing.userRef?.path?.split("/").pop();
    if (commentUserId !== userId) {
      return { success: false, error: "You can only edit your own comments" };
    }

    const now = new Date();

    // Apply update
    await commentRef.update({
      content: commentData.content,
      updatedAt: now,
      isEdited: true,
    });

    console.log("Comment updated successfully");

    // 🔗 Resolve user for return payload
    let user = null;
    try {
      const userSnap = await existing.userRef.get();
      if (userSnap.exists) {
        user = { id: userSnap.id, ...userSnap.data() };
      }
    } catch (err) {
      console.error("Error resolving user for updated comment:", err);
    }

    return {
      success: true,
      comment: {
        id: commentId,
        content: commentData.content,
        createdAt: existing.createdAt?.toDate?.().toISOString() || null,
        updatedAt: now.toISOString(),
        isEdited: true,
        likes: existing.likes || 0,
        userId: commentUserId, // ✅ safe string id
        user, // ✅ resolved object
      },
    };
  } catch (error) {
    console.error("Error updating comment:", error);
    return { success: false, error: error.message };
  }
}

// Delete a comment
export async function deleteComment(postId, commentId, userId) {
  try {
    console.log("Deleting comment:", commentId);

    const commentRef = adminDb.collection("posts").doc(postId).collection("comments").doc(commentId);

    const commentDoc = await commentRef.get();

    if (!commentDoc.exists) {
      return { success: false, error: "Comment not found" };
    }

    const data = commentDoc.data();

    // Ensure only the owner can delete
    const commentUserId = data.userRef?.id || data.userRef?.path?.split("/").pop();
    if (commentUserId !== userId) {
      return { success: false, error: "You can only delete your own comments" };
    }

    // Delete replies first
    const repliesSnapshot = await commentRef.collection("replies").get();
    const batch = adminDb.batch();

    repliesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(commentRef);

    await batch.commit();

    console.log("Comment and replies deleted successfully");

    return {
      success: true,
      deletedRepliesCount: repliesSnapshot.size,
    };
  } catch (error) {
    console.error("Error deleting comment:", error);
    return { success: false, error: error.message };
  }
}

// Update a reply
export async function updateReply(postId, commentId, replyId, replyData, userId) {
  try {
    console.log("Updating reply:", replyId);

    const replyRef = adminDb
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .doc(commentId)
      .collection("replies")
      .doc(replyId);

    const replyDoc = await replyRef.get();
    if (!replyDoc.exists) {
      return { success: false, error: "Reply not found" };
    }

    const existing = replyDoc.data();

    // Ensure only the owner can edit
    const replyUserId = existing.userRef?.id || existing.userRef?.path?.split("/").pop();
    if (replyUserId !== userId) {
      return { success: false, error: "You can only edit your own replies" };
    }

    const now = new Date();

    // Update reply in Firestore
    await replyRef.update({
      content: replyData.content,
      updatedAt: now,
      isEdited: true,
    });

    console.log("Reply updated successfully");

    // 🔗 Resolve user info for return payload
    let user = null;
    try {
      const userSnap = await existing.userRef.get();
      if (userSnap.exists) {
        user = { id: userSnap.id, ...userSnap.data() };
      }
    } catch (err) {
      console.error("Error resolving user for updated reply:", err);
    }

    return {
      success: true,
      reply: {
        id: replyId,
        content: replyData.content,
        createdAt: existing.createdAt?.toDate?.().toISOString() || null,
        updatedAt: now.toISOString(),
        isEdited: true,
        likes: existing.likes || 0,
        userId: replyUserId, // ✅ plain string ID
        user, // ✅ resolved user object
      },
    };
  } catch (error) {
    console.error("Error updating reply:", error);
    return { success: false, error: error.message };
  }
}

// Delete a reply
export async function deleteReply(postId, commentId, replyId, userId) {
  try {
    console.log("Deleting reply:", replyId);

    const replyRef = adminDb
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .doc(commentId)
      .collection("replies")
      .doc(replyId);

    const replyDoc = await replyRef.get();

    if (!replyDoc.exists) {
      return { success: false, error: "Reply not found" };
    }

    const data = replyDoc.data();

    // Extract the userId from the stored userRef
    const replyUserId = data.userRef?.id || data.userRef?.path?.split("/").pop();

    if (replyUserId !== userId) {
      return { success: false, error: "You can only delete your own replies" };
    }

    await replyRef.delete();

    console.log("Reply deleted successfully");

    return { success: true };
  } catch (error) {
    console.error("Error deleting reply:", error);
    return { success: false, error: error.message };
  }
}
