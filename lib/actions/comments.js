// @/lib/actions/comments.js
import { allPosts } from "@/constants";

// Mock current user - replace with actual auth
const getCurrentUser = () => ({
  name: "Shaheer Mansoor",
  profileImage: "👤",
  joinDate: new Date().toISOString().split("T")[0],
});

// Generate unique ID (replace with Firebase auto-generated ID later)
const generateId = () => Math.floor(Math.random() * 1000000);

export async function addComment(postId, content) {
  try {
    // Validate input
    if (!content || !content.trim()) {
      throw new Error("Comment content is required");
    }

    // Find the post
    const post = allPosts.find((p) => p.id === postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Create new comment
    const newComment = {
      id: generateId(),
      user: getCurrentUser(),
      content: content.trim(),
      createdAt: new Date().toISOString(),
      replies: [],
    };

    // Add comment to post
    post.comments = post.comments || [];
    post.comments.push(newComment);

    // In Firebase, you would do:
    // const commentRef = await addDoc(collection(db, 'comments'), {
    //   postId,
    //   content: content.trim(),
    //   userId: currentUser.uid,
    //   createdAt: serverTimestamp(),
    //   replies: []
    // });

    return {
      success: true,
      comment: newComment,
    };
  } catch (error) {
    console.error("Error adding comment:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function addReply(postId, commentId, content) {
  try {
    // Validate input
    if (!content || !content.trim()) {
      throw new Error("Reply content is required");
    }

    // Find the post
    const post = allPosts.find((p) => p.id === postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Find the comment
    const comment = post.comments?.find((c) => c.id === commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    // Create new reply
    const newReply = {
      id: generateId(),
      user: getCurrentUser(),
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    // Add reply to comment
    comment.replies = comment.replies || [];
    comment.replies.push(newReply);

    // In Firebase, you would do:
    // const replyRef = await addDoc(collection(db, 'replies'), {
    //   postId,
    //   commentId,
    //   content: content.trim(),
    //   userId: currentUser.uid,
    //   createdAt: serverTimestamp()
    // });

    return {
      success: true,
      reply: newReply,
    };
  } catch (error) {
    console.error("Error adding reply:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function getComments(postId) {
  try {
    const post = allPosts.find((p) => p.id === postId);
    if (!post) {
      throw new Error("Post not found");
    }

    return {
      success: true,
      comments: post.comments || [],
    };
  } catch (error) {
    console.error("Error getting comments:", error);
    return {
      success: false,
      error: error.message,
      comments: [],
    };
  }
}

export async function createPost(postData) {
  try {
    // Validate required fields
    if (!postData.content?.trim() && !postData.title?.trim()) {
      throw new Error("Post content or title is required");
    }

    // Create new post
    const newPost = {
      id: generateId(),
      user: getCurrentUser(),
      createdAt: new Date().toISOString(),
      title: postData.title?.trim() || "",
      content: postData.content?.trim() || "",
      images: postData.images || [],
      videos: postData.videos || [],
      location: postData.location?.trim() || "",
      tags: postData.tags
        ? postData.tags
            .split(" ")
            .filter((tag) => tag.startsWith("#") && tag.length > 1)
            .map((tag) => tag.toLowerCase())
        : [],
      upvotes: 0,
      downvotes: 0,
      comments: [],
      privacy: postData.privacy || "public",
    };

    // Add to allPosts array
    allPosts.unshift(newPost); // Add to beginning

    // In Firebase, you would do:
    // const postRef = await addDoc(collection(db, 'posts'), {
    //   ...newPost,
    //   userId: currentUser.uid,
    //   createdAt: serverTimestamp()
    // });

    return {
      success: true,
      post: newPost,
    };
  } catch (error) {
    console.error("Error creating post:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
