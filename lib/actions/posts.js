"use server";

import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import stream from "stream";
import { serializeDoc } from "../utils";

// Helper function to upload files to Firebase Storage
async function uploadFile(file, folder = "posts") {
  try {
    if (!file || !file.arrayBuffer) {
      throw new Error("Invalid file object");
    }

    const bucket = adminStorage.bucket();
    const fileExtension = file.name.split(".").pop();
    const fileName = `${folder}/${uuidv4()}.${fileExtension}`;
    const fileUpload = bucket.file(fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    const passthroughStream = new stream.PassThrough();
    passthroughStream.end(buffer);

    await new Promise((resolve, reject) => {
      passthroughStream
        .pipe(
          fileUpload.createWriteStream({
            metadata: {
              contentType: file.type,
              metadata: {
                originalName: file.name,
                uploadedAt: new Date().toISOString(),
              },
            },
          })
        )
        .on("finish", resolve)
        .on("error", reject);
    });

    await fileUpload.makePublic();

    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error(`Failed to upload file: ${file.name}`);
  }
}

// Helper function to upload multiple files
async function uploadFiles(files, folder) {
  if (!files || files.length === 0) return [];

  const uploadPromises = files.map((file) => uploadFile(file, folder));
  return Promise.all(uploadPromises);
}

// Create a new post
export async function createPost(postData) {
  try {
    // console.log("Creating post with data:", postData);

    // Validate required fields
    if (!postData.userId) {
      return {
        success: false,
        error: "User ID is required",
      };
    }

    if (!postData.title?.trim() && !postData.content?.trim()) {
      return {
        success: false,
        error: "Title or content is required",
      };
    }

    // Upload files to Firebase Storage
    let imageUrls = [];
    let videoUrls = [];

    try {
      // Upload images
      if (postData.images && postData.images.length > 0) {
        console.log(`Uploading ${postData.images.length} images...`);
        imageUrls = await uploadFiles(postData.images, "posts/images");
      }

      // Upload videos
      if (postData.videos && postData.videos.length > 0) {
        console.log(`Uploading ${postData.videos.length} videos...`);
        videoUrls = await uploadFiles(postData.videos, "posts/videos");
      }
    } catch (uploadError) {
      console.error("File upload failed:", uploadError);
      return {
        success: false,
        error: "Failed to upload media files. Please try again.",
      };
    }

    // Prepare post document
    const postDoc = {
      title: postData.title?.trim() || "",
      content: postData.content?.trim() || "",
      userId: postData.userId,
      userInfo: {
        userId: postData.userId,
        name: postData.userInfo?.name || "Anonymous",
        profileImage: postData.userInfo?.profileImage || "👤",
        email: postData.userInfo?.email || "",
      },
      images: imageUrls, // array
      videos: videoUrls, // array
      tags: Array.isArray(postData.tags) ? postData.tags : [],
      likes: 0,
      upvotes: 0,
      downvotes: 0,
      // comments is a subcollection and in each comment is a reply(s) subcollection
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // console.log("Post document to be created:", postDoc);

    // Create post in Firestore
    // const collections = await adminDb.listCollections();
    // console.log(
    //   "All collections:",
    //   collections.map((col) => col.id)
    // );

    const docRef = await adminDb.collection("posts").add(postDoc);

    // console.log(
    //   "Post created successfully:",
    //   docRef,
    //   "All collections:",
    //   collections.map((col) => col.id)
    // );

    // Revalidate relevant paths
    // revalidatePath("/");

    return {
      success: true,
      postId: docRef.id,
      post: {
        id: docRef.id,
        ...postDoc,
        // Convert Firestore timestamps to ISO strings for client
        createdAt: postDoc.createdAt.toISOString(),
        updatedAt: postDoc.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("Error creating post:", error);
    return {
      success: false,
      error: error.message || "Failed to create post",
    };
  }
}

// Get posts with proper data conversion
export async function getPosts(limit = 10, lastPostId = null) {
  try {
    console.log("Getting posts...");

    let query = adminDb.collection("posts").orderBy("createdAt", "desc").limit(limit);

    if (lastPostId) {
      const lastDoc = await adminDb.collection("posts").doc(lastPostId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();
    console.log("Found posts:", snapshot.size);

    const posts = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Get comments count for this post
      const commentsSnapshot = await adminDb.collection("posts").doc(doc.id).collection("comments").get();

      const post = {
        id: doc.id,
        title: data.title || "",
        content: data.content || "",
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
        upvotes: data.upvotes || 0,
        downvotes: data.downvotes || 0,
        likes: data.likes || 0,
        userId: data.userId || "",
        userInfo: data.userInfo || {},
        images: data.images || [],
        videos: data.videos || [],
        tags: data.tags || [],
        commentsCount: commentsSnapshot.size, // Real comments count from subcollection
      };

      posts.push(post);
    }

    const hasMore = snapshot.size === limit;
    const newLastPostId = posts.length > 0 ? posts[posts.length - 1].id : null;

    console.log("Posts loaded:", posts.length);
    return {
      posts,
      hasMore,
      lastPostId: newLastPostId,
    };
  } catch (error) {
    console.error("Error getting posts:", error);
    return {
      posts: [],
      hasMore: false,
      lastPostId: null,
      error: error.message,
    };
  }
}

// Get a single post by ID with better error handling
export async function getPost(postId) {
  try {
    if (!postId) {
      return {
        success: false,
        error: "Post ID is required",
      };
    }

    const doc = await adminDb.collection("posts").doc(postId).get();

    if (!doc.exists) {
      return {
        success: false,
        error: "Post not found",
      };
    }

    const postData = doc.data();

    return {
      success: true,
      post: {
        id: doc.id,
        ...postData,
        createdAt: postData.createdAt?.toDate?.() || postData.createdAt,
        updatedAt: postData.updatedAt?.toDate?.() || postData.updatedAt,
      },
    };
  } catch (error) {
    console.error("Error getting post:", error);
    return {
      success: false,
      error: "Failed to fetch post",
    };
  }
}

// Helper function to create SEO-friendly slugs
export async function createSlug(title, id) {
  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters except spaces and hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/(^-|-$)/g, ""); // Remove leading/trailing hyphens

  return `${titleSlug}-${id}`;
}

// Helper function to extract post ID from slug
export async function extractPostIdFromSlug(slug) {
  const parts = slug.split("-");
  return parts[parts.length - 1]; // Last part should be the ID
}

// Update a post
export async function updatePost(postId, updateData, userId) {
  try {
    if (!postId || !userId) {
      return {
        success: false,
        error: "Post ID and User ID are required",
      };
    }

    // First, verify the user owns the post
    const postRef = adminDb.collection("posts").doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return {
        success: false,
        error: "Post not found",
      };
    }

    const postData = postDoc.data();
    if (postData.userId !== userId) {
      return {
        success: false,
        error: "Unauthorized: You can only edit your own posts",
      };
    }

    // Handle file uploads if new files are provided
    let imageUrls = updateData.images || postData.images || [];
    let videoUrls = updateData.videos || postData.videos || [];

    if (updateData.newImages && updateData.newImages.length > 0) {
      const newImageUrls = await uploadFiles(updateData.newImages, "posts/images");
      imageUrls = [...imageUrls, ...newImageUrls];
    }

    if (updateData.newVideos && updateData.newVideos.length > 0) {
      const newVideoUrls = await uploadFiles(updateData.newVideos, "posts/videos");
      videoUrls = [...videoUrls, ...newVideoUrls];
    }

    const updatedData = {
      title: updateData.title?.trim() || postData.title,
      content: updateData.content?.trim() || postData.content,
      // location: updateData.location?.trim() || postData.location || "",
      tags: Array.isArray(updateData.tags) ? updateData.tags : postData.tags || [],
      images: imageUrls,
      videos: videoUrls,
      updatedAt: new Date(),
      isEdited: true,
    };

    await postRef.update(updatedData);

    revalidatePath("/");
    revalidatePath(`/posts/${postId}`);

    return {
      success: true,
      postId,
    };
  } catch (error) {
    console.error("Error updating post:", error);
    return {
      success: false,
      error: "Failed to update post",
    };
  }
}

// Delete a post (soft delete by archiving)
export async function deletePost(postId, userId) {
  try {
    if (!postId || !userId) {
      return {
        success: false,
        error: "Post ID and User ID are required",
      };
    }

    const postRef = adminDb.collection("posts").doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return {
        success: false,
        error: "Post not found",
      };
    }

    const postData = postDoc.data();
    if (postData.userId !== userId) {
      return {
        success: false,
        error: "Unauthorized: You can only delete your own posts",
      };
    }

    // Soft delete by archiving
    await postRef.update({
      isArchived: true,
      updatedAt: new Date(),
    });

    revalidatePath("/");

    return {
      success: true,
      postId,
    };
  } catch (error) {
    console.error("Error deleting post:", error);
    return {
      success: false,
      error: "Failed to delete post",
    };
  }
}

// Hard delete a post (permanently remove)
export async function permanentDeletePost(postId, userId) {
  try {
    if (!postId || !userId) {
      return {
        success: false,
        error: "Post ID and User ID are required",
      };
    }

    const postRef = adminDb.collection("posts").doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return {
        success: false,
        error: "Post not found",
      };
    }

    const postData = postDoc.data();
    if (postData.userId !== userId) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Delete associated media files from storage
    const deletePromises = [];

    if (postData.images && postData.images.length > 0) {
      postData.images.forEach((imageUrl) => {
        try {
          // Extract filename from URL
          const fileName = imageUrl.split("/").pop().split("?")[0]; // Remove query params
          const filePath = `posts/images/${fileName}`;
          deletePromises.push(
            adminStorage
              .bucket()
              .file(filePath)
              .delete()
              .catch((err) => console.warn(`Failed to delete image ${filePath}:`, err.message))
          );
        } catch (err) {
          console.warn("Error parsing image URL:", imageUrl, err);
        }
      });
    }

    if (postData.videos && postData.videos.length > 0) {
      postData.videos.forEach((videoUrl) => {
        try {
          const fileName = videoUrl.split("/").pop().split("?")[0];
          const filePath = `posts/videos/${fileName}`;
          deletePromises.push(
            adminStorage
              .bucket()
              .file(filePath)
              .delete()
              .catch((err) => console.warn(`Failed to delete video ${filePath}:`, err.message))
          );
        } catch (err) {
          console.warn("Error parsing video URL:", videoUrl, err);
        }
      });
    }

    // Wait for all media deletions (don't fail if media doesn't exist)
    await Promise.allSettled(deletePromises);

    // Delete all comments and their subcollections
    const commentsSnapshot = await postRef.collection("comments").get();
    const commentDeletePromises = [];

    commentsSnapshot.forEach((commentDoc) => {
      // Delete replies subcollection
      commentDeletePromises.push(
        commentDoc.ref
          .collection("replies")
          .get()
          .then((repliesSnapshot) => {
            const replyDeletePromises = repliesSnapshot.docs.map((replyDoc) => replyDoc.ref.delete());
            return Promise.all(replyDeletePromises);
          })
      );
      // Delete comment document
      commentDeletePromises.push(commentDoc.ref.delete());
    });

    // Delete likes and votes subcollections
    const [likesSnapshot, votesSnapshot] = await Promise.all([
      postRef.collection("likes").get(),
      postRef.collection("votes").get(),
    ]);

    const subcollectionDeletes = [
      ...likesSnapshot.docs.map((doc) => doc.ref.delete()),
      ...votesSnapshot.docs.map((doc) => doc.ref.delete()),
      ...commentDeletePromises,
    ];

    await Promise.all(subcollectionDeletes);

    // Finally, delete the post document
    await postRef.delete();

    revalidatePath("/");

    return {
      success: true,
      postId,
    };
  } catch (error) {
    console.error("Error permanently deleting post:", error);
    return {
      success: false,
      error: "Failed to permanently delete post",
    };
  }
}
// Search posts
export async function searchPosts(searchTerm, limit = 20) {
  try {
    if (!searchTerm?.trim()) {
      return {
        success: false,
        error: "Search term is required",
      };
    }

    // Note: Firestore doesn't support full-text search natively
    // For production, consider using Algolia, Elasticsearch, or Firebase Extensions
    const snapshot = await adminDb
      .collection("posts")
      .where("isArchived", "==", false)
      .orderBy("createdAt", "desc")
      .limit(limit * 5) // Get more to filter client-side
      .get();

    const posts = [];
    const searchTermLower = searchTerm.toLowerCase().trim();

    snapshot.forEach((doc) => {
      const data = doc.data();
      const title = (data.title || "").toLowerCase();
      const content = (data.content || "").toLowerCase();
      // const location = (data.location || "").toLowerCase();
      const tags = Array.isArray(data.tags) ? data.tags.join(" ").toLowerCase() : "";
      const userName = (data.userInfo?.name || "").toLowerCase();

      // Simple text matching - can be improved with better search algorithms
      if (
        title.includes(searchTermLower) ||
        content.includes(searchTermLower) ||
        // location.includes(searchTermLower) ||
        tags.includes(searchTermLower) ||
        userName.includes(searchTermLower)
      ) {
        posts.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        });
      }
    });

    return {
      success: true,
      posts: posts.slice(0, limit),
      totalFound: posts.length,
    };
  } catch (error) {
    console.error("Error searching posts:", error);
    return {
      success: false,
      error: "Failed to search posts",
      posts: [],
    };
  }
}

