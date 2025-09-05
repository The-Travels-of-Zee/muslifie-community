"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Image,
  Video,
  MapPin,
  Hash,
  Smile,
  Plus,
  Camera,
  FileText,
  Globe,
  Users,
  Lock,
  Globe2Icon,
  User,
} from "lucide-react";
import { createPost } from "@/lib/actions/postActions";
import { useAuthStore } from "@/stores/useAuthStore";

const CreatePostModal = ({ handleCloseCreatePost, handleCreatePost }) => {
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    images: [],
    videos: [],
    tags: "",
    location: "",
  });

  const [dragOver, setDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [previewUrls, setPreviewUrls] = useState({ images: [], videos: [] });

  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const objectUrlsRef = useRef(new Set()); // Track all object URLs for cleanup

  const user = useAuthStore((state) => state.user);

  // Cleanup function for object URLs
  const cleanupObjectUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    objectUrlsRef.current.clear();
  }, []);

  // Create preview URL and track it
  const createPreviewUrl = useCallback((file) => {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.add(url);
    return url;
  }, []);

  const handleFileUpload = useCallback(
    (files, type = "image") => {
      const fileArray = Array.from(files);

      // Validate file size (10MB limit for videos, 5MB for images)
      const maxSize = type === "video" ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
      const oversizedFiles = fileArray.filter((file) => file.size > maxSize);

      if (oversizedFiles.length > 0) {
        setError(`Some files are too large. Please use files smaller than ${type === "video" ? "10MB" : "5MB"}.`);
        return;
      }

      // Validate file types
      const validImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      const validVideoTypes = ["video/mp4", "video/webm", "video/mov", "video/avi"];

      const invalidFiles = fileArray.filter((file) => {
        if (type === "image") return !validImageTypes.includes(file.type);
        if (type === "video") return !validVideoTypes.includes(file.type);
        return true;
      });

      if (invalidFiles.length > 0) {
        setError(`Some files have invalid formats. Please use supported ${type} formats.`);
        return;
      }

      // Create preview URLs for new files
      const newPreviewUrls = fileArray.map((file) => createPreviewUrl(file));

      // Add files to state
      setNewPost((prev) => ({
        ...prev,
        [type === "image" ? "images" : "videos"]: [...prev[type === "image" ? "images" : "videos"], ...fileArray],
      }));

      // Update preview URLs
      setPreviewUrls((prev) => ({
        ...prev,
        [type === "image" ? "images" : "videos"]: [...prev[type === "image" ? "images" : "videos"], ...newPreviewUrls],
      }));

      // Clear any previous errors
      setError("");
    },
    [createPreviewUrl]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      setError("");

      const files = e.dataTransfer.files;
      const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
      const videoFiles = Array.from(files).filter((file) => file.type.startsWith("video/"));

      if (imageFiles.length > 0) handleFileUpload(imageFiles, "image");
      if (videoFiles.length > 0) handleFileUpload(videoFiles, "video");
    },
    [handleFileUpload]
  );

  const removeImage = useCallback(
    (index) => {
      // Revoke the object URL
      const urlToRevoke = previewUrls.images[index];
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
        objectUrlsRef.current.delete(urlToRevoke);
      }

      setNewPost((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
      }));

      setPreviewUrls((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
      }));
    },
    [previewUrls.images]
  );

  const removeVideo = useCallback(
    (index) => {
      // Revoke the object URL
      const urlToRevoke = previewUrls.videos[index];
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
        objectUrlsRef.current.delete(urlToRevoke);
      }

      setNewPost((prev) => ({
        ...prev,
        videos: prev.videos.filter((_, i) => i !== index),
      }));

      setPreviewUrls((prev) => ({
        ...prev,
        videos: prev.videos.filter((_, i) => i !== index),
      }));
    },
    [previewUrls.videos]
  );

  const handleSubmit = async () => {
    if (!newPost.content.trim() && !newPost.title.trim()) {
      setError("Please add some content or a title to your post.");
      return;
    }

    if (!user?.id) {
      setError("You must be logged in to create a post.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Parse tags - split by comma and clean up
      const parsedTags = newPost.tags
        .split(/[,\s]+/) // Split by comma or whitespace
        .map((tag) => tag.trim().replace(/^#+/, "")) // Remove # prefix and trim
        .filter((tag) => tag.length > 0) // Remove empty tags
        .map((tag) => tag.toLowerCase()); // Normalize to lowercase

      // Create a clean post data object without circular references
      const postData = {
        title: newPost.title.trim(),
        content: newPost.content.trim(),
        location: newPost.location.trim(),
        tags: parsedTags,
        images: newPost.images, // File objects
        videos: newPost.videos, // File objects
      };

      // Create a clean user object without potential circular references
      const cleanUser = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        photoURL: user.photoURL,
        profileImage: user.profileImage,
      };

      const result = await createPost(postData, cleanUser);

      if (result.success) {
        // Clean up object URLs
        cleanupObjectUrls();

        // Reset form
        setNewPost({
          title: "",
          content: "",
          images: [],
          videos: [],
          tags: "",
          location: "",
        });

        setPreviewUrls({ images: [], videos: [] });

        if (handleCreatePost) {
          // Create a clean post object for the callback
          const cleanPost = {
            id: result.postId,
            title: result.post.title,
            content: result.post.content,
            images: result.post.images,
            videos: result.post.videos,
            tags: result.post.tags,
            likes: result.post.likes,
            upvotes: result.post.upvotes,
            downvotes: result.post.downvotes,
            createdAt: result.post.createdAt,
            updatedAt: result.post.updatedAt,
            user: cleanUser,
          };
          handleCreatePost(cleanPost);
        }

        handleCloseCreatePost();
      } else {
        setError(result.error || "Failed to create post. Please try again.");
      }
    } catch (error) {
      console.error("Error creating post:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = (newPost.content.trim() || newPost.title.trim()) && !isSubmitting;

  // Clean up object URLs on unmount and when files change
  useEffect(() => {
    return () => {
      cleanupObjectUrls();
    };
  }, [cleanupObjectUrls]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Create Post</h2>
          </div>
          <button
            onClick={handleCloseCreatePost}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
              {user?.photoURL || user?.profileImage ? (
                <img
                  src={user.photoURL || user.profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "block";
                  }}
                />
              ) : null}
              <span className="text-xl" style={{ display: user?.photoURL || user?.profileImage ? "none" : "block" }}>
                {user?.profileImage || <User className="w-6 h-6 text-slate-600" />}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">
                {user?.fullName || user?.email?.split("@")[0] || "Anonymous"}
              </h3>
              <div className="flex items-center space-x-2">
                <div className="text-sm text-slate-600 bg-slate-100 border-none rounded-lg px-2 py-1">
                  <span className="flex items-center space-x-1">
                    <Globe2Icon className="w-4 h-4" /> <span>Public</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 px-6 pb-4 overflow-y-auto">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Title Input */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Ask a question"
              value={newPost.title}
              onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
              className="w-full text-xl font-medium placeholder-slate-400 border-none outline-none resize-none bg-transparent"
              disabled={isSubmitting}
              maxLength={200}
            />
          </div>

          {/* Content Textarea */}
          <div className="mb-4">
            <textarea
              placeholder="Ask questions/queries for your next Halal Trip..."
              rows={4}
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              className="w-full text-slate-700 placeholder-slate-400 border-none outline-none resize-none bg-transparent"
              disabled={isSubmitting}
              maxLength={2000}
            />
            <div className="text-right text-xs text-slate-400 mt-1">{newPost.content.length}/2000 characters</div>
          </div>

          {/* Additional Options */}
          <div className="space-y-3">
            {/* Tags */}
            <div className="flex items-center space-x-3 p-3 bg-slate-50/50 rounded-lg">
              <Hash className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Add tags (separate with commas: travel, islam, halal)"
                value={newPost.tags}
                onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
                className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder-slate-400"
                disabled={isSubmitting}
                maxLength={200}
              />
            </div>
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-xl p-6 mb-4 transition-all ${
              dragOver ? "border-primary bg-primary/5 scale-105" : "border-slate-200 hover:border-slate-300"
            } ${isSubmitting ? "opacity-50 pointer-events-none" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (!isSubmitting) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="text-center">
              <div className="flex justify-center space-x-4 mb-4">
                <Camera className="w-8 h-8 text-slate-400" />
                <Video className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 mb-2">Drag and drop photos or videos, or</p>
              <div className="flex justify-center space-x-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Image className="w-4 h-4 inline mr-2" />
                  Add Photos
                </button>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Video className="w-4 h-4 inline mr-2" />
                  Add Videos
                </button>
              </div>
            </div>
          </div>

          {/* Image Preview */}
          {newPost.images.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-slate-700 mb-2">Images ({newPost.images.length})</h4>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {newPost.images.map((file, index) => (
                  <div key={`image-${index}-${file.name}`} className="relative group">
                    <img
                      src={previewUrls.images[index]}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      disabled={isSubmitting}
                      className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      {file.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Video Preview */}
          {newPost.videos.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-slate-700 mb-2">Videos ({newPost.videos.length})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {newPost.videos.map((file, index) => (
                  <div key={`video-${index}-${file.name}`} className="relative group">
                    <video src={previewUrls.videos[index]} className="w-full h-32 object-cover rounded-lg" controls />
                    <button
                      type="button"
                      onClick={() => removeVideo(index)}
                      disabled={isSubmitting}
                      className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      {file.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50/50 border-t border-slate-200/50">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCloseCreatePost}
              disabled={isSubmitting}
              className="px-6 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid}
              className={`px-8 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                isValid
                  ? "bg-primary text-white hover:bg-primary/90 hover:scale-105"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Post</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          onChange={(e) => handleFileUpload(e.target.files, "image")}
          className="hidden"
          disabled={isSubmitting}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/mov,video/avi"
          multiple
          onChange={(e) => handleFileUpload(e.target.files, "video")}
          className="hidden"
          disabled={isSubmitting}
        />
      </div>
    </div>
  );
};

export default CreatePostModal;
