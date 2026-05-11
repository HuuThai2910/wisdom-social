import { MOCK_LOGS, type ActivityLog, type HttpMethod, type LogAction, type LogStatus } from '../mocks/mockData';

let mockLogs: ActivityLog[] = MOCK_LOGS.map((l) => ({ ...l }));

export interface LogQuery {
  keyword?: string;
  action?: LogAction | 'ALL';
  status?: LogStatus | 'ALL';
  method?: HttpMethod | 'ALL';
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface LogQueryResult {
  total: number;
  page: number;
  pageSize: number;
  items: ActivityLog[];
}

const logService = {
  async query(q: LogQuery = {}): Promise<LogQueryResult> {
    // Backend chưa có endpoint -> trả về dữ liệu mock đã được lọc & phân trang
    await new Promise((r) => setTimeout(r, 80)); // mô phỏng độ trễ mạng

    const keyword = (q.keyword || '').trim().toLowerCase();
    const action = q.action || 'ALL';
    const status = q.status || 'ALL';
    const method = q.method || 'ALL';
    const from = q.fromDate ? new Date(q.fromDate).getTime() : null;
    const to = q.toDate ? new Date(q.toDate).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

    const filtered = mockLogs.filter((l) => {
      if (action !== 'ALL' && l.action !== action) return false;
      if (status !== 'ALL' && l.status !== status) return false;
      if (method !== 'ALL' && l.httpMethod !== method) return false;
      if (from !== null && new Date(l.createdAt).getTime() < from) return false;
      if (to !== null && new Date(l.createdAt).getTime() > to) return false;
      if (keyword) {
        const hay = [
          l.userName,
          l.description,
          l.ipAddress,
          l.device,
          l.browser,
          l.action,
          l.apiEndpoint,
          l.httpMethod,
          String(l.responseStatus),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(keyword)) return false;
      }
      return true;
    });

    const page = Math.max(1, q.page || 1);
    const pageSize = q.pageSize || 20;
    const start = (page - 1) * pageSize;
    return {
      total: filtered.length,
      page,
      pageSize,
      items: filtered.slice(start, start + pageSize),
    };
  },

  async stats(): Promise<{
    total: number;
    success: number;
    failed: number;
    warning: number;
    perDay: { day: string; count: number }[];
    perAction: { action: string; count: number }[];
    perEndpoint: { endpoint: string; method: HttpMethod; count: number }[];
    perMethod: { method: HttpMethod; count: number }[];
  }> {
    const total = mockLogs.length;
    const success = mockLogs.filter((l) => l.status === 'SUCCESS').length;
    const failed = mockLogs.filter((l) => l.status === 'FAILED').length;
    const warning = mockLogs.filter((l) => l.status === 'WARNING').length;

    const days = 14;
    const perDayMap = new Map<string, number>();
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      perDayMap.set(d.toISOString().slice(5, 10), 0);
    }
    for (const l of mockLogs) {
      const k = new Date(l.createdAt).toISOString().slice(5, 10);
      if (perDayMap.has(k)) perDayMap.set(k, (perDayMap.get(k) || 0) + 1);
    }
    const perDay = Array.from(perDayMap.entries()).map(([day, count]) => ({ day, count }));

    const perActionMap = new Map<string, number>();
    for (const l of mockLogs) {
      perActionMap.set(l.action, (perActionMap.get(l.action) || 0) + 1);
    }
    const perAction = Array.from(perActionMap.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Top endpoint sử dụng nhiều nhất (gộp theo "METHOD endpoint")
    const perEndpointMap = new Map<string, { endpoint: string; method: HttpMethod; count: number }>();
    for (const l of mockLogs) {
      const key = `${l.httpMethod} ${l.apiEndpoint}`;
      const existing = perEndpointMap.get(key);
      if (existing) existing.count += 1;
      else perEndpointMap.set(key, { endpoint: l.apiEndpoint, method: l.httpMethod, count: 1 });
    }
    const perEndpoint = Array.from(perEndpointMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Phân bố theo HTTP method
    const perMethodMap = new Map<HttpMethod, number>();
    for (const l of mockLogs) {
      perMethodMap.set(l.httpMethod, (perMethodMap.get(l.httpMethod) || 0) + 1);
    }
    const perMethod = Array.from(perMethodMap.entries()).map(([method, count]) => ({
      method,
      count,
    }));

    return { total, success, failed, warning, perDay, perAction, perEndpoint, perMethod };
  },

  async deleteLog(id: number): Promise<void> {
    mockLogs = mockLogs.filter((l) => l.id !== id);
  },

  async clearAll(): Promise<void> {
    mockLogs = [];
  },

  async exportCsv(): Promise<string> {
    const headers = [
      'id', 'userId', 'userName', 'action', 'description',
      'method', 'endpoint', 'responseStatus',
      'status', 'ipAddress', 'device', 'browser', 'createdAt',
    ];
    const rows = mockLogs.map((l) =>
      [
        l.id, l.userId, l.userName, l.action, l.description,
        l.httpMethod, l.apiEndpoint, l.responseStatus,
        l.status, l.ipAddress, l.device, l.browser, l.createdAt,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  },
};

export default logService;