// Like/Unlike a post
export async function togglePostLike(postId, user, isLiked) {
  // console.log(`Toggling like for post ID: ${postId}, isLiked: ${isLiked}, user: ${JSON.stringify(user)}`);

  try {
    if (!postId || !user) {
      return {
        success: false,
        error: "Post ID and user info are required",
      };
    }

    const postRef = adminDb.collection("posts").doc(postId);
    const likeRef = postRef.collection("likes").doc(user.id);
    // console.log(likeRef);

    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return {
        success: false,
        error: "Post not found",
      };
    }

    const likeDoc = await likeRef.get();

    if (isLiked && likeDoc.exists) {
      // Unlike → delete the like document
      await likeRef.delete();
    } else if (!isLiked && !likeDoc.exists) {
      // Like → create the like document
      await likeRef.set({
        userId: user.id,
        fullName: user.fullName,
        email: user.email,
        profileImage: user.profileImage,
        createdAt: new Date(),
      });
    }

    // Count likes = number of docs in subcollection
    const likesSnapshot = await postRef.collection("likes").get();
    const likesCount = likesSnapshot.size;

    // (Optional) update cached likes count on post doc
    await postRef.update({ likes: likesCount });

    revalidatePath(`/posts/${postId}`);

    return {
      success: true,
      isLiked: !isLiked,
      likesCount,
    };
  } catch (error) {
    console.error("Error toggling like:", error);
    return {
      success: false,
      error: "Failed to toggle like",
    };
  }
}

