import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import logService from '../services/logService';
import type { ActivityLog, HttpMethod, LogAction, LogStatus } from '../mocks/mockData';

const ACTION_OPTIONS: (LogAction | 'ALL')[] = [
  'ALL',
  'LOGIN',
  'LOGOUT',
  'REGISTER',
  'CREATE_POST',
  'DELETE_POST',
  'UPDATE_PROFILE',
  'PASSWORD_RESET',
  'BLOCK_USER',
  'SEND_FRIEND_REQUEST',
  'CREATE_PAGE',
  'DELETE_PAGE',
  'JOIN_PAGE',
  'REPORT_CONTENT',
  'UPLOAD_AVATAR',
  'CHANGE_PASSWORD',
  'LOCK_USER',
  'UNLOCK_USER',
  'FAILED_LOGIN',
];

const STATUS_OPTIONS: (LogStatus | 'ALL')[] = ['ALL', 'SUCCESS', 'FAILED', 'WARNING'];

const METHOD_OPTIONS: (HttpMethod | 'ALL')[] = ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

const METHOD_STYLE: Record<HttpMethod, string> = {
  GET: 'bg-sky-50 text-sky-700 border-sky-200',
  POST: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PUT: 'bg-amber-50 text-amber-700 border-amber-200',
  DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
  PATCH: 'bg-violet-50 text-violet-700 border-violet-200',
};

const STATUS_STYLE: Record<LogStatus, string> = {
  SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
  WARNING: 'bg-amber-50 text-amber-700 border-amber-200',
};

const STATUS_ICON: Record<LogStatus, typeof CheckCircle2> = {
  SUCCESS: CheckCircle2,
  FAILED: XCircle,
  WARNING: AlertTriangle,
};

const PIE_COLORS = ['#10b981', '#f43f5e', '#f59e0b'];

