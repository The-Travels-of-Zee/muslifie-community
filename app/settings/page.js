"use client";

import { useState } from "react";
import { User, Mail, Image, Lock, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("user");
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john@example.com");
  const [photo, setPhoto] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const router = useRouter();

  // Handle photo upload + preview
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Handle save settings (fake for now)
  const handleSave = () => {
    alert(`✅ Saved!\nName: ${name}\nEmail: ${email}`);
  };

  // Handle account deletion (fake for now)
  const handleDeleteAccount = () => {
    setShowDeleteModal(false);
    alert("⚠️ Your account has been deleted (mock).");
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      {/* Tabs */}
      <div className="flex space-x-6 border-b mb-6">
        <button
          onClick={() => setActiveTab("user")}
          className={`pb-3 px-1 text-sm font-medium ${
            activeTab === "user" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          User Settings
        </button>
        <button
          onClick={() => setActiveTab("delete")}
          className={`pb-3 px-1 text-sm font-medium ${
            activeTab === "delete" ? "border-b-2 border-red-500 text-red-600" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Delete Account
        </button>
      </div>

      {/* User Settings */}
      {activeTab === "user" && (
        <div className="space-y-6">
          {/* Profile Photo */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              {photo ? (
                <img src={photo} alt="Profile" className="w-20 h-20 rounded-full object-cover border" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1 cursor-pointer hover:bg-blue-600">
                <Image className="w-4 h-4" />
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>
            <span className="text-sm text-gray-600">Click the icon to upload a photo</span>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Name</label>
            <div className="flex items-center border rounded px-3 py-2">
              <User className="w-5 h-5 text-gray-400 mr-2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 outline-none text-sm"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <div className="flex items-center border rounded px-3 py-2">
              <Mail className="w-5 h-5 text-gray-400 mr-2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 outline-none text-sm"
              />
            </div>
          </div>

          {/* Change Password */}
          <div>
            <button
              onClick={() => router.push("/reset-password")}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Lock className="w-4 h-4" />
              <span>Change Password</span>
            </button>
          </div>

          {/* Save Button */}
          <div>
            <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Delete Account */}
      {activeTab === "delete" && (
        <div className="space-y-6">
          <p className="text-sm text-gray-700">
            Deleting your account is permanent. All your data will be removed and cannot be recovered.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete My Account</span>
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-red-600">Confirm Deletion</h2>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete your account? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