// Check if a user has liked a specific post
export async function checkUserLike(postId, userId) {
  try {
    if (!postId || !userId) {
      return false;
    }

    const postRef = adminDb.collection("posts").doc(postId);
    const likeRef = postRef.collection("likes").doc(userId);

    const likeDoc = await likeRef.get();
    return likeDoc.exists;
  } catch (error) {
    console.error("Error checking user like:", error);
    return false;
  }
}

// Toggle upvote/downvote for a post (atomic version)
export async function togglePostVote(postId, user, voteType) {
  console.log(`Toggling vote for post ID: ${postId}, voteType: ${voteType}, user: ${JSON.stringify(user)}`);

  if (!postId || !user || !voteType) {
    return { success: false, error: "Post ID, user info, and vote type are required" };
  }

  if (!["up", "down"].includes(voteType)) {
    return { success: false, error: "Vote type must be 'up' or 'down'" };
  }

  const postRef = adminDb.collection("posts").doc(postId);
  const upvoteRef = postRef.collection("upvotes").doc(user.id);
  const downvoteRef = postRef.collection("downvotes").doc(user.id);

  try {
    const result = await adminDb.runTransaction(async (transaction) => {
      const [postDoc, upvoteDoc, downvoteDoc] = await Promise.all([
        transaction.get(postRef),
        transaction.get(upvoteRef),
        transaction.get(downvoteRef),
      ]);

      if (!postDoc.exists) throw new Error("Post not found");

      let upvotesCount = postDoc.data().upvotes || 0;
      let downvotesCount = postDoc.data().downvotes || 0;

      let currentVote = null;
      if (upvoteDoc.exists) currentVote = "up";
      if (downvoteDoc.exists) currentVote = "down";

      // Remove old vote
      if (currentVote === "up") {
        transaction.delete(upvoteRef);
        upvotesCount = Math.max(0, upvotesCount - 1);
      } else if (currentVote === "down") {
        transaction.delete(downvoteRef);
        downvotesCount = Math.max(0, downvotesCount - 1);
      }

      let newVoteStatus = null;

      // Add new vote if different
      if (voteType === "up" && currentVote !== "up") {
        transaction.set(upvoteRef, {
          userId: user.id,
          fullName: user.fullName,
          email: user.email,
          profileImage: user.profileImage,
          createdAt: new Date(),
        });
        upvotesCount += 1;
        newVoteStatus = "up";
      } else if (voteType === "down" && currentVote !== "down") {
        transaction.set(downvoteRef, {
          userId: user.id,
          fullName: user.fullName,
          email: user.email,
          profileImage: user.profileImage,
          createdAt: new Date(),
        });
        downvotesCount += 1;
        newVoteStatus = "down";
      }

      // Save counts atomically
      transaction.update(postRef, {
        upvotes: upvotesCount,
        downvotes: downvotesCount,
      });

      return { upvotesCount, downvotesCount, userVoteStatus: newVoteStatus };
    });

    return { success: true, ...result };
  } catch (error) {
    console.error("Error toggling vote:", error);
    return { success: false, error: "Failed to toggle vote" };
  }
}