export default function Logs() {
  const [items, setItems] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [action, setAction] = useState<LogAction | 'ALL'>('ALL');
  const [status, setStatus] = useState<LogStatus | 'ALL'>('ALL');
  const [method, setMethod] = useState<HttpMethod | 'ALL'>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [stats, setStats] = useState<Awaited<ReturnType<typeof logService.stats>> | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [res, s] = await Promise.all([
        logService.query({ keyword, action, status, method, fromDate, toDate, page, pageSize }),
        logService.stats(),
      ]);
      setItems(res.items);
      setTotal(res.total);
      setStats(s);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const handleSearch = () => {
    setPage(1);
    load();
  };

  const handleReset = () => {
    setKeyword('');
    setAction('ALL');
    setStatus('ALL');
    setMethod('ALL');
    setFromDate('');
    setToDate('');
    setPage(1);
    setTimeout(load, 0);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xoá bản ghi log này?')) return;
    await logService.deleteLog(id);
    toast.success('Đã xoá log');
    load();
  };

  const handleClearAll = async () => {
    if (!confirm('Xoá toàn bộ log? Hành động này không thể hoàn tác.')) return;
    await logService.clearAll();
    toast.success('Đã xoá toàn bộ log');
    load();
  };

  const handleExport = async () => {
    const csv = await logService.exportCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wisdom-social-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất file CSV');
  };

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      { label: 'Tổng log', value: stats.total, tone: 'indigo', icon: Activity },
      { label: 'Thành công', value: stats.success, tone: 'emerald', icon: CheckCircle2 },
      { label: 'Cảnh báo', value: stats.warning, tone: 'amber', icon: AlertTriangle },
      { label: 'Thất bại', value: stats.failed, tone: 'rose', icon: XCircle },
    ];
  }, [stats]);

  const pieData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Thành công', value: stats.success },
      { name: 'Thất bại', value: stats.failed },
      { name: 'Cảnh báo', value: stats.warning },
    ];
  }, [stats]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nhật ký hoạt động người dùng</h1>
          <p className="text-sm text-slate-500">
            Theo dõi mọi hành vi quan trọng (đăng nhập, đăng bài, đổi mật khẩu, vi phạm...)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Download size={14} /> Xuất CSV
          </button>
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100"
          >
            <Trash2 size={14} /> Xoá tất cả
          </button>
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={14} /> Làm mới
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          const accent =
            s.tone === 'emerald'
              ? 'from-emerald-500 to-teal-600'
              : s.tone === 'amber'
                ? 'from-amber-500 to-orange-600'
                : s.tone === 'rose'
                  ? 'from-rose-500 to-pink-600'
                  : 'from-indigo-500 to-purple-600';
          return (
            <div
              key={s.label}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div>
                <p className="text-sm text-slate-500">{s.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{s.value.toLocaleString()}</p>
              </div>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow`}
              >
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">Số lượng log theo ngày</h2>
          <p className="text-xs text-slate-500">14 ngày gần nhất</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <BarChart data={stats?.perDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" name="Log" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Tỷ lệ kết quả</h2>
          <p className="text-xs text-slate-500">Toàn bộ log</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Top hành động</h2>
          <p className="text-xs text-slate-500">Theo số lượng phát sinh</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer>
              <BarChart data={stats?.perAction || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis type="category" dataKey="action" tick={{ fontSize: 11 }} stroke="#94a3b8" width={140} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" name="Số lượng" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Top API được gọi</h2>
              <p className="text-xs text-slate-500">8 endpoint có lưu lượng cao nhất</p>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
              {(stats?.perMethod || []).map((m) => (
                <span
                  key={m.method}
                  className={`rounded-full border px-2 py-0.5 ${METHOD_STYLE[m.method]}`}
                >
                  {m.method} · {m.count}
                </span>
              ))}
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {(stats?.perEndpoint || []).map((e) => {
              const max = stats?.perEndpoint?.[0]?.count || 1;
              const pct = Math.round((e.count / max) * 100);
              return (
                <li
                  key={`${e.method} ${e.endpoint}`}
                  className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`rounded border px-1.5 py-0.5 font-semibold ${METHOD_STYLE[e.method]}`}
                      >
                        {e.method}
                      </span>
                      <code className="truncate text-[12px] text-slate-700">{e.endpoint}</code>
                    </div>
                    <span className="font-semibold text-slate-700">{e.count}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="relative xl:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Tìm theo người dùng, IP, mô tả, endpoint..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as LogAction | 'ALL')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a === 'ALL' ? 'Tất cả hành động' : a}
              </option>
            ))}
          </select>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as HttpMethod | 'ALL')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {METHOD_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m === 'ALL' ? 'Tất cả HTTP method' : m}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as LogStatus | 'ALL')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? 'Tất cả trạng thái' : s}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <span className="text-xs text-slate-400">→</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            onClick={handleReset}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Đặt lại
          </button>
          <button
            onClick={handleSearch}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Tìm kiếm
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Thời gian</th>
                <th className="px-4 py-3 text-left">Người dùng</th>
                <th className="px-4 py-3 text-left">Hành động</th>
                <th className="px-4 py-3 text-left">API</th>
                <th className="px-4 py-3 text-left">Mô tả</th>
                <th className="px-4 py-3 text-left">Thiết bị</th>
                <th className="px-4 py-3 text-left">IP</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                    Đang tải log...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                    Không có log phù hợp.
                  </td>
                </tr>
              ) : (
                items.map((l) => {
                  const Icon = STATUS_ICON[l.status];
                  return (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {new Date(l.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img src={l.userAvatar} className="h-8 w-8 rounded-full object-cover" alt="" />
                          <div>
                            <p className="font-medium text-slate-800">{l.userName}</p>
                            <p className="text-xs text-slate-500">ID #{l.userId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {l.action}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${METHOD_STYLE[l.httpMethod]}`}
                          >
                            {l.httpMethod}
                          </span>
                          <code className="text-[11px] text-slate-700">{l.apiEndpoint}</code>
                          <span
                            className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              l.responseStatus >= 500
                                ? 'bg-rose-100 text-rose-700'
                                : l.responseStatus >= 400
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {l.responseStatus}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{l.description}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <p>{l.device}</p>
                        <p className="text-xs text-slate-500">{l.browser}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{l.ipAddress}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[l.status]}`}
                        >
                          <Icon size={12} />
                          {l.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleDelete(l.id)}
                            className="flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            <Trash2 size={12} /> Xoá
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <p>
            Hiển thị <span className="font-semibold text-slate-700">{items.length}</span> /{' '}
            <span className="font-semibold text-slate-700">{total}</span> bản ghi
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Trước
            </button>
            <span className="font-medium text-slate-700">
              Trang {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 disabled:opacity-40"
            >
              Sau <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
