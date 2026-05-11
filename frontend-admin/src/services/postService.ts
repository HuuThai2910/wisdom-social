import axiosClient from '../api/axiosClient';
import type { Post } from '../types/models';
import { MOCK_POSTS_BY_USER } from '../mocks/mockData';

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

const mockPostsByUser = new Map<number, Post[]>(
  Array.from(MOCK_POSTS_BY_USER.entries()).map(([uid, list]) => [uid, list.map((p) => ({ ...p }))])
);

const postService = {
  async getPostsByUser(userId: number): Promise<Post[]> {
    try {
      const res = await axiosClient.get(`/posts/user/${userId}`);
      const list = unwrap<Post[]>(res);
      if (Array.isArray(list) && list.length > 0) return list;
      return mockPostsByUser.get(userId) ?? [];
    } catch {
      return mockPostsByUser.get(userId) ?? [];
    }
  },

  async getPostById(id: string): Promise<Post> {
    try {
      const res = await axiosClient.get(`/posts/${id}`);
      return unwrap<Post>(res);
    } catch {
      for (const list of mockPostsByUser.values()) {
        const found = list.find((p) => p.id === id);
        if (found) return found;
      }
      throw new Error('Post not found');
    }
  },

  async deletePost(id: string): Promise<void> {
    try {
      await axiosClient.delete(`/posts/${id}`);
    } catch {
      // ignore – we still update mocks below
    }
    for (const [uid, list] of mockPostsByUser.entries()) {
      mockPostsByUser.set(uid, list.filter((p) => p.id !== id));
    }
  },
};

export default postService;
