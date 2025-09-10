"use server";

import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import slugify from "slugify";

// Helper function to upload files to Firebase Storage
export async function uploadFile(file, folder = "posts") {
  try {
    // Validate file object
    if (!file || typeof file !== "object") {
      throw new Error("Invalid file object");
    }

    // For FormData files, we need to handle them differently
    let buffer;
    let fileName;
    let contentType;

    if (file.arrayBuffer && typeof file.arrayBuffer === "function") {
      // Browser File object
      buffer = Buffer.from(await file.arrayBuffer());
      fileName = file.name;
      contentType = file.type;
    } else if (file.stream && typeof file.stream === "function") {
      // FormData file
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      fileName = file.name;
      contentType = file.type;
    } else {
      throw new Error("Unsupported file format");
    }

    if (!buffer || buffer.length === 0) {
      throw new Error("Empty file buffer");
    }

    const bucket = adminStorage.bucket();
    const fileExtension = fileName.split(".").pop() || "bin";
    const uniqueFileName = `${folder}/${uuidv4()}.${fileExtension}`;
    const fileUpload = bucket.file(uniqueFileName);

    // Upload the file
    await fileUpload.save(buffer, {
      metadata: {
        contentType: contentType,
        metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Make the file public
    await fileUpload.makePublic();

    return `https://storage.googleapis.com/${bucket.name}/${uniqueFileName}`;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

// Helper function to upload multiple files
export async function uploadFiles(files, folder) {
  if (!files || files.length === 0) return [];

  try {
    const uploadPromises = files.map((file, index) =>
      uploadFile(file, folder).catch((error) => {
        console.error(`Failed to upload file ${index}:`, error);
        throw error;
      })
    );

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error("Error uploading files:", error);
    throw error;
  }
}

// Create a new post
export async function createPost(postData, user) {
  try {
    console.log("Creating post with data:", {
      title: postData.title,
      content: postData.content,
      hasImages: postData.images?.length > 0,
      hasVideos: postData.videos?.length > 0,
      userId: user.id,
    });

    // Validate required fields
    if (!user?.id) {
      return { success: false, error: "User ID is required" };
    }

    if (!postData.title?.trim() && !postData.content?.trim()) {
      return { success: false, error: "Title or content is required" };
    }

    // Generate slug from title
    const slug =
      slugify(postData.title || "post", {
        lower: true,
        strict: true, // removes special characters
      }) || "post";

    // Initialize media URLs
    let imageUrls = [];
    let videoUrls = [];

    try {
      // Upload images
      if (Array.isArray(postData.images) && postData.images.length > 0) {
        console.log(`Uploading ${postData.images.length} images...`);
        imageUrls = await uploadFiles(postData.images, "posts/images");
        console.log("Images uploaded successfully:", imageUrls.length);
      }

      // Upload videos
      if (Array.isArray(postData.videos) && postData.videos.length > 0) {
        console.log(`Uploading ${postData.videos.length} videos...`);
        videoUrls = await uploadFiles(postData.videos, "posts/videos");
        console.log("Videos uploaded successfully:", videoUrls.length);
      }
    } catch (uploadError) {
      console.error("File upload failed:", uploadError);
      return {
        success: false,
        error: `Failed to upload media files: ${uploadError.message}`,
      };
    }

    // Prepare post document
    const now = new Date();
    const postDoc = {
      title: postData.title?.trim() || "",
      content: postData.content?.trim() || "",
      userRef: adminDb.collection("users").doc(user.id),
      images: imageUrls,
      videos: videoUrls,
      tags: Array.isArray(postData.tags) ? postData.tags.filter((tag) => tag && tag.trim()) : [],
      location: postData.location?.trim() || "",
      likes: 0,
      upvotes: 0,
      downvotes: 0,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };

    console.log("Saving post to Firestore...");

    // Generate a Firestore auto-ID (for uniqueness)
    const autoId = adminDb.collection("posts").doc().id;
    const customId = `${slug}-${autoId}`;

    // Save document with custom ID
    await adminDb.collection("posts").doc(customId).set(postDoc);

    console.log("Post saved with ID:", customId);

    // Response object
    const responsePost = {
      id: customId,
      title: postDoc.title,
      content: postDoc.content,
      images: postDoc.images,
      videos: postDoc.videos,
      tags: postDoc.tags,
      location: postDoc.location,
      likes: postDoc.likes,
      upvotes: postDoc.upvotes,
      downvotes: postDoc.downvotes,
      isArchived: postDoc.isArchived,
      createdAt: postDoc.createdAt.toISOString(),
      updatedAt: postDoc.updatedAt.toISOString(),
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        photoURL: user.photoURL,
        profileImage: user.profileImage,
      },
    };

    return {
      success: true,
      postId: customId,
      post: responsePost,
    };
  } catch (error) {
    console.error("Error creating post:", error);
    return {
      success: false,
      error: error.message || "Failed to create post. Please try again.",
    };
  }
}

// Edit a post
export async function editPost(postId, postData, user) {
  try {
    console.log("Editing post with data:", {
      postId,
      title: postData.title,
      content: postData.content,
      hasImages: postData.images?.length > 0,
      hasVideos: postData.videos?.length > 0,
      userId: user.id,
    });

    // Validate required fields
    if (!user?.id) {
      return {
        success: false,
        error: "User ID is required",
      };
    }

    if (!postId) {
      return {
        success: false,
        error: "Post ID is required",
      };
    }

    if (!postData.title?.trim() && !postData.content?.trim()) {
      return {
        success: false,
        error: "Title or content is required",
      };
    }

    // Get the existing post to verify ownership and get current media
    const postRef = adminDb.collection("posts").doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return {
        success: false,
        error: "Post not found",
      };
    }

    const existingPost = postDoc.data();
    const existingUserRef = existingPost.userRef;

    // Check if the user owns this post
    if (existingUserRef.id !== user.id) {
      return {
        success: false,
        error: "You can only edit your own posts",
      };
    }

    // Initialize media URLs with existing ones
    let imageUrls = existingPost.images || [];
    let videoUrls = existingPost.videos || [];

    try {
      // Handle new image uploads if present
      if (postData.newImages && Array.isArray(postData.newImages) && postData.newImages.length > 0) {
        console.log(`Uploading ${postData.newImages.length} new images...`);
        const newImageUrls = await uploadFiles(postData.newImages, "posts/images");
        imageUrls = [...imageUrls, ...newImageUrls];
        console.log("New images uploaded successfully:", newImageUrls.length);
      }

      // Handle new video uploads if present
      if (postData.newVideos && Array.isArray(postData.newVideos) && postData.newVideos.length > 0) {
        console.log(`Uploading ${postData.newVideos.length} new videos...`);
        const newVideoUrls = await uploadFiles(postData.newVideos, "posts/videos");
        videoUrls = [...videoUrls, ...newVideoUrls];
        console.log("New videos uploaded successfully:", newVideoUrls.length);
      }

      // Handle removed images
      if (postData.removedImages && Array.isArray(postData.removedImages) && postData.removedImages.length > 0) {
        console.log(`Removing ${postData.removedImages.length} images...`);
        imageUrls = imageUrls.filter((url) => !postData.removedImages.includes(url));

        // TODO: Delete files from storage if needed
        // for (const imageUrl of postData.removedImages) {
        //   await deleteFileFromStorage(imageUrl);
        // }
      }

      // Handle removed videos
      if (postData.removedVideos && Array.isArray(postData.removedVideos) && postData.removedVideos.length > 0) {
        console.log(`Removing ${postData.removedVideos.length} videos...`);
        videoUrls = videoUrls.filter((url) => !postData.removedVideos.includes(url));

        // TODO: Delete files from storage if needed
        // for (const videoUrl of postData.removedVideos) {
        //   await deleteFileFromStorage(videoUrl);
        // }
      }
    } catch (uploadError) {
      console.error("File upload failed:", uploadError);
      return {
        success: false,
        error: `Failed to upload media files: ${uploadError.message}`,
      };
    }

    // Prepare updated post document
    const now = new Date();
    const updateDoc = {
      title: postData.title?.trim() || "",
      content: postData.content?.trim() || "",
      images: imageUrls,
      videos: videoUrls,
      tags: Array.isArray(postData.tags) ? postData.tags.filter((tag) => tag && tag.trim()) : [],
      location: postData.location?.trim() || "",
      updatedAt: now,
    };

    console.log("Updating post in Firestore...");
    await postRef.update(updateDoc);
    console.log("Post updated successfully");

    // Create a clean response object
    const responsePost = {
      id: postId,
      title: updateDoc.title,
      content: updateDoc.content,
      images: updateDoc.images,
      videos: updateDoc.videos,
      tags: updateDoc.tags,
      location: updateDoc.location,
      likes: existingPost.likes || 0,
      upvotes: existingPost.upvotes || 0,
      downvotes: existingPost.downvotes || 0,
      isArchived: existingPost.isArchived || false,
      createdAt: existingPost.createdAt?.toISOString() || now.toISOString(),
      updatedAt: updateDoc.updatedAt.toISOString(),
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        photoURL: user.photoURL,
        profileImage: user.profileImage,
      },
    };

    // Revalidate the posts page to show the updated post
    revalidatePath("/");

    return {
      success: true,
      postId: postId,
      post: responsePost,
    };
  } catch (error) {
    console.error("Error editing post:", error);
    return {
      success: false,
      error: error.message || "Failed to edit post. Please try again.",
    };
  }
}

// Detete a post
export async function deletePost(postId, userId) {
  try {
    if (!postId || !userId) {
      return {
        success: false,
        error: "Post ID & User ID are required",
      };
    }

    const docRef = adminDb.collection("posts").doc(postId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return {
        success: false,
        error: "Post not found",
      };
    }

    const postData = snapshot.data();

    if (!postData?.userRef) {
      return {
        success: false,
        error: "Invalid post: no user reference",
      };
    }

    // ✅ Create user reference
    const userRef = adminDb.collection("users").doc(userId);

    // ✅ Compare using Firestore's isEqual
    if (!postData.userRef.isEqual(userRef)) {
      return {
        success: false,
        error: "You are not authorized to delete this post",
      };
    }

    // Delete the post
    await docRef.delete();

    // Revalidate posts page
    revalidatePath("/my-posts");

    return { success: true };
  } catch (error) {
    console.error("Error deleting post:", error);
    return {
      success: false,
      error: error.message || "Failed to delete post. Please try again.",
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

    const posts = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();

        // 🔗 Resolve user reference
        let user = {};
        if (data.userRef) {
          try {
            const userSnap = await data.userRef.get();
            if (userSnap.exists) {
              user = { id: userSnap.id, ...userSnap.data() };
            }
          } catch (err) {
            console.error(`Failed to fetch user for post ${doc.id}:`, err);
          }
        }

        // Count comments
        const commentsSnapshot = await adminDb.collection("posts").doc(doc.id).collection("comments").get();

        return {
          id: doc.id,
          title: data.title || "",
          content: data.content || "",
          createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
          upvotes: data.upvotes || 0,
          downvotes: data.downvotes || 0,
          likes: data.likes || 0,
          user,
          images: data.images || [],
          videos: data.videos || [],
          tags: data.tags || [],
          commentsCount: commentsSnapshot.size,
        };
      })
    );

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

    // 🔗 Resolve user reference if it exists
    let user = {};
    if (postData.userRef) {
      try {
        const userSnap = await postData.userRef.get();
        if (userSnap.exists) {
          user = { id: userSnap.id, ...userSnap.data() };
        }
      } catch (err) {
        console.error(`Failed to fetch user for post ${doc.id}:`, err);
      }
    }

    // ✅ Return normalized post object
    return {
      success: true,
      post: {
        id: doc.id,
        title: postData.title || "",
        content: postData.content || "",
        createdAt: postData.createdAt?.toDate?.().toISOString?.() || new Date().toISOString(),
        updatedAt: postData.updatedAt?.toDate?.().toISOString?.() || new Date().toISOString(),
        upvotes: postData.upvotes || 0,
        downvotes: postData.downvotes || 0,
        likes: postData.likes || 0,
        tags: postData.tags || [],
        images: postData.images || [],
        videos: postData.videos || [],
        user, // ✅ populated user object
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

// Get posts by a specific user
export async function getUserPosts(userId, limit = 10, lastPostId = null) {
  try {
    console.log("Getting user posts for userId:", userId);

    if (!userId) {
      return {
        posts: [],
        hasMore: false,
        lastPostId: null,
        error: "User ID is required",
      };
    }

    // Create user reference (if stored as DocumentReference in posts)
    const userRef = adminDb.collection("users").doc(userId);

    let query = adminDb
      .collection("posts")
      .where("userRef", "==", userRef) // ⚡ if you stored it as string, change this line
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (lastPostId) {
      const lastDoc = await adminDb.collection("posts").doc(lastPostId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc.get("createdAt")); // ✅ match ordering field
      }
    }

    const snapshot = await query.get();
    console.log("Found user posts:", snapshot.size);

    const posts = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();

        // Resolve user (if needed)
        let user = {};
        if (data.userRef) {
          try {
            if (typeof data.userRef.get === "function") {
              // It's a DocumentReference
              const userSnap = await data.userRef.get();
              if (userSnap.exists) {
                user = { id: userSnap.id, ...userSnap.data() };
              }
            } else {
              // It's a string path like "/users/abc123"
              const userIdFromPath = data.userRef.replace("/users/", "");
              const userSnap = await adminDb.collection("users").doc(userIdFromPath).get();
              if (userSnap.exists) {
                user = { id: userSnap.id, ...userSnap.data() };
              }
            }
          } catch (err) {
            console.error(`Failed to fetch user for post ${doc.id}:`, err);
          }
        }

        // Count comments
        const commentsSnapshot = await adminDb.collection("posts").doc(doc.id).collection("comments").get();

        return {
          id: doc.id,
          title: data.title || "",
          content: data.content || "",
          createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
          upvotes: data.upvotes || 0,
          downvotes: data.downvotes || 0,
          likes: data.likes || 0,
          user,
          images: data.images || [],
          videos: data.videos || [],
          tags: data.tags || [],
          commentsCount: commentsSnapshot.size,
        };
      })
    );

    const hasMore = snapshot.size === limit;
    const newLastPostId = posts.length > 0 ? posts[posts.length - 1].id : null;

    console.log("User posts loaded:", posts.length);

    return {
      posts,
      hasMore, // ✅ fixed
      lastPostId: newLastPostId,
    };
  } catch (error) {
    console.error("Error getting user posts:", error);
    return {
      posts: [],
      hasMore: false,
      lastPostId: null,
      error: error.message,
    };
  }
}

