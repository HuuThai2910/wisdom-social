import type { Page, Post, User } from '../types/models';

const VIETNAMESE_FIRST = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
  'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý',
];
const VIETNAMESE_MID = [
  'Văn', 'Thị', 'Hữu', 'Ngọc', 'Minh', 'Quang', 'Hồng', 'Thanh', 'Anh', 'Bảo',
  'Phương', 'Thuỳ', 'Hải', 'Thu', 'Xuân',
];
const VIETNAMESE_LAST = [
  'An', 'Bình', 'Châu', 'Dũng', 'Duy', 'Giang', 'Hà', 'Hải', 'Hạnh', 'Hiếu',
  'Hoa', 'Hùng', 'Khánh', 'Lan', 'Linh', 'Long', 'Mai', 'Minh', 'Nam', 'Ngân',
  'Ngọc', 'Nhi', 'Phong', 'Phú', 'Phúc', 'Quân', 'Quỳnh', 'Sơn', 'Tâm', 'Thảo',
  'Thắng', 'Thịnh', 'Thư', 'Trang', 'Trí', 'Trung', 'Tú', 'Tuấn', 'Vy', 'Yến',
];

const PAGE_CATEGORIES = [
  'Công nghệ', 'Giáo dục', 'Ẩm thực', 'Du lịch', 'Thể thao',
  'Giải trí', 'Thời trang', 'Sức khoẻ', 'Kinh doanh', 'Sách',
];

const PAGE_NAMES = [
  'Wisdom Tech', 'Hành Trình Bốn Mùa', 'Bếp Của Mẹ', 'Đọc Sách Cùng Tôi',
  'Chạy Bộ Sài Gòn', 'Du Lịch Việt', 'Code Mỗi Ngày', 'Học Tiếng Anh Cùng Mai',
  'Yoga Hà Nội', 'Cà Phê Sáng', 'Review Phim 24/7', 'Thời Trang Thanh Lịch',
  'Mẹ Và Bé', 'Bóng Đá Việt', 'Khởi Nghiệp 4.0', 'Sống Xanh',
  'Khoa Học Vui', 'Học Photoshop', 'Du Học Sinh', 'Ẩm Thực Đường Phố',
];

const POST_TEMPLATES = [
  'Hôm nay là một ngày đẹp trời ☀️',
  'Vừa hoàn thành một dự án nhỏ, mọi người ghé xem nhé!',
  'Có ai cùng đam mê chạy bộ buổi sáng không?',
  'Chia sẻ một quán cà phê cực chill ở Sài Gòn ☕️',
  'Cuối tuần này đi đâu nhỉ mọi người?',
  'Mới nhận giấy báo nhập học, vui quá đi 🎓',
  'Tiếng Anh giao tiếp - Mẹo phát âm chuẩn người bản xứ',
  'Một bức hình chụp lúc hoàng hôn ở Đà Lạt 🌄',
  'Review phim vừa xem tối qua, đáng để cày!',
  'Học lập trình từ con số 0, các bạn có thể bắt đầu từ JavaScript.',
  'Hôm nay tự nấu bữa tối, mọi người chấm điểm giúp 🍲',
  'Mình vừa hoàn thành chiếc tranh đầu tiên, hihi 🎨',
  'Cảm ơn 10K người đã theo dõi page nhé! ❤️',
  'Bài tập Yoga cho dân văn phòng - chỉ 10 phút mỗi ngày',
  'Khám phá làng cổ Đường Lâm - một mảng ký ức xưa',
  'Có ai chơi game co-op không, kết bạn với mình nhé!',
  'Chia sẻ một số lời khuyên cho các bạn mới ra trường.',
  'Hôm nay sinh nhật mình, chúc bản thân thật nhiều bình an 🎂',
  'Một tách trà chanh giải nhiệt mùa hè 🍋',
  'Đặt vé chuyến bay sớm - tip để tiết kiệm 30%.',
];

const HASHTAGS = [
  'wisdomsocial', 'daily', 'lifestyle', 'travel', 'food', 'coding', 'tech',
  'study', 'health', 'fitness', 'photography', 'movies', 'book', 'startup',
];

const LOCK_REASONS = [
  'Spam tin nhắn hàng loạt',
  'Vi phạm chính sách cộng đồng',
  'Đăng nội dung không phù hợp',
  'Sử dụng từ ngữ thù ghét',
  'Chia sẻ thông tin sai sự thật',
  'Mạo danh người khác',
];

