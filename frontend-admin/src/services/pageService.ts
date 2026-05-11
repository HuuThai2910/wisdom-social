import axiosClient from '../api/axiosClient';
import type { Page } from '../types/models';
import { MOCK_PAGES } from '../mocks/mockData';

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

let mockPages: Page[] = MOCK_PAGES.map((p) => ({ ...p }));

const pageService = {
  async getAllPages(): Promise<Page[]> {
    try {
      const res = await axiosClient.get('/page/all');
      const list = unwrap<Page[]>(res);
      if (Array.isArray(list) && list.length > 0) return list;
      return mockPages;
    } catch {
      return mockPages;
    }
  },

  async getPageById(id: number): Promise<Page> {
    try {
      const res = await axiosClient.get(`/page/${id}`);
      return unwrap<Page>(res);
    } catch {
      return mockPages.find((p) => p.id === id) as Page;
    }
  },

  async deletePage(id: number): Promise<string> {
    try {
      const res = await axiosClient.delete(`/page/delete/${id}`);
      mockPages = mockPages.filter((p) => p.id !== id);
      return unwrap<string>(res);
    } catch {
      mockPages = mockPages.filter((p) => p.id !== id);
      return 'Đã xoá trang (mock)';
    }
  },
};

export default pageService;
