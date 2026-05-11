import axiosClient from '../api/axiosClient';

const adminService = {
  async lockUser(userId: number, reason: string): Promise<string> {
    const res = await axiosClient.post(`/admin/lock/${userId}`, { reason });
    return res.data;
  },

  async unlockUser(userId: number): Promise<string> {
    const res = await axiosClient.post(`/admin/unlock/${userId}`);
    return res.data;
  },
};

export default adminService;