// Get posts liked by a specific user
// lib/actions/postActions.js
// This requires a composite index on the likes collection
export async function getUserLikedPostsEfficient(userId, limit = 10, lastLikedAt = null) {
  try {
    console.log("Getting liked posts for userId (efficient):", userId);

    if (!userId) {
      return {
        likedPosts: [],
        hasMore: false,
        lastLikedAt: null,
        error: "User ID is required",
      };
    }

    const userRef = adminDb.collection("users").doc(userId);

    // Use collectionGroup to query across all likes subcollections
    let query = adminDb
      .collectionGroup("likes")
      .where("userRef", "==", userRef)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (lastLikedAt) {
      query = query.startAfter(new Date(lastLikedAt));
    }

    const likesSnapshot = await query.get();
    console.log("Found user likes:", likesSnapshot.size);

    const likedPostsData = await Promise.all(
      likesSnapshot.docs.map(async (likeDoc) => {
        const likeData = likeDoc.data();

        // Extract post ID from the document path
        // Path structure: posts/{postId}/likes/{likeId}
        const postId = likeDoc.ref.parent.parent.id;

        try {
          // Get the post document
          const postDoc = await adminDb.collection("posts").doc(postId).get();

          if (!postDoc.exists) {
            console.warn(`Post ${postId} not found for like ${likeDoc.id}`);
            return null;
          }

          const postData = postDoc.data();

          // Resolve user who created the post
          let postUser = {};
          if (postData.userRef) {
            try {
              if (typeof postData.userRef.get === "function") {
                const userSnap = await postData.userRef.get();
                if (userSnap.exists) {
                  postUser = { id: userSnap.id, ...userSnap.data() };
                }
              } else {
                const userIdFromPath = postData.userRef.replace("/users/", "");
                const userSnap = await adminDb.collection("users").doc(userIdFromPath).get();
                if (userSnap.exists) {
                  postUser = { id: userSnap.id, ...userSnap.data() };
                }
              }
            } catch (err) {
              console.error(`Failed to fetch user for post ${postId}:`, err);
            }
          }

          // Count comments
          const commentsSnapshot = await adminDb.collection("posts").doc(postId).collection("comments").get();

          return {
            likeId: likeDoc.id,
            likedAt: likeData.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
            post: {
              id: postId,
              title: postData.title || "",
              content: postData.content || "",
              createdAt: postData.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
              updatedAt: postData.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
              upvotes: postData.upvotes || 0,
              downvotes: postData.downvotes || 0,
              likes: postData.likes || 0,
              user: postUser,
              images: postData.images || [],
              videos: postData.videos || [],
              tags: postData.tags || [],
              commentsCount: commentsSnapshot.size,
            },
          };
        } catch (error) {
          console.error(`Error processing like ${likeDoc.id} for post ${postId}:`, error);
          return null;
        }
      })
    );

    // Filter out null results
    const validLikedPosts = likedPostsData.filter((item) => item !== null);

    const hasMore = likesSnapshot.size === limit;
    const newLastLikedAt = validLikedPosts.length > 0 ? validLikedPosts[validLikedPosts.length - 1].likedAt : null;

    console.log("Liked posts loaded:", validLikedPosts.length);

    return {
      likedPosts: validLikedPosts,
      hasMore,
      lastLikedAt: newLastLikedAt,
    };
  } catch (error) {
    console.error("Error getting user liked posts (efficient):", error);
    return {
      likedPosts: [],
      hasMore: false,
      lastLikedAt: null,
      error: error.message,
    };
  }
}

