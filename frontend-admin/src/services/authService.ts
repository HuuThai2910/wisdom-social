import axiosClient from '../api/axiosClient';
import type { ApiResponse, User } from '../types/models';

export interface LoginRequest {
  phone: string;
  password: string;
  ipAddress?: string;
}

const MOCK_ADMIN: User = {
  id: 0,
  name: 'Admin Wisdom',
  username: 'admin',
  phone: '0900000000',
  avatarUrl: 'https://api.dicebear.com/7.x/notionists/svg?seed=admin',
  gender: 'HIDDEN',
  createdAt: new Date(2026, 0, 1).toISOString(),
  updatedAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  locked: false,
};

const MOCK_TOKEN = 'mock-admin-jwt-token-for-development-only-please-replace-with-real-jwt';

const authService = {
  async login(payload: LoginRequest) {
    try {
      const res = await axiosClient.post('/auth/login', payload);
      return res.data;
    } catch (err: any) {
      // Khi không có backend hoặc API thất bại → cho phép login mock với cặp admin/admin123
      const isMockAdmin =
        (payload.phone === 'admin' || payload.phone === '0900000000') &&
        payload.password === 'admin123';
      if (isMockAdmin) {
        localStorage.setItem('mock-user', JSON.stringify(MOCK_ADMIN));
        return { data: { accessToken: MOCK_TOKEN, user: MOCK_ADMIN } };
      }
      throw err;
    }
  },

  async logout() {
    try {
      await axiosClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('mock-user');
    }
    return 'ok';
  },

  async getMe(): Promise<User | null> {
    try {
      const res = await axiosClient.get<ApiResponse<User>>('/auth/me');
      return res.data?.data ?? null;
    } catch {
      const cached = localStorage.getItem('mock-user');
      if (cached) {
        try {
          return JSON.parse(cached) as User;
        } catch {
          return null;
        }
      }
      return null;
    }
  },
};

export default authService;
