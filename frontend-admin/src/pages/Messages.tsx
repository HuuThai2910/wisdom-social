import { MessageSquare } from 'lucide-react';

export default function Messages() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hội thoại</h1>
        <p className="text-sm text-slate-500">
          Theo dõi tổng quan hội thoại trong hệ thống. Backend cung cấp endpoint
          <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">/api/conversations</code> &
          <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">/api/messages</code>.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
          <MessageSquare size={24} />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-800">
          Trang quản lý hội thoại sắp ra mắt
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Bạn sẽ có thể tìm kiếm hội thoại, kiểm duyệt nội dung và xử lý vi phạm tại đây.
        </p>
      </div>
    </div>
  );
}
