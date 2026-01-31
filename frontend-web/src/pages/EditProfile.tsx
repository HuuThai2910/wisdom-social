import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "../utils/auth";
import axiosClient from "../api/axiosClient";

export default function EditProfile() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [formData, setFormData] = useState({
    fullName: "",
    bio: "",
    gender: "OTHER" as "MALE" | "FEMALE" | "OTHER",
    avatarUrl: "",
  });

  const [loading, setLoading] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState("");

  useEffect(() => {
    if (currentUser) {
      const initialFormData = {
        fullName: currentUser.fullName || currentUser.name || "",
        bio: currentUser.bio || "",
        gender:
          (currentUser.gender?.toString().toUpperCase() as
            | "MALE"
            | "FEMALE"
            | "OTHER") || "OTHER",
        avatarUrl: currentUser.avatar || "",
      };
      setFormData(initialFormData);
      setPreviewAvatar(currentUser.avatar || "https://i.pravatar.cc/150?img=5");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    try {
      const response = await axiosClient.put(
        `/users/${currentUser.userId}`,
        formData
      );

      if (response.data.success) {
        // Get updated user data from backend response
        const updatedUserData = response.data.data;

        // Update localStorage with new user data from server
        const updatedUser = {
          userId: updatedUserData.id,
          username: updatedUserData.username,
          fullName: updatedUserData.name || updatedUserData.username,
          name: updatedUserData.name,
          avatar:
            updatedUserData.avatarUrl || "https://i.pravatar.cc/150?img=5",
          bio: updatedUserData.bio || "",
          phone: updatedUserData.phone,
          gender: updatedUserData.gender,
        };
        localStorage.setItem("current_user", JSON.stringify(updatedUser));

        // Navigate back to profile
        navigate(`/profile/${currentUser.username}`);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#000]">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-[#262626] sticky top-0 bg-white dark:bg-[#000] z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center">
          <Link
            to={`/profile/${currentUser.username}`}
            className="mr-4 hover:opacity-70"
          >
            <ArrowLeft size={24} className="dark:text-white" />
          </Link>
          <h1 className="text-xl font-semibold dark:text-white">
            Edit profile
          </h1>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6 bg-gray-50 dark:bg-[#121212] rounded-2xl p-6">
            <div className="flex-shrink-0">
              <img
                src={previewAvatar}
                alt={currentUser.username}
                className="w-16 h-16 rounded-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="font-semibold dark:text-white text-base">
                {currentUser.username}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formData.fullName || currentUser.name}
              </p>
            </div>
            <button
              type="button"
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-sm transition-colors"
              onClick={() => {
                const newAvatar = prompt("Enter avatar URL:");
                if (newAvatar) {
                  setFormData((prev) => ({ ...prev, avatarUrl: newAvatar }));
                  setPreviewAvatar(newAvatar);
                }
              }}
            >
              Change photo
            </button>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold mb-2 dark:text-white">
              Full Name
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, fullName: e.target.value }))
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-[#262626] rounded-lg bg-white dark:bg-[#121212] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your full name"
              autoComplete="off"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold mb-2 dark:text-white">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => {
                if (e.target.value.length <= 150) {
                  setFormData((prev) => ({ ...prev, bio: e.target.value }));
                }
              }}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 dark:border-[#262626] rounded-lg bg-white dark:bg-[#121212] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Tell us about yourself"
              autoComplete="off"
            />
            <p className="text-right text-sm text-gray-500 dark:text-gray-400 mt-1">
              {formData.bio.length} / 150
            </p>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-semibold mb-2 dark:text-white">
              Gender
            </label>
            <select
              value={formData.gender}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  gender: e.target.value as "MALE" | "FEMALE" | "OTHER",
                }))
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-[#262626] rounded-lg bg-white dark:bg-[#121212] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              This won't be part of your public profile.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg font-semibold transition-colors"
            >
              {loading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