// lib/actions/postActions.js
// Fetch posts where a user has commented
export async function getUserCommentedPostsEfficient(userId, limit = 10, lastCommentedAt = null) {
  try {
    if (!userId) {
      return {
        commentedPosts: [],
        hasMore: false,
        lastCommentedAt: null,
        error: "User ID is required",
      };
    }

    const userRef = adminDb.collection("users").doc(userId);

    // Use collectionGroup to query across all comments subcollections
    let query = adminDb
      .collectionGroup("comments")
      .where("userRef", "==", userRef)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (lastCommentedAt) {
      query = query.startAfter(new Date(lastCommentedAt));
    }

    const commentsSnapshot = await query.get();

    const commentedPostsData = await Promise.all(
      commentsSnapshot.docs.map(async (commentDoc) => {
        const commentData = commentDoc.data();
        const postId = commentDoc.ref.parent.parent.id; // posts/{postId}/comments/{commentId}

        try {
          const postDoc = await adminDb.collection("posts").doc(postId).get();
          if (!postDoc.exists) return null;

          const postData = postDoc.data();

          let postUser = {};
          if (postData.userRef) {
            const userSnap = await postData.userRef.get();
            if (userSnap.exists) postUser = { id: userSnap.id, ...userSnap.data() };
          }

          const commentsSnapshotForCount = await adminDb.collection("posts").doc(postId).collection("comments").get();

          return {
            commentId: commentDoc.id,
            commentedAt: commentData.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
            post: {
              id: postId,
              title: postData.title || "",
              content: postData.content || "",
              createdAt: postData.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
              updatedAt: postData.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
              upvotes: postData.upvotes || 0,
              downvotes: postData.downvotes || 0,
              likes: postData.likes || 0,
              user: postUser,
              images: postData.images || [],
              videos: postData.videos || [],
              tags: postData.tags || [],
              commentsCount: commentsSnapshotForCount.size,
            },
          };
        } catch (err) {
          console.error(`Failed processing comment ${commentDoc.id} for post ${postId}:`, err);
          return null;
        }
      })
    );

    const validCommentedPosts = commentedPostsData.filter((item) => item !== null);
    const hasMore = commentsSnapshot.size === limit;
    const newLastCommentedAt =
      validCommentedPosts.length > 0 ? validCommentedPosts[validCommentedPosts.length - 1].commentedAt : null;

    return {
      commentedPosts: validCommentedPosts,
      hasMore,
      lastCommentedAt: newLastCommentedAt,
    };
  } catch (error) {
    console.error("Error fetching user commented posts:", error);
    return {
      commentedPosts: [],
      hasMore: false,
      lastCommentedAt: null,
      error: error.message,
    };
  }
}