// Check user's vote status for a post
export async function checkUserVote(postId, userId) {
  try {
    if (!postId || !userId) {
      return null;
    }

    const postRef = adminDb.collection("posts").doc(postId);
    const upvoteRef = postRef.collection("upvotes").doc(userId);
    const downvoteRef = postRef.collection("downvotes").doc(userId);

    const [upvoteDoc, downvoteDoc] = await Promise.all([upvoteRef.get(), downvoteRef.get()]);

    if (upvoteDoc.exists) {
      return "up";
    } else if (downvoteDoc.exists) {
      return "down";
    }

    return null; // No vote
  } catch (error) {
    console.error("Error checking user vote:", error);
    return null;
  }
}

// Get comments for a specific post
export async function getComments(postId, limit = 20) {
  try {
    console.log("Getting comments for post:", postId);

    const snapshot = await adminDb
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const comments = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Get replies count for this comment
      const repliesSnapshot = await adminDb
        .collection("posts")
        .doc(postId)
        .collection("comments")
        .doc(doc.id)
        .collection("replies")
        .get();

      const comment = {
        id: doc.id,
        content: data.content || "",
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        likes: data.likes || 0,
        user: data.user || {},
        repliesCount: repliesSnapshot.size, // Real replies count
      };

      comments.push(comment);
    }

    console.log("Comments loaded:", comments.length);
    return comments;
  } catch (error) {
    console.error("Error getting comments:", error);
    return [];
  }
}

