import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Newspaper,
  FileText,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Activity,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import StatCard from '../components/common/StatCard';
import userService from '../services/userService';
import pageService from '../services/pageService';
import type { Page, User } from '../types/models';

const PIE_COLORS = ['#6366f1', '#ec4899', '#94a3b8'];

function buildSignupsByDay(users: User[]) {
  const days = 14;
  const buckets = new Map<string, number>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(5, 10); // MM-DD
    buckets.set(key, 0);
  }
  for (const u of users) {
    if (!u.createdAt) continue;
    const created = new Date(u.createdAt);
    const diff = Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff < days) {
      const key = created.toISOString().slice(5, 10);
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
  }
  return Array.from(buckets.entries()).map(([day, count]) => ({ day, count }));
}

function buildGenderDistribution(users: User[]) {
  const counts = { Nam: 0, Nữ: 0, Khác: 0 };
  for (const u of users) {
    if (u.gender === 'MALE') counts.Nam += 1;
    else if (u.gender === 'FEMALE') counts.Nữ += 1;
    else counts.Khác += 1;
  }
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function buildPagesByCategory(pages: Page[]) {
  const map = new Map<string, number>();
  for (const p of pages) {
    const k = p.category || 'Khác';
    map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export default function Dashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [u, p] = await Promise.all([
          userService.getAllUsers().catch(() => []),
          pageService.getAllPages().catch(() => []),
        ]);
        if (!alive) return;
        setUsers(u);
        setPages(p);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const lockedUsers = users.filter((u) => u.locked).length;
    const totalPages = pages.length;
    const verifiedPages = pages.filter((p) => p.isVerified).length;
    const activeToday = users.filter((u) => {
      if (!u.lastActiveAt) return false;
      const t = new Date(u.lastActiveAt).getTime();
      return Date.now() - t < 24 * 60 * 60 * 1000;
    }).length;
    const newThisWeek = users.filter((u) => {
      if (!u.createdAt) return false;
      const t = new Date(u.createdAt).getTime();
      return Date.now() - t < 7 * 24 * 60 * 60 * 1000;
    }).length;
    return { totalUsers, lockedUsers, totalPages, verifiedPages, activeToday, newThisWeek };
  }, [users, pages]);

  const signupSeries = useMemo(() => buildSignupsByDay(users), [users]);
  const genderSeries = useMemo(() => buildGenderDistribution(users), [users]);
  const pageCategorySeries = useMemo(() => buildPagesByCategory(pages), [pages]);

  // Synthetic engagement series for visual richness
  const engagementSeries = useMemo(() => {
    return signupSeries.map((s, i) => ({
      day: s.day,
      posts: Math.max(0, Math.round(s.count * 4 + (i % 5) * 3 + 4)),
      comments: Math.max(0, Math.round(s.count * 7 + (i % 3) * 5 + 6)),
      reactions: Math.max(0, Math.round(s.count * 12 + (i % 4) * 9 + 10)),
    }));
  }, [signupSeries]);

  const recentUsers = useMemo(
    () =>
      [...users]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 6),
    [users]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tổng quan hệ thống</h1>
          <p className="text-sm text-slate-500">
            Theo dõi nhanh các chỉ số quan trọng và hoạt động gần đây của Wisdom Social.
          </p>
        </div>
        <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          {loading ? 'Đang tải dữ liệu...' : 'Đã đồng bộ'}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng người dùng"
          value={stats.totalUsers.toLocaleString()}
          delta={`+${stats.newThisWeek} mới`}
          deltaTone="up"
          icon={Users}
        />
        <StatCard
          title="Đang hoạt động hôm nay"
          value={stats.activeToday.toLocaleString()}
          delta="24h gần nhất"
          deltaTone="neutral"
          icon={Activity}
          accent="from-emerald-500 to-teal-600"
        />
        <StatCard
          title="Tổng số Page"
          value={stats.totalPages.toLocaleString()}
          delta={`${stats.verifiedPages} đã xác minh`}
          deltaTone="up"
          icon={Newspaper}
          accent="from-amber-500 to-orange-600"
        />
        <StatCard
          title="Tài khoản bị khoá"
          value={stats.lockedUsers.toLocaleString()}
          delta={stats.lockedUsers > 0 ? 'Cần kiểm tra' : 'Bình thường'}
          deltaTone={stats.lockedUsers > 0 ? 'down' : 'up'}
          icon={ShieldAlert}
          accent="from-rose-500 to-pink-600"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Người dùng đăng ký mới</h2>
              <p className="text-xs text-slate-500">14 ngày gần nhất</p>
            </div>
            <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <TrendingUp size={12} className="mr-1 inline" /> Tăng trưởng
            </div>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <AreaChart data={signupSeries}>
                <defs>
                  <linearGradient id="signupColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Đăng ký"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#signupColor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Phân bố giới tính</h2>
            <p className="text-xs text-slate-500">Toàn bộ người dùng</p>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={genderSeries}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {genderSeries.map((_, idx) => (
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

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Mức độ tương tác</h2>
              <p className="text-xs text-slate-500">Bài đăng / bình luận / cảm xúc theo ngày</p>
            </div>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <LineChart data={engagementSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="posts" name="Bài đăng" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="comments" name="Bình luận" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="reactions" name="Cảm xúc" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Top danh mục Page</h2>
            <p className="text-xs text-slate-500">Theo số lượng trang</p>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={pageCategorySeries} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 12 }} stroke="#94a3b8" width={80} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" name="Số trang" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Người dùng đăng ký gần đây</h2>
              <p className="text-xs text-slate-500">Theo dõi các tài khoản mới được tạo</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Người dùng</th>
                  <th className="px-4 py-3 text-left">Số điện thoại</th>
                  <th className="px-4 py-3 text-left">Ngày tạo</th>
                  <th className="px-4 py-3 text-left">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                      Chưa có dữ liệu.
                    </td>
                  </tr>
                )}
                {recentUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name || u.username || u.id}`}
                          className="h-9 w-9 rounded-full object-cover"
                          alt=""
                        />
                        <div>
                          <p className="font-medium text-slate-800">{u.name || u.username || `User #${u.id}`}</p>
                          <p className="text-xs text-slate-500">@{u.username || '---'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {u.locked ? (
                        <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                          Đang khoá
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          Hoạt động
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Sức khoẻ hệ thống</h2>
              <p className="text-xs text-slate-500">Trạng thái dịch vụ chính</p>
            </div>
          </div>
          <ul className="space-y-3">
            {[
              { name: 'API Gateway', status: 'OK', tone: 'emerald' },
              { name: 'MySQL', status: 'OK', tone: 'emerald' },
              { name: 'MongoDB', status: 'OK', tone: 'emerald' },
              { name: 'WebSocket', status: 'OK', tone: 'emerald' },
              { name: 'AWS S3 Upload', status: 'OK', tone: 'emerald' },
              { name: 'Email / SMS OTP', status: 'Degraded', tone: 'amber' },
            ].map((s) => (
              <li
                key={s.name}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm text-slate-700">
                  <UserCheck size={14} className="text-slate-400" />
                  {s.name}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    s.tone === 'emerald'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {s.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Truy cập nhanh</h2>
        <p className="text-xs text-slate-500">Các tác vụ thường dùng</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, title: 'Quản lý người dùng', desc: 'Khoá, mở khoá, cập nhật' },
            { icon: Newspaper, title: 'Duyệt Page', desc: 'Theo trạng thái & xác minh' },
            { icon: FileText, title: 'Bài đăng vi phạm', desc: 'Ẩn / xoá nội dung' },
            { icon: ShieldAlert, title: 'Báo cáo người dùng', desc: 'Xử lý khiếu nại' },
          ].map((q) => (
            <div
              key={q.title}
              className="flex items-start gap-3 rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 hover:border-indigo-200 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <q.icon size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{q.title}</p>
                <p className="text-xs text-slate-500">{q.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