// Get posts saved by a specific user
export async function getUserSavedPostsEfficient(userId, limit = 10, lastSavedAt = null) {
  try {
    console.log("Getting saved posts for userId:", userId);

    if (!userId) {
      return {
        savedPosts: [],
        hasMore: false,
        lastSavedAt: null,
        error: "User ID is required",
      };
    }

    const userRef = adminDb.collection("users").doc(userId);

    // Query across all saves subcollections
    let query = adminDb
      .collectionGroup("saves")
      .where("userRef", "==", userRef)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (lastSavedAt) {
      query = query.startAfter(new Date(lastSavedAt));
    }

    const savesSnapshot = await query.get();
    console.log("Found user saves:", savesSnapshot.size);

    const savedPostsData = await Promise.all(
      savesSnapshot.docs.map(async (saveDoc) => {
        const saveData = saveDoc.data();

        // Extract post ID from path: posts/{postId}/saves/{saveId}
        const postId = saveDoc.ref.parent.parent.id;

        try {
          const postDoc = await adminDb.collection("posts").doc(postId).get();
          if (!postDoc.exists) {
            console.warn(`Post ${postId} not found for save ${saveDoc.id}`);
            return null;
          }

          const postData = postDoc.data();

          // Resolve post author
          let postUser = {};
          if (postData.userRef) {
            try {
              if (typeof postData.userRef.get === "function") {
                const userSnap = await postData.userRef.get();
                if (userSnap.exists) {
                  postUser = { id: userSnap.id, ...userSnap.data() };
                }
              } else {
                const userIdFromPath = postData.userRef.replace("/users/", "");
                const userSnap = await adminDb.collection("users").doc(userIdFromPath).get();
                if (userSnap.exists) {
                  postUser = { id: userSnap.id, ...userSnap.data() };
                }
              }
            } catch (err) {
              console.error(`Failed to fetch user for post ${postId}:`, err);
            }
          }

          // Count comments
          const commentsSnapshot = await adminDb.collection("posts").doc(postId).collection("comments").get();

          return {
            saveId: saveDoc.id,
            savedAt: saveData.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
            post: {
              id: postId,
              title: postData.title || "",
              content: postData.content || "",
              createdAt: postData.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
              updatedAt: postData.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
              upvotes: postData.upvotes || 0,
              downvotes: postData.downvotes || 0,
              likes: postData.likes || 0,
              user: postUser,
              images: postData.images || [],
              videos: postData.videos || [],
              tags: postData.tags || [],
              commentsCount: commentsSnapshot.size,
            },
          };
        } catch (error) {
          console.error(`Error processing save ${saveDoc.id} for post ${postId}:`, error);
          return null;
        }
      })
    );

    const validSavedPosts = savedPostsData.filter((item) => item !== null);

    return {
      savedPosts: validSavedPosts,
      hasMore: savesSnapshot.size === limit,
      lastSavedAt: validSavedPosts.length > 0 ? validSavedPosts[validSavedPosts.length - 1].savedAt : null,
    };
  } catch (error) {
    console.error("Error getting user saved posts:", error);
    return {
      savedPosts: [],
      hasMore: false,
      lastSavedAt: null,
      error: error.message,
    };
  }
}

