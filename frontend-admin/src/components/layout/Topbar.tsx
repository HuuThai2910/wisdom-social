import { Bell, LogOut, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur">
      <div className="relative w-full max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Tìm kiếm người dùng, trang, bài đăng..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
        >
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
        </button>

        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
          <img
            src={user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'A'}`}
            alt="avatar"
            className="h-8 w-8 rounded-full object-cover"
          />
          <div className="text-sm leading-tight">
            <p className="font-semibold text-slate-800">{user?.name || user?.username || 'Admin'}</p>
            <p className="text-xs text-slate-500">{user?.phone || 'Quản trị viên'}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut size={16} />
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
