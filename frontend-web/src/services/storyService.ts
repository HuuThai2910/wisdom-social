/**
 * Story Data Service
 * Handles all API calls for story-related operations
 */

import axiosClient from "../api/axiosClient";

/**
 * Get presigned upload URL for story media
 * @param extension File extension (jpg, png, mp4, etc.)
 * @param originalFilename Original filename
 * @param contentType MIME type
 * @returns Presigned URL response from backend
 */
export const getStoryPresignedUploadUrl = async (
    extension: string,
    originalFilename?: string,
    contentType?: string
): Promise<{ presignedUrl: string; objectKey: string; fileName: string }> => {
    try {
        console.log(`📋 [Story] Getting presigned URL for story extension: ${extension}`);

        const params: Record<string, string> = { extension };
        if (originalFilename) params.originalFilename = originalFilename;
        if (contentType) params.contentType = contentType;

        const response = await axiosClient.get("/stories/upload-url", {
            params,
        });

        const presignedUrl = response.data?.presignedUrl;
        const objectKey = response.data?.objectKey;
        const fileName = response.data?.fileName;

        if (!presignedUrl || !objectKey) {
            throw new Error("Missing required fields: presignedUrl, objectKey");
        }

        console.log(`✅ [Story] Got presigned URL`, { objectKey });
        return { presignedUrl, objectKey, fileName: fileName || originalFilename || "" };
    } catch (error: any) {
        console.error(`❌ [Story] Error getting presigned URL:`, error);
        throw new Error("Failed to get presigned upload URL for story: " + (error?.message || "Unknown error"));
    }
};

/**
 * Upload story media file directly to S3
 * @param presignedUrl The presigned PUT URL from backend
 * @param file The File object to upload
 */
export const uploadStoryMediaToS3 = async (presignedUrl: string, file: File): Promise<void> => {
    try {
        console.log(`📤 [Story] Uploading ${file.name} to S3...`);
        console.log(`📤 [Story] File type: ${file.type}, size: ${file.size} bytes`);

        const response = await fetch(presignedUrl, {
            method: "PUT",
            headers: {
                "Content-Type": file.type || "application/octet-stream",
            },
            body: file,
        });

        console.log(`📤 [Story] S3 response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ [Story] Upload failed: ${response.status}`);
            console.error(`❌ [Story] Response:`, errorText);
            throw new Error(`S3 upload failed: ${response.status} ${response.statusText}`);
        }

        const eTag = response.headers.get('etag');
        console.log(`✅ [Story] File ${file.name} uploaded successfully (ETag: ${eTag})`);
    } catch (error: any) {
        console.error(`❌ [Story] Error uploading ${file.name}:`, error);
        throw error;
    }
};

/**
 * Upload story media file to S3 and get S3 key for backend
 * @param file File to upload (image or video)
 * @returns S3 object key for backend (e.g., stories/userId/images/uuid.extension)
 */
export const uploadStoryMediaAndGetFormat = async (file: File): Promise<string> => {
    try {
        const extension = file.name.split(".").pop() || "jpg";
        console.log(`🔄 [Story] Processing media upload for: ${file.name}`);

        // Step 1: Get presigned URL with file metadata
        const { presignedUrl, objectKey } = await getStoryPresignedUploadUrl(
            extension,
            file.name,
            file.type || "application/octet-stream"
        );

        // Step 2: Upload to S3
        await uploadStoryMediaToS3(presignedUrl, file);

        // Step 3: Return S3 object key for backend
        console.log(`✅ [Story] Media upload complete, S3 key: ${objectKey}`);
        return objectKey;
    } catch (error: any) {
        console.error(`❌ [Story] Failed to upload media:`, error);
        throw new Error(`Failed to upload story media ${file.name}: ${error.message}`);
    }
};

/**
 * Create a new story
 * @param content Story text content
 * @param privacy Story privacy level (PUBLIC, FRIENDS, PRIVATE)
 * @param mediaUrls Array of S3 object keys for media (from uploadStoryMediaAndGetFormat)
 */
export const createStory = async (
    content?: string,
    privacy: string = "PUBLIC",
    mediaUrls?: string[]
): Promise<any> => {
    try {
        console.log(`📝 [Story] Creating story with ${mediaUrls?.length || 0} media items`);

        const formData = new FormData();
        if (content) formData.append("content", content);
        formData.append("privacy", privacy);

        if (mediaUrls && mediaUrls.length > 0) {
            mediaUrls.forEach((url) => {
                formData.append("mediaUrls", url);
            });
        }

        const response = await axiosClient.post("/stories", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        console.log(`✅ [Story] Story created successfully:`, response.data);
        return response.data;
    } catch (error: any) {
        console.error(`❌ [Story] Error creating story:`, error);
        throw new Error("Failed to create story: " + (error?.message || "Unknown error"));
    }
};

/**
 * Fetch user's stories
 * @param userId User ID
 */
export const fetchUserStories = async (userId: string): Promise<any[]> => {
    try {
        console.log(`📥 [Story] Fetching stories for user: ${userId}`);
        const response = await axiosClient.get(`/stories/user/${userId}`);
        console.log(`✅ [Story] Fetched stories:`, response.data);
        return response.data || [];
    } catch (error: any) {
        console.error(`❌ [Story] Error fetching user stories:`, error);
        throw new Error("Failed to fetch stories: " + (error?.message || "Unknown error"));
    }
};

/**
 * Delete a story
 * @param storyId Story ID
 */
export const deleteStory = async (storyId: string): Promise<void> => {
    try {
        console.log(`🗑️ [Story] Deleting story: ${storyId}`);
        await axiosClient.delete(`/stories/${storyId}`);
        console.log(`✅ [Story] Story deleted successfully`);
    } catch (error: any) {
        console.error(`❌ [Story] Error deleting story:`, error);
        throw new Error("Failed to delete story: " + (error?.message || "Unknown error"));
    }
};

/**
 * Get story feed (current user and friends' stories)
 * @param page Page number (optional)
 * @param size Page size (optional)
 */
export const fetchStoryFeed = async (page?: number, size?: number): Promise<any> => {
    try {
        console.log(`📥 [Story] Fetching story feed`);

        const params: Record<string, any> = {};
        if (page !== undefined) params.page = page;
        if (size !== undefined) params.size = size;

        const response = await axiosClient.get("/stories/feed", { params });
        console.log(`✅ [Story] Fetched story feed:`, response.data);
        return response.data;
    } catch (error: any) {
        console.error(`❌ [Story] Error fetching story feed:`, error);
        throw new Error("Failed to fetch story feed: " + (error?.message || "Unknown error"));
    }
};

/**
 * React to a story
 * @param storyId Story ID
 */
export const reactToStory = async (storyId: string): Promise<void> => {
    try {
        console.log(`😊 [Story] Reacting to story: ${storyId}`);
        await axiosClient.post(`/stories/${storyId}/react`);
        console.log(`✅ [Story] Reaction recorded`);
    } catch (error: any) {
        console.error(`❌ [Story] Error reacting to story:`, error);
        throw new Error("Failed to react to story: " + (error?.message || "Unknown error"));
    }
};