// Get posts by tag
export async function getPostsByTag(tag, limit = 20) {
  try {
    if (!tag?.trim()) {
      return {
        success: false,
        error: "Tag is required",
      };
    }

    const tagLower = tag.toLowerCase().trim();

    const snapshot = await adminDb
      .collection("posts")
      .where("isArchived", "==", false)
      .where("tags", "array-contains", tagLower)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const posts = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      });
    });

    return {
      success: true,
      posts,
      tag: tagLower,
    };
  } catch (error) {
    console.error("Error getting posts by tag:", error);
    return {
      success: false,
      error: "Failed to fetch posts by tag",
      posts: [],
    };
  }
}

// Add a comment to a post
export async function addComment(postId, commentData) {
  try {
    const comment = {
      content: commentData.content,
      createdAt: new Date(),
      likes: 0,
      user: {
        name: commentData.user.name,
        email: commentData.user.email,
        profileImage: commentData.user.profileImage || "",
        userId: commentData.user.userId,
      },
    };

    const docRef = await adminDb.collection("posts").doc(postId).collection("comments").add(comment);

    console.log("Comment added:", docRef.id);

    return {
      success: true,
      comment: {
        id: docRef.id,
        ...comment,
        createdAt: comment.createdAt.toISOString(),
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

    const replies = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      replies.push({
        id: doc.id,
        content: data.content || "",
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        likes: data.likes || 0,
        user: data.user || {},
      });
    });

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
    const reply = {
      content: replyData.content,
      createdAt: new Date(),
      likes: 0,
      user: {
        name: replyData.user.name,
        email: replyData.user.email,
        profileImage: replyData.user.profileImage || "",
        userId: replyData.user.userId,
      },
    };

    const docRef = await adminDb
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .doc(commentId)
      .collection("replies")
      .add(reply);

    console.log("Reply added:", docRef.id);

    return {
      success: true,
      reply: {
        id: docRef.id,
        ...reply,
        createdAt: reply.createdAt.toISOString(),
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

// Add these functions to your existing server actions file

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
    if (existing.user.userId !== userId) {
      return { success: false, error: "You can only edit your own comments" };
    }

    const now = new Date();

    await commentRef.update({
      content: commentData.content,
      updatedAt: now,
      isEdited: true,
    });

    console.log("Comment updated successfully");

    return {
      success: true,
      comment: serializeDoc({ ...existing, content: commentData.content, updatedAt: now, isEdited: true }, commentId),
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
    if (data.user.userId !== userId) {
      return { success: false, error: "You can only delete your own comments" };
    }

    // Delete replies first
    const repliesSnapshot = await commentRef.collection("replies").get();
    const batch = adminDb.batch();

    repliesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(commentRef);

    await batch.commit();

    console.log("Comment and replies deleted successfully");

    return { success: true, deletedRepliesCount: repliesSnapshot.size };
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
    if (existing.user.userId !== userId) {
      return { success: false, error: "You can only edit your own replies" };
    }

    const now = new Date();

    await replyRef.update({
      content: replyData.content,
      updatedAt: now,
      isEdited: true,
    });

    console.log("Reply updated successfully");

    return {
      success: true,
      reply: serializeDoc({ ...existing, content: replyData.content, updatedAt: now, isEdited: true }, replyId),
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
    if (data.user.userId !== userId) {
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
