"use server";

import { adminDb } from "@/lib/firebase/admin";

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

// Add a comment to a post
export async function addComment(postId, commentData) {
  try {
    if (!postId || !commentData?.userId || !commentData?.content) {
      return { success: false, error: "Post ID, user, and content are required" };
    }

    const now = new Date();

    // Store with Firestore reference
    const comment = {
      content: commentData.content,
      createdAt: now,
      userRef: adminDb.collection("users").doc(commentData.userId), // ✅ stored as reference
      isEdited: false,
      likes: 0,
    };

    const docRef = await adminDb.collection("posts").doc(postId).collection("comments").add(comment);

    console.log("Comment added:", docRef.id);

    // 🔗 Try resolving user object immediately
    let user = null;
    try {
      const userSnap = await comment.userRef.get();
      if (userSnap.exists) {
        user = { id: userSnap.id, ...userSnap.data() };
      }
    } catch (err) {
      console.error("Error fetching user for new comment:", err);
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
        userId: commentData.userId, // ✅ safe for client
        user, // ✅ populated user (optional)
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

// Get replies for a specific comment
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

// Add a reply to a comment
export async function addReply(postId, commentId, replyData) {
  try {
    if (!postId || !commentId || !replyData?.userId || !replyData?.content) {
      return { success: false, error: "Post ID, comment ID, user ID, and content are required" };
    }

    const now = new Date();

    // Store reply in Firestore
    const reply = {
      content: replyData.content,
      createdAt: now,
      likes: 0,
      isEdited: false,
      userRef: adminDb.collection("users").doc(replyData.userId), // ✅ stored as reference
    };

    const docRef = await adminDb
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .doc(commentId)
      .collection("replies")
      .add(reply);

    console.log("Reply added:", docRef.id);

    // 🔗 Resolve user object immediately
    let user = null;
    try {
      const userSnap = await reply.userRef.get();
      if (userSnap.exists) {
        user = { id: userSnap.id, ...userSnap.data() };
      }
    } catch (err) {
      console.error("Error fetching user for new reply:", err);
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
        userId: replyData.userId, // ✅ safe for client
        user, // ✅ resolved user object
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
