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

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}
