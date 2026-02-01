import {
  BrowserRouter,
  Routes,
  Route,
  useParams,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import MainLayout from "./components/layout/MainLayout";
import PublicLayout from "./components/layout/PublicLayout";
import RequireAuth from "./components/auth/RequireAuth";
import PostModal from "./components/post/PostModal";

// Auth Pages
import Login from "./pages/LogIn";
import LoginWithEmail from "./pages/LoginWithEmail";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import CheckInbox from "./pages/CheckInbox";
import VerifyOTP from "./pages/VerifyOTP";
import ResetPassword from "./pages/ResetPassword";

// Private Pages
import Home from "./pages/Home";
import Feed from "./pages/Feed";
import Search from "./pages/Search";
import Explore from "./pages/Explore";
import Reels from "./pages/Reels";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import ProfileAccount from "./pages/ProfileAccount";
import ProfileMyPosts from "./pages/ProfileMyPosts";
import ProfileSavedPost from "./pages/ProfileSavedPost";
import ProfileTaggedPost from "./pages/ProfileTaggedPost";
import ProfileGeneral from "./pages/ProfileGeneral";
import CreatePost from "./pages/CreatePost";
import EditPost from "./pages/EditPost";
import Settings from "./pages/Settings";
import ProfileLayout from "./components/profile/ProfileLayout";

// Other Pages
import General from "./pages/General";
import Misc from "./pages/Misc";

function App() {
  // Modal wrapper component to handle post modal
  function PostModalWrapper() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const handleClose = () => {
      // Go back to the previous page or home
      if (location.state?.from) {
        navigate(location.state.from);
      } else {
        navigate(-1);
      }
    };

    if (!id) return null;

    return <PostModal postId={id} onClose={handleClose} />;
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/login/email" element={<LoginWithEmail />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/checkinbox" element={<CheckInbox />} />
              <Route path="/verify-otp" element={<VerifyOTP />} />
            </Route>

            {/* Private Routes */}
            <Route
              element={
                <RequireAuth>
                  <MainLayout />
                </RequireAuth>
              }
            >
              <Route path="/" element={<Home />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/search" element={<Search />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/reels" element={<Reels />} />
              <Route path="/notifications" element={<Notifications />} />

              {/* Post Modal Route */}
              <Route path="/post/:id" element={<PostModalWrapper />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/:conversationId" element={<Messages />} />
              <Route path="/create" element={<CreatePost />} />
              <Route path="/edit-post/:postId" element={<EditPost />} />

              {/* Profile Routes with nested tabs */}
              <Route path="/profile/:username" element={<ProfileLayout />}>
                <Route index element={<ProfileMyPosts />} />
                <Route path="posts" element={<ProfileMyPosts />} />
                <Route path="saved" element={<ProfileSavedPost />} />
                <Route path="tagged" element={<ProfileTaggedPost />} />
              </Route>

              <Route
                path="/profile/:username/general"
                element={<ProfileGeneral />}
              />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Other Routes */}
            <Route path="/general" element={<General />} />
            <Route path="/misc" element={<Misc />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

// Simple Not Found component
function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Page not found</p>
        <a href="/" className="text-blue-500 hover:text-blue-700 font-semibold">
          Go back home
        </a>
      </div>
    </div>
  );
}

export default App;
