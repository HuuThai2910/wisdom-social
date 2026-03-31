import axiosClient from "./axiosClient";
import type { ApiResponse } from "../types";
import type { Page, Post, PageCategory } from "../types";

export interface CreatePageRequest {
    name: string;
    username: string;
    category: PageCategory;
    description?: string;
    website?: string;
    location?: string;
    avatar?: string;
    coverImage?: string;
}

export interface PagePostsResponse {
    posts: Post[];
    total: number;
    page: number;
    pageSize: number;
}

// Get all pages (combined followed + suggested)
export const getPages = () =>
    axiosClient.get<ApiResponse<Page[]>>("/pages");

// Get pages followed by the current user
export const getFollowedPages = () =>
    axiosClient.get<ApiResponse<Page[]>>("/pages/followed");

// Get suggested pages for the current user
export const getSuggestedPages = () =>
    axiosClient.get<ApiResponse<Page[]>>("/pages/suggested");

// Search pages by query string and/or category
export const searchPages = (query: string, category?: PageCategory) =>
    axiosClient.get<ApiResponse<Page[]>>("/pages/search", {
        params: { q: query, category },
    });

// Get a single page by its ID
export const getPageById = (pageId: string) =>
    axiosClient.get<ApiResponse<Page>>(`/pages/${pageId}`);

// Get posts belonging to a page
export const getPagePosts = (pageId: string, page = 1, pageSize = 12) =>
    axiosClient.get<ApiResponse<PagePostsResponse>>(
        `/pages/${pageId}/posts`,
        { params: { page, pageSize } },
    );

// Follow a page
export const followPage = (pageId: string) =>
    axiosClient.post<ApiResponse<void>>(`/pages/${pageId}/follow`);

// Unfollow a page
export const unfollowPage = (pageId: string) =>
    axiosClient.delete<ApiResponse<void>>(`/pages/${pageId}/follow`);

// Create a new page
export const createPage = (data: CreatePageRequest) =>
    axiosClient.post<ApiResponse<Page>>("/pages", data);