let _seed = 1234567;
function rand(): number {
  // Linear-congruential generator → tránh phụ thuộc vào Math.random để dataset ổn định
  _seed = (_seed * 1103515245 + 12345) & 0x7fffffff;
  return _seed / 0x7fffffff;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function vietnameseName(): string {
  return `${pick(VIETNAMESE_FIRST)} ${pick(VIETNAMESE_MID)} ${pick(VIETNAMESE_LAST)}`;
}

function makeUsername(name: string, id: number): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 12);
  return `${slug}${id}`;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(randInt(0, 23), randInt(0, 59), randInt(0, 59), 0);
  return d.toISOString();
}

// ─── Users ─────────────────────────────────────────────────────────────────────

export function generateMockUsers(count = 80): User[] {
  const users: User[] = [];
  for (let i = 1; i <= count; i++) {
    const name = vietnameseName();
    const username = makeUsername(name, i);
    const gender = pick(['MALE', 'FEMALE', 'HIDDEN'] as const);
    const locked = rand() < 0.12;
    const createdDaysAgo = randInt(0, 180);
    users.push({
      id: i,
      name,
      username,
      phone: `09${randInt(10000000, 99999999)}`,
      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
      birthday: `${String(randInt(1, 28)).padStart(2, '0')}/${String(randInt(1, 12)).padStart(2, '0')}/${randInt(1980, 2008)}`,
      bio: rand() < 0.6 ? pick([
        'Yêu cuộc sống đơn giản 🌿',
        'Chỉ là một người thích đọc sách 📚',
        'Lập trình viên, chạy bộ, mê cà phê.',
        'Sinh viên năm cuối, đang đi tìm chính mình.',
        'Travel enthusiast ✈️',
      ]) : undefined,
      gender,
      locked,
      lockReason: locked ? pick(LOCK_REASONS) : undefined,
      lockedAt: locked ? isoDaysAgo(randInt(0, 30)) : undefined,
      lockedBy: locked ? 'admin' : undefined,
      createdAt: isoDaysAgo(createdDaysAgo),
      updatedAt: isoDaysAgo(randInt(0, createdDaysAgo)),
      lastActiveAt: isoDaysAgo(randInt(0, 14)),
      confirmUseAI: rand() < 0.4,
    });
  }
  return users;
}

// ─── Pages ─────────────────────────────────────────────────────────────────────

export function generateMockPages(users: User[], count = 24): Page[] {
  const pages: Page[] = [];
  for (let i = 1; i <= count; i++) {
    const name = i <= PAGE_NAMES.length ? PAGE_NAMES[i - 1] : `${pick(PAGE_NAMES)} #${i}`;
    const owner = pick(users);
    const status = pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'PENDING', 'BLOCKED'] as const);
    pages.push({
      id: i,
      name,
      username: makeUsername(name, i),
      category: pick(PAGE_CATEGORIES),
      description: pick([
        'Nơi chia sẻ kiến thức mỗi ngày dành cho cộng đồng.',
        'Cùng nhau khám phá và lan toả những điều tích cực.',
        'Chuyên trang review, chia sẻ kinh nghiệm thực tế.',
        'Cập nhật xu hướng mới nhất từ Việt Nam và thế giới.',
      ]),
      avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=page${i}`,
      coverUrl: `https://picsum.photos/seed/cover${i}/640/200`,
      phone: `028${randInt(10000000, 99999999)}`,
      email: `contact${i}@wisdom.social`,
      website: `https://page${i}.wisdom.social`,
      address: `${randInt(1, 999)} Nguyễn Trãi, TP.HCM`,
      isVerified: rand() < 0.3,
      status,
      createdBy: owner,
      createdAt: isoDaysAgo(randInt(1, 365)),
      updatedAt: isoDaysAgo(randInt(0, 30)),
    });
  }
  return pages;
}

// ─── Posts ─────────────────────────────────────────────────────────────────────

