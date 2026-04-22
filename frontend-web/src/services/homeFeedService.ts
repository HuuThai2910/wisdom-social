import axiosClient from "../api/axiosClient";
import { transformMediaToS3Urls } from "./postService";
import { buildS3Url } from "../utils/s3";
import type { Post } from "../types";

interface FeedPostData {
    id: string;
    authorId: string;
    content: string;
    privacy?: string;
    media?: Array<{
        url: string;
        type: string;
        order: number;
        duration?: number;
        width?: number;
        height?: number;
    }>;
    stats?: { reactCount: number; commentCount: number; shareCount: number };
    createdAt: string;
}

export interface FeedCursor {
    lastCreatedAt?: string;
    lastPostId?: string;
    prioritizePostId?: string;
}

export interface HomeFeedResult {
    posts: Post[];
    hasNext: boolean;
    nextCursorCreatedAt: string | null;
    nextCursorPostId: string | null;
}

const extractPostsArray = (payload: any): FeedPostData[] => {
    const rawData = payload?.data ?? payload;
    if (Array.isArray(rawData)) {
        return rawData as FeedPostData[];
    }
    if (Array.isArray(rawData?.posts)) {
        return rawData.posts as FeedPostData[];
    }
    if (Array.isArray(rawData?.content)) {
        return rawData.content as FeedPostData[];
    }
    return [];
};

const extractFeedSliceMeta = (payload: any) => {
    const rawData = payload?.data ?? payload;
    return {
        hasNext: Boolean(rawData?.hasNext),
        nextCursorCreatedAt: rawData?.nextCursorCreatedAt ?? null,
        nextCursorPostId: rawData?.nextCursorPostId ?? null,
    };
};

export const fetchHomeFeedPosts = async (
    size: number = 200,
    cursor?: FeedCursor
): Promise<HomeFeedResult> => {
    const feedResponse = await axiosClient.get("/posts/feed", {
        params: {
            size,
            ...(cursor?.lastCreatedAt ? { lastCreatedAt: cursor.lastCreatedAt } : {}),
            ...(cursor?.lastPostId ? { lastPostId: cursor.lastPostId } : {}),
            ...(cursor?.prioritizePostId ? { prioritizePostId: cursor.prioritizePostId } : {}),
        },
    });

    const allPosts = extractPostsArray(feedResponse.data);
    const meta = extractFeedSliceMeta(feedResponse.data);

    allPosts.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const authorIds = Array.from(
        new Set(allPosts.map((post) => post.authorId).filter(Boolean))
    );

    const authorEntries = await Promise.all(
        authorIds.map(async (authorId) => {
            try {
                const userResponse = await axiosClient.get(`/auth/user/${authorId}`);
                return [authorId, userResponse.data.data] as const;
            } catch (userErr: any) {
                console.error("Error fetching author", authorId, userErr?.message);
                return [authorId, null] as const;
            }
        })
    );

    const authorMap = new Map<string, any>(authorEntries);

    const posts = allPosts
        .map((post) => {
            const userData = authorMap.get(post.authorId);
            if (!userData) {
                return null;
            }

            const transformedImages = transformMediaToS3Urls(post.media, post.authorId);
            const transformedMedia = (post.media || []).map((m, mediaIndex) => ({
                url: transformedImages[mediaIndex] || "",
                type: (m.type || "image").toLowerCase(),
                duration: typeof m.duration === "number" ? m.duration : undefined,
            }));

            return {
                id: post.id,
                user: {
                    id: userData.id,
                    username: userData.username,
                    fullName: userData.name || userData.username,
                    avatarUrl:
                        buildS3Url(userData.avatarUrl) ||
                        userData.avatarUrl ||
                        "https://i.pravatar.cc/150?img=5",
                },
                images: transformedImages,
                media: transformedMedia,
                caption: post.content,
                privacy: post.privacy as any,
                likes: post.stats?.reactCount || 0,
                comments: [],
                createdAt: new Date(post.createdAt).toLocaleString("vi-VN"),
                isLiked: false,
                isSaved: false,
            } as Post;
        })
        .filter(Boolean) as Post[];

    return {
        posts,
        hasNext: meta.hasNext,
        nextCursorCreatedAt: meta.nextCursorCreatedAt,
        nextCursorPostId: meta.nextCursorPostId,
    };
};
