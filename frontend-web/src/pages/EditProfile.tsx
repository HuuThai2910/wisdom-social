import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import userService from "../services/userService";
import { buildS3Url } from "../utils/s3";
import axios from "axios";

export default function EditProfile() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    gender: "OTHER" as "MALE" | "FEMALE" | "OTHER",
    avatarUrl: "",
  });

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (currentUser) {
      const initialFormData = {
        name: currentUser.fullName ?? currentUser.fullName ?? "",
        bio: currentUser.bio ?? "",
        gender:
          (currentUser.gender?.toUpperCase() as "MALE" | "FEMALE" | "OTHER") ??
          "OTHER",
        avatarUrl: currentUser.avatarUrl ?? "",
      };
      setFormData(initialFormData);
      setPreviewAvatar(currentUser.avatarUrl);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Vui lòng chọn file ảnh (JPG, PNG, WEBP)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Kích thước file không được vượt quá 5MB");
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAvatar = async () => {
    if (!selectedFile || !currentUser) return;

    setUploading(true);
    try {
      // Get file extension
      const extension = selectedFile.name.split(".").pop() || "jpg";
      
      // Step 1: Get pre-signed upload URL from backend (which also updates avatarUrl)
      const uploadUrl = await userService.updateUploadAvatarUrl("avatar", extension);
      
      // Step 2: Upload file to S3 using PUT
      await axios.put(uploadUrl, selectedFile, {
        headers: {
          "Content-Type": selectedFile.type,
        },
      });

      // Step 3: The avatarUrl is already updated on backend
      // We need to refresh user data
      alert("Upload avatar thành công!");
      setSelectedFile(null);
      
      // Optionally reload user data or navigate
      window.location.reload();
    } catch (error: any) {
      console.error("Upload avatar error:", error);
      alert("Upload avatar thất bại. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    try {
      // Upload avatar first if there's a new file
      if (selectedFile) {
        await handleUploadAvatar();
      }

      // Prepare data to send to backend (name instead of fullName)
      const updateData = {
        name: formData.name,
        bio: formData.bio,
        gender: formData.gender,
      };

      await userService.updateUser(currentUser.id, updateData);

      // Fetch latest user data from backend
      const updatedUser = await userService.getCurrentUser();

      if (updatedUser) {
        // Update localStorage with fresh data from backend
        useCurrentUser();

        // Navigate back to profile
        navigate(`/profile/${currentUser.username}`);
      } else {
        alert("Failed to update profile. Please try again.");
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
            <div className="flex-shrink-0 relative">
              <img
                src={buildS3Url(currentUser.avatarUrl) || "https://i.pravatar.cc/150"}
                className="w-20 h-20 rounded-full object-cover"
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                  <Loader2 className="animate-spin text-white" size={24} />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold dark:text-white text-base">
                {currentUser.username}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formData.name || currentUser.name}
              </p>
              {selectedFile && (
                <p className="text-xs text-blue-500 mt-1">
                  {selectedFile.name} selected
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Upload size={16} />
                Choose photo
              </button>
              {selectedFile && (
                <button
                  type="button"
                  onClick={handleUploadAvatar}
                  disabled={uploading}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              )}
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold mb-2 dark:text-white">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
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
              disabled={loading || uploading}
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
