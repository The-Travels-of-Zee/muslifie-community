"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import {
  User,
  Mail,
  Image as ImageIcon,
  Lock,
  Trash2,
  X,
  Phone,
  MapPin,
  FileText,
  Camera,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { updateUserProfile, deleteUserAccount, getUserStatus, uploadProfileImage } from "@/lib/actions/authActions";
import { useAuthStore } from "@/stores/useAuthStore";

export default function ImprovedSettingsPage() {
  const { user, setUser } = useAuthStore();
  const [currentUser, setCurrentUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  const [activeTab, setActiveTab] = useState("profile");
  const [isChanged, setIsChanged] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    bio: "",
    city: "",
  });

  const fileInputRef = useRef(null);
  const router = useRouter();

  // Sync `user` → `currentUser`
  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  // 👉 Compare formData with currentUser
  useEffect(() => {
    if (!currentUser) return;

    const hasChanged =
      formData.fullName !== (currentUser.fullName || "") ||
      formData.phone !== (currentUser.phone || "") ||
      formData.bio !== (currentUser.bio || "") ||
      formData.city !== (currentUser.city || "");

    setIsChanged(hasChanged);
  }, [formData, currentUser]);

  // Sync `currentUser` → `formData`
  useEffect(() => {
    if (currentUser) {
      setFormData({
        fullName: currentUser.fullName || "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
        bio: currentUser.bio || "",
        city: currentUser.city || "",
      });
      setProfileImage(currentUser.profileImage || null);
    }
  }, [currentUser]);

  // Show notification
  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Handle text field changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 👉 Handle profile image upload (separate API)
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      showNotification("Image size must be less than 5MB", "error");
      return;
    }
    if (!file.type.startsWith("image/")) {
      showNotification("Please select a valid image file", "error");
      return;
    }

    setIsUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("image", file);

      const result = await uploadProfileImage(uploadFormData);

      if (result.success) {
        setProfileImage(result.user?.profileImage || null);
        if (result.user) setUser(result.user);

        showNotification("Profile image updated successfully!");
      } else {
        showNotification(result.error, "error");
      }
    } catch (error) {
      console.error(error);
      showNotification("Failed to upload image", "error");
    } finally {
      setIsUploading(false);
    }
  };

  // 👉 Handle text profile update (separate API)
  const handleSaveProfile = () => {
    startTransition(async () => {
      try {
        const submitFormData = new FormData();
        submitFormData.append("fullName", formData.fullName);
        submitFormData.append("phone", formData.phone);
        submitFormData.append("bio", formData.bio);
        submitFormData.append("city", formData.city);

        // Include profileImage (if exists) but don’t upload new file here
        if (profileImage && typeof profileImage === "string") {
          submitFormData.append("profileImage", profileImage);
        }

        const result = await updateUserProfile(submitFormData);

        if (result.success) {
          if (result.user) {
            setUser(result.user);
          } else {
            // Merge manually if no user returned
            setUser((prev) => ({
              ...prev,
              fullName: formData.fullName,
              phone: formData.phone,
              bio: formData.bio,
              city: formData.city,
              profileImage: profileImage || prev.profileImage,
            }));
          }

          showNotification("Profile updated successfully!");
        } else {
          showNotification(result.error, "error");
        }
      } catch (error) {
        console.error(error);
        showNotification("Failed to update profile", "error");
      }
    });
  };

  // Handle account deletion
  const handleDeleteAccount = () => {
    startTransition(async () => {
      try {
        const result = await deleteUserAccount(currentUser.id);

        if (result.success) {
          // Optional: clear user state
          setUser(null);

          // Close modal
          setShowDeleteModal(false);

          // Redirect to home
          router.push("/");
        } else {
          showNotification(result.error || "Failed to delete account", "error");
          setShowDeleteModal(false);
        }
      } catch (error) {
        console.error(error);
        showNotification("Failed to delete account", "error");
        setShowDeleteModal(false);
      }
    });
  };

  const NotificationBar = ({ notification }) => {
    if (!notification) return null;

    const bgColor = notification.type === "error" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200";
    const textColor = notification.type === "error" ? "text-red-800" : "text-green-800";
    const iconColor = notification.type === "error" ? "text-red-500" : "text-green-500";
    const Icon = notification.type === "error" ? AlertCircle : Check;

    return (
      <div className={`fixed top-4 right-4 z-50 ${bgColor} border rounded-lg p-4 shadow-lg max-w-md`}>
        <div className="flex items-center space-x-3">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <p className={`text-sm font-medium ${textColor}`}>{notification.message}</p>
          <button onClick={() => setNotification(null)} className={`ml-auto ${textColor} hover:opacity-70`}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationBar notification={notification} />

      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
          <p className="text-gray-600">Manage your profile information and account preferences</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex space-x-8 px-6 border-b border-gray-300">
            <button
              onClick={() => setActiveTab("profile")}
              className={`py-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "profile"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Profile Information
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`py-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "security"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Security
            </button>
            <button
              onClick={() => setActiveTab("danger")}
              className={`py-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "danger"
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Danger Zone
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-8">
                {/* Profile Photo Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Photo</h3>
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      {profileImage ? (
                        <img
                          src={profileImage}
                          alt="Profile"
                          className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center shadow-sm">
                          <User className="w-10 h-10 text-gray-400" />
                        </div>
                      )}

                      {/* Camera overlay */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-2 shadow-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                      >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-900">Update your profile photo</p>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG or GIF. Max size 5MB. {formData.imageFile && "Image ready for upload!"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange("fullName", e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        value={formData.email}
                        disabled
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>

                  {/* City */}
                  {user.userType !== "traveler" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => handleInputChange("city", e.target.value)}
                          className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="Enter your city"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => handleInputChange("bio", e.target.value)}
                      rows={4}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/500 characters</p>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isPending || !isChanged} // 👈 disable if no change
                    className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg 
             hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 
             focus:ring-offset-2 transition-all disabled:opacity-50 
             disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Password & Security</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Password</p>
                      </div>
                      <button
                        onClick={() => router.push("/reset-password")}
                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Change Password</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Danger Zone Tab */}
            {activeTab === "danger" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
                  <div className="border border-red-200 rounded-lg p-6 bg-red-50">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-red-900 mb-2">Delete Account</h4>
                        <p className="text-sm text-red-700 mb-4">
                          Once you delete your account, there is no going back. Please be certain. All your data will be
                          permanently removed and cannot be recovered.
                        </p>
                        <button
                          onClick={() => setShowDeleteModal(true)}
                          className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete My Account</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 bg-opacity-50 z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <h2 className="text-xl font-semibold text-red-600">Confirm Account Deletion</h2>
              </div>

              <p className="text-gray-600 mb-6">
                This action cannot be undone. This will permanently delete your account and remove all your data from
                our servers.
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Account</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