export function generateMockPostsForUser(userId: number, count = 6): Post[] {
  const posts: Post[] = [];
  for (let i = 1; i <= count; i++) {
    const hasMedia = rand() < 0.55;
    const numMedia = hasMedia ? randInt(1, 4) : 0;
    posts.push({
      id: `${userId}-post-${i}`,
      authorId: String(userId),
      content: pick(POST_TEMPLATES),
      privacy: pick(['PUBLIC', 'PUBLIC', 'FRIENDS', 'PRIVATE'] as const),
      media: Array.from({ length: numMedia }).map((_, idx) => ({
        url: `https://picsum.photos/seed/u${userId}p${i}m${idx}/600/400`,
        type: 'image',
      })),
      hashtags: Array.from({ length: randInt(0, 3) }).map(() => pick(HASHTAGS)),
      mentions: [],
      taggedUserIds: [],
      stats: {
        reactionCount: randInt(0, 350),
        commentCount: randInt(0, 80),
        shareCount: randInt(0, 40),
        viewCount: randInt(50, 5000),
      },
      status: pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'HIDDEN'] as const),
      isEdited: rand() < 0.2,
      allowComments: true,
      allowShares: true,
      createdAt: isoDaysAgo(randInt(0, 90)),
      updatedAt: isoDaysAgo(randInt(0, 5)),
    });
  }
  return posts;
}

// ─── Activity Logs ─────────────────────────────────────────────────────────────

export type LogAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'REGISTER'
  | 'CREATE_POST'
  | 'DELETE_POST'
  | 'UPDATE_PROFILE'
  | 'PASSWORD_RESET'
  | 'BLOCK_USER'
  | 'UNBLOCK_USER'
  | 'SEND_FRIEND_REQUEST'
  | 'ACCEPT_FRIEND_REQUEST'
  | 'CREATE_PAGE'
  | 'DELETE_PAGE'
  | 'JOIN_PAGE'
  | 'REPORT_CONTENT'
  | 'UPLOAD_AVATAR'
  | 'CHANGE_PASSWORD'
  | 'LOCK_USER'
  | 'UNLOCK_USER'
  | 'FAILED_LOGIN';

export type LogStatus = 'SUCCESS' | 'FAILED' | 'WARNING';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ActivityLog {
  id: number;
  userId: number;
  userName: string;
  userAvatar: string;
  action: LogAction;
  description: string;
  apiEndpoint: string;
  httpMethod: HttpMethod;
  responseStatus: number;
  ipAddress: string;
  device: string;
  browser: string;
  status: LogStatus;
  createdAt: string;
}

interface ActionMeta {
  label: string;
  weight: number;
  status: LogStatus[];
  method: HttpMethod;
  // Cho phép path động → resolveEndpoint sẽ thay :userId / :postId / :pageId
  endpoint: string;
}

const ACTION_DETAILS: Record<LogAction, ActionMeta> = {
  LOGIN:                 { label: 'Đăng nhập tài khoản',         weight: 18, status: ['SUCCESS', 'SUCCESS'], method: 'POST',   endpoint: '/api/auth/login' },
  LOGOUT:                { label: 'Đăng xuất tài khoản',         weight: 12, status: ['SUCCESS'],            method: 'POST',   endpoint: '/api/auth/logout' },
  REGISTER:              { label: 'Đăng ký tài khoản mới',       weight: 4,  status: ['SUCCESS'],            method: 'POST',   endpoint: '/api/auth/register' },
  CREATE_POST:           { label: 'Tạo bài đăng mới',            weight: 10, status: ['SUCCESS'],            method: 'POST',   endpoint: '/api/posts' },
  DELETE_POST:           { label: 'Xoá bài đăng',                weight: 4,  status: ['SUCCESS'],            method: 'DELETE', endpoint: '/api/posts/:postId' },
  UPDATE_PROFILE:        { label: 'Cập nhật hồ sơ cá nhân',      weight: 6,  status: ['SUCCESS'],            method: 'PUT',    endpoint: '/api/auth/users/:userId' },
  PASSWORD_RESET:        { label: 'Đặt lại mật khẩu qua OTP',    weight: 3,  status: ['SUCCESS'],            method: 'POST',   endpoint: '/api/auth/reset-password' },
  BLOCK_USER:            { label: 'Chặn người dùng khác',        weight: 3,  status: ['SUCCESS'],            method: 'POST',   endpoint: '/api/auth/users/block' },
  UNBLOCK_USER:          { label: 'Bỏ chặn người dùng',          weight: 2,  status: ['SUCCESS'],            method: 'POST',   endpoint: '/api/auth/users/cancel-block' },
  SEND_FRIEND_REQUEST:   { label: 'Gửi lời mời kết bạn',         weight: 6,  status: ['SUCCESS'],            method: 'POST',   endpoint: '/api/friends/request' },
  ACCEPT_FRIEND_REQUEST: { label: 'Chấp nhận lời mời kết bạn',   weight: 5,  status: ['SUCCESS'],            method: 'POST',   endpoint: '/api/friends/accept' },
  CREATE_PAGE:           { label: 'Tạo trang mới',               weight: 2,  status: ['SUCCESS'],            method: 'POST',   endpoint: '/api/page/create' },
  DELETE_PAGE:           { label: 'Xoá trang',                   weight: 1,  status: ['SUCCESS'],            method: 'DELETE', endpoint: '/api/page/delete/:pageId' },
  JOIN_PAGE:             { label: 'Tham gia trang',              weight: 4,  status: ['SUCCESS'],            method: 'POST',   endpoint: '/api/page-member/request-join' },
  REPORT_CONTENT:        { label: 'Báo cáo nội dung vi phạm',    weight: 3,  status: ['SUCCESS', 'WARNING'], method: 'POST',   endpoint: '/api/reports' },
  UPLOAD_AVATAR:         { label: 'Cập nhật ảnh đại diện',       weight: 4,  status: ['SUCCESS'],            method: 'GET',    endpoint: '/api/auth/users/update/upload-avatar' },
  CHANGE_PASSWORD:       { label: 'Đổi mật khẩu',                weight: 2,  status: ['SUCCESS'],            method: 'POST',   endpoint: '/api/auth/reset-password' },
  LOCK_USER:             { label: 'Tài khoản bị admin khoá',     weight: 1,  status: ['WARNING'],            method: 'POST',   endpoint: '/api/admin/lock/:userId' },
  UNLOCK_USER:           { label: 'Tài khoản được mở khoá',      weight: 1,  status: ['SUCCESS'],            method: 'POST',   endpoint: '/api/admin/unlock/:userId' },
  FAILED_LOGIN:          { label: 'Đăng nhập thất bại',          weight: 5,  status: ['FAILED'],             method: 'POST',   endpoint: '/api/auth/login' },
};

