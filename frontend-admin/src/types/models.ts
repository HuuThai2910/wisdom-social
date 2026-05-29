export type Gender = 'MALE' | 'FEMALE' | 'HIDDEN';

export interface User {
  id: number;
  phone?: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
  birthday?: string;
  bio?: string;
  gender?: Gender;
  createdAt?: string;
  updatedAt?: string;
  lastActiveAt?: string;
  locked?: boolean;
  lockedAt?: string;
  lockReason?: string;
  lockedUntil?: string;
  lockedBy?: string;
  deletionRequestedAt?: string;
  deletionScheduledFor?: string;
  confirmUseAI?: boolean;
}

export type PageStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'PENDING';

export interface Page {
  id: number;
  name: string;
  username?: string;
  category?: string;
  description?: string;
  avatarUrl?: string;
  coverUrl?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  isVerified?: boolean;
  status?: PageStatus;
  createdBy?: User;
  createdAt?: string;
  updatedAt?: string;
}

export interface PostMedia {
  url: string;
  type?: string;
}

export interface PostStats {
  reactionCount?: number;
  commentCount?: number;
  shareCount?: number;
  viewCount?: number;
}

export type PrivacyType = 'PUBLIC' | 'FRIENDS' | 'PRIVATE' | 'SPECIFIC' | 'EXCEPT';
export type StatusType = 'ACTIVE' | 'HIDDEN' | 'DELETED' | 'PENDING';

export interface Post {
  id: string;
  authorId: string;
  content?: string;
  privacy?: PrivacyType;
  media?: PostMedia[];
  hashtags?: string[];
  mentions?: string[];
  taggedUserIds?: string[];
  stats?: PostStats;
  status?: StatusType;
  isEdited?: boolean;
  allowComments?: boolean;
  allowShares?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile extends User {
  friendsCount?: number;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
}

export interface PageMember {
  id: number;
  userId: number;
  pageId: number;
  role?: string;
  user?: User;
  status?: string;
  createdAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type?: string;
  title?: string;
  content?: string;
  referenceId?: string;
  referenceType?: string;
  isRead?: boolean;
  createdAt?: string;
}

export interface TrendingHashtag {
  tag: string;
  postCount?: number;
  userCount?: number;
  viewCount?: number;
  engagementCount?: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first?: boolean;
  last?: boolean;
}

export interface StoryMedia {
  url: string;
  type?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface Story {
  id: string;
  userId: string;
  user?: { username?: string; name?: string; avatarUrl?: string };
  media?: StoryMedia;
  text?: string;
  privacy?: PrivacyType;
  viewCount?: number;
  reactCount?: number;
  replyCount?: number;
  isArchived?: boolean;
  highlightCategory?: string;
  status?: StatusType;
  createdAt?: string;
  expireAt?: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration?: number;
  imageUrl?: string;
  audioUrl?: string;
  createdAt?: string;
}

export interface AdminStats {
  totalUsers: number;
  activeToday: number;
  newThisWeek: number;
  lockedUsers: number;
  totalPosts: number;
  totalStories: number;
  totalPages: number;
  registrationsByDay: { date: string; count: number }[];
  postsByDay: { date: string; count: number }[];
}

export interface ApiResponse<T> {
  status: number;
  success?: boolean;
  message: string;
  data: T;
  errors?: any;
  timestamp?: string;
}