// Search posts by title and content
export async function searchPosts(query, limit = 10) {
  try {
    if (!query?.trim()) {
      return {
        success: false,
        error: "Search query is required",
        posts: [],
      };
    }

    const searchQuery = query.toLowerCase().trim();

    // Fetch recent posts first (Firestore can't do full-text search)
    const snapshot = await adminDb
      .collection("posts")
      .orderBy("createdAt", "desc")
      .limit(100) // fetch a batch for client-side filtering
      .get();

    const allPosts = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // 🔗 Resolve user reference
      let user = {};
      if (data.userRef) {
        try {
          const userSnap = await data.userRef.get();
          if (userSnap.exists) {
            user = { id: userSnap.id, ...userSnap.data() };
          }
        } catch (err) {
          console.error(`Failed to fetch user for post ${doc.id}:`, err);
        }
      }

      const post = {
        id: doc.id,
        title: data.title || "",
        content: data.content || "",
        tags: data.tags || [],
        images: data.images || [],
        videos: data.videos || [],
        likes: data.likes || 0,
        upvotes: data.upvotes || 0,
        downvotes: data.downvotes || 0,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
        user, // ✅ populated user object
      };

      allPosts.push(post);
    }

    // 🔍 Client-side filtering
    const filteredPosts = allPosts.filter((post) => {
      const titleMatch = post.title.toLowerCase().includes(searchQuery);
      const contentMatch = post.content.toLowerCase().includes(searchQuery);
      const tagMatch = post.tags.some((tag) => tag.toLowerCase().includes(searchQuery));

      return titleMatch || contentMatch || tagMatch;
    });

    // 📊 Sort by relevance (title > content > date)
    const sortedPosts = filteredPosts.sort((a, b) => {
      const aTitleMatch = a.title.toLowerCase().includes(searchQuery);
      const bTitleMatch = b.title.toLowerCase().includes(searchQuery);

      if (aTitleMatch && !bTitleMatch) return -1;
      if (!aTitleMatch && bTitleMatch) return 1;

      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // 🎯 Limit results
    const limitedPosts = sortedPosts.slice(0, limit);

    return {
      success: true,
      posts: limitedPosts,
      totalResults: sortedPosts.length,
      query: searchQuery,
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

// Get search suggestions (limited results for dropdown)
export async function getSearchSuggestions(query) {
  try {
    const result = await searchPosts(query, 5); // Limit to 5 for dropdown
    console.log(result);

    return result;
  } catch (error) {
    console.error("Error getting search suggestions:", error);
    return {
      success: false,
      error: "Failed to get search suggestions",
      posts: [],
    };
  }
}

// Like/Unlike a post
export async function togglePostLike(postId, user, isLiked) {
  try {
    if (!postId || !user?.id) {
      return {
        success: false,
        error: "Post ID and user info are required",
      };
    }

    const postRef = adminDb.collection("posts").doc(postId);
    const likesRef = postRef.collection("likes"); // 🔗 likes subcollection
    const likeDocRef = likesRef.doc(user.id);

    // Ensure post exists
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return {
        success: false,
        error: "Post not found",
      };
    }

    const likeDoc = await likeDocRef.get();

    if (isLiked && likeDoc.exists) {
      // 👎 Unlike → remove like doc
      await likeDocRef.delete();
    } else if (!isLiked && !likeDoc.exists) {
      // 👍 Like → add like doc with reference to users/{id}
      await likeDocRef.set({
        userRef: adminDb.collection("users").doc(user.id), // 🔗 reference to user doc
        createdAt: new Date(),
      });
    }

    // 🔢 Count likes = number of docs in subcollection
    const likesSnapshot = await likesRef.get();
    const likesCount = likesSnapshot.size;

    // Update cached likes count on post doc
    await postRef.update({ likes: likesCount });

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
// Check if a user has liked a specific post
export async function checkUserLike(postId, userId) {
  try {
    if (!postId || !userId) {
      return false;
    }

    const postRef = adminDb.collection("posts").doc(postId);
    const likeRef = postRef.collection("likes").doc(userId);

    const likeDoc = await likeRef.get();

    if (!likeDoc.exists) {
      return false;
    }

    const data = likeDoc.data();

    // ✅ Ensure it has a userRef pointing to the correct user
    if (data?.userRef) {
      return data.userRef.id === userId;
    }

    // Fallback: if doc exists but no userRef, still consider it liked
    // return true;
    return likeDoc.exists;
  } catch (error) {
    console.error("Error checking user like:", error);
    return false;
  }
}

// Toggle upvote/downvote for a post (atomic version)
export async function togglePostVote(postId, user, voteType) {
  console.log(`Toggling vote for post ID: ${postId}, voteType: ${voteType}, user: ${JSON.stringify(user)}`);

  if (!postId || !user?.id || !voteType) {
    return {
      success: false,
      error: "Post ID, user info, and vote type are required",
    };
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

      // Remove old vote if it exists
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
          userRef: adminDb.collection("users").doc(user.id), // 🔗 reference to user
          createdAt: new Date(),
        });
        upvotesCount += 1;
        newVoteStatus = "up";
      } else if (voteType === "down" && currentVote !== "down") {
        transaction.set(downvoteRef, {
          userRef: adminDb.collection("users").doc(user.id), // 🔗 reference to user
          createdAt: new Date(),
        });
        downvotesCount += 1;
        newVoteStatus = "down";
      }

      // Save updated counts atomically
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

// Save/Unsave a post
export async function togglePostSave(postId, user, isSaved) {
  try {
    if (!postId || !user?.id) {
      return {
        success: false,
        error: "Post ID and user info are required",
      };
    }

    const postRef = adminDb.collection("posts").doc(postId);
    const savesRef = postRef.collection("saves"); // 🔗 saves subcollection
    const saveDocRef = savesRef.doc(user.id);

    // Ensure post exists
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return {
        success: false,
        error: "Post not found",
      };
    }

    const saveDoc = await saveDocRef.get();

    if (isSaved && saveDoc.exists) {
      // 🔄 Unsave → remove save doc
      await saveDocRef.delete();
    } else if (!isSaved && !saveDoc.exists) {
      // 💾 Save → add save doc with reference to users/{id}
      await saveDocRef.set({
        userRef: adminDb.collection("users").doc(user.id), // 🔗 reference to user doc
        createdAt: new Date(),
      });
    }

    // 🔢 Count saves = number of docs in subcollection
    const savesSnapshot = await savesRef.get();
    const savesCount = savesSnapshot.size;

    // Update cached saves count on post doc
    await postRef.update({ saves: savesCount });

    return {
      success: true,
      isSaved: !isSaved,
      savesCount,
    };
  } catch (error) {
    console.error("Error toggling save:", error);
    return {
      success: false,
      error: "Failed to toggle save",
    };
  }
}

// Check if a user has saved a specific post
export async function checkUserSave(postId, userId) {
  try {
    if (!postId || !userId) {
      return false;
    }

    const postRef = adminDb.collection("posts").doc(postId);
    const saveRef = postRef.collection("saves").doc(userId);

    const saveDoc = await saveRef.get();

    if (!saveDoc.exists) {
      return false;
    }

    const data = saveDoc.data();

    // ✅ Ensure it has a userRef pointing to the correct user
    if (data?.userRef) {
      return data.userRef.id === userId;
    }

    // Fallback: if doc exists but no userRef, still consider it saved
    return saveDoc.exists;
  } catch (error) {
    console.error("Error checking user save:", error);
    return false;
  }
}