function resolveEndpoint(template: string, userId: number): string {
  return template
    .replace(':userId', String(userId))
    .replace(':postId', String(randInt(1000, 9999)))
    .replace(':pageId', String(randInt(1, 30)));
}

function resolveResponseStatus(action: LogAction, status: LogStatus): number {
  if (status === 'FAILED') {
    if (action === 'FAILED_LOGIN') return pick([401, 401, 401, 403]);
    return pick([400, 404, 500]);
  }
  if (status === 'WARNING') return pick([200, 202, 207]);
  if (action === 'CREATE_POST' || action === 'CREATE_PAGE' || action === 'REGISTER') return 201;
  if (action === 'DELETE_POST' || action === 'DELETE_PAGE') return 200;
  return 200;
}

const DEVICES = ['Windows 11', 'macOS Sonoma', 'Ubuntu 22.04', 'iOS 17', 'Android 14'];
const BROWSERS = ['Chrome 120', 'Edge 121', 'Firefox 122', 'Safari 17', 'Mobile Safari'];

function weightedActions(): LogAction[] {
  const pool: LogAction[] = [];
  (Object.keys(ACTION_DETAILS) as LogAction[]).forEach((a) => {
    for (let i = 0; i < ACTION_DETAILS[a].weight; i++) pool.push(a);
  });
  return pool;
}

function randomIp(): string {
  return `${randInt(1, 255)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(0, 255)}`;
}

export function generateMockLogs(users: User[], count = 200): ActivityLog[] {
  const pool = weightedActions();
  const logs: ActivityLog[] = [];

  for (let i = 1; i <= count; i++) {
    const user = pick(users);
    const action = pick(pool);
    const meta = ACTION_DETAILS[action];
    const status = pick(meta.status);
    logs.push({
      id: i,
      userId: user.id,
      userName: user.name || user.username || `User #${user.id}`,
      userAvatar:
        user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username || user.id}`,
      action,
      description: meta.label,
      apiEndpoint: resolveEndpoint(meta.endpoint, user.id),
      httpMethod: meta.method,
      responseStatus: resolveResponseStatus(action, status),
      ipAddress: randomIp(),
      device: pick(DEVICES),
      browser: pick(BROWSERS),
      status,
      createdAt: isoDaysAgo(randInt(0, 30)),
    });
  }

  return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ─── Bộ dữ liệu mặc định ──────────────────────────────────────────────────────

export const MOCK_USERS = generateMockUsers(80);
export const MOCK_PAGES = generateMockPages(MOCK_USERS, 24);
export const MOCK_POSTS_BY_USER = new Map<number, Post[]>(
  MOCK_USERS.map((u) => [u.id, generateMockPostsForUser(u.id, randInt(2, 9))])
);
export const MOCK_LOGS = generateMockLogs(MOCK_USERS, 200);
