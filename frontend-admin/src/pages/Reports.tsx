import { ShieldAlert } from 'lucide-react';

const sampleReports = [
  {
    id: 1,
    type: 'POST',
    target: 'Bài đăng có nội dung công kích cá nhân',
    reportedBy: 'user01',
    createdAt: '2026-05-08',
    severity: 'Cao',
    status: 'PENDING',
  },
  {
    id: 2,
    type: 'USER',
    target: 'Tài khoản gửi tin nhắn rác',
    reportedBy: 'user42',
    createdAt: '2026-05-07',
    severity: 'Trung bình',
    status: 'IN_REVIEW',
  },
  {
    id: 3,
    type: 'PAGE',
    target: 'Page bán hàng giả',
    reportedBy: 'user88',
    createdAt: '2026-05-05',
    severity: 'Cao',
    status: 'RESOLVED',
  },
];

export default function Reports() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Báo cáo & Vi phạm</h1>
        <p className="text-sm text-slate-500">
          Theo dõi các báo cáo từ người dùng. (Tính năng sẽ kết nối với endpoint
          <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">/api/admin/reports</code>
          khi backend triển khai.)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Đang chờ xử lý', value: 12, tone: 'amber' },
          { label: 'Đang điều tra', value: 4, tone: 'indigo' },
          { label: 'Đã xử lý (7 ngày)', value: 28, tone: 'emerald' },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div>
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{s.value}</p>
            </div>
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                s.tone === 'amber'
                  ? 'bg-amber-100 text-amber-600'
                  : s.tone === 'indigo'
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              <ShieldAlert size={18} />
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Loại</th>
              <th className="px-4 py-3 text-left">Đối tượng</th>
              <th className="px-4 py-3 text-left">Người báo cáo</th>
              <th className="px-4 py-3 text-left">Ngày</th>
              <th className="px-4 py-3 text-left">Mức độ</th>
              <th className="px-4 py-3 text-left">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sampleReports.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">#{r.id}</td>
                <td className="px-4 py-3 font-medium text-slate-700">{r.type}</td>
                <td className="px-4 py-3 text-slate-600">{r.target}</td>
                <td className="px-4 py-3 text-slate-600">@{r.reportedBy}</td>
                <td className="px-4 py-3 text-slate-600">{r.createdAt}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.severity === 'Cao'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {r.severity}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-700'
                        : r.status === 'IN_REVIEW'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
