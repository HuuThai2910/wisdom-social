import axiosClient from '../api/axiosClient';
import type { User } from '../types/models';
import { MOCK_USERS } from '../mocks/mockData';

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

// In-memory store cho mock fallback (giữ nguyên khi xoá / cập nhật)
let mockUsers: User[] = MOCK_USERS.map((u) => ({ ...u }));

const userService = {
  async getAllUsers(): Promise<User[]> {
    try {
      const res = await axiosClient.get('/auth/users');
      const list = unwrap<User[]>(res);
      if (Array.isArray(list) && list.length > 0) return list;
      return mockUsers;
    } catch {
      return mockUsers;
    }
  },

  async deleteUser(id: number): Promise<string> {
    try {
      const res = await axiosClient.delete(`/auth/users/${id}`);
      mockUsers = mockUsers.filter((u) => u.id !== id);
      return unwrap<string>(res);
    } catch {
      mockUsers = mockUsers.filter((u) => u.id !== id);
      return 'Đã xoá người dùng (mock)';
    }
  },

  async updateUser(id: number, body: Partial<User>): Promise<User> {
    try {
      const res = await axiosClient.put(`/auth/users/${id}`, body);
      return unwrap<User>(res);
    } catch {
      mockUsers = mockUsers.map((u) => (u.id === id ? { ...u, ...body } : u));
      return mockUsers.find((u) => u.id === id) as User;
    }
  },

  async searchByUsername(keyword: string): Promise<User[]> {
    try {
      const res = await axiosClient.get(`/auth/users/username/${encodeURIComponent(keyword)}`);
      return unwrap<User[]>(res) ?? [];
    } catch {
      const k = keyword.toLowerCase();
      return mockUsers.filter((u) => (u.username || '').toLowerCase().includes(k));
    }
  },

  async getProfile(id: number): Promise<User> {
    try {
      const res = await axiosClient.get(`/auth/user/${id}`);
      return unwrap<User>(res);
    } catch {
      return mockUsers.find((u) => u.id === id) as User;
    }
  },
};

export default userService;
