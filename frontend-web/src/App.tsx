import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import MainLayout from "./components/layout/MainLayout";
import PublicLayout from "./components/layout/PublicLayout";
import RequireAuth from "./components/auth/RequireAuth";

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
import MessagesWhite from "./pages/MessagesWhite";
import Post from "./pages/Post";
import ProfileAccount from "./pages/ProfileAccount";
import ProfileMyPosts from "./pages/ProfileMyPosts";
import ProfileSavedPost from "./pages/ProfileSavedPost";
import ProfileGeneral from "./pages/ProfileGeneral";
import CreatePost from "./pages/CreatePost";

// Other Pages
import General from "./pages/General";
import Misc from "./pages/Misc";

function App() {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public Routes */}
                    <Route element={<PublicLayout />}>
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/login/email"
                            element={<LoginWithEmail />}
                        />
                        <Route path="/signup" element={<SignUp />} />
                        <Route
                            path="/forgot-password"
                            element={<ForgotPassword />}
                        />
                        <Route path="/checkinbox" element={<CheckInbox />} />
                        <Route path="/verify-otp" element={<VerifyOTP />} />
                        <Route
                            path="/reset-password"
                            element={<ResetPassword />}
                        />
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
                        <Route
                            path="/notifications"
                            element={<Notifications />}
                        />
                        <Route path="/messages" element={<Messages />} />
                        <Route
                            path="/messages/:chatId"
                            element={<MessagesWhite />}
                        />
                        <Route path="/create" element={<CreatePost />} />
                        <Route path="/post/:id" element={<Post />} />

                        <Route
                            path="/profile/:username"
                            element={<ProfileAccount />}
                        />
                        <Route
                            path="/profile/:username/posts"
                            element={<ProfileMyPosts />}
                        />
                        <Route
                            path="/profile/:username/saved"
                            element={<ProfileSavedPost />}
                        />
                        <Route
                            path="/profile/:username/general"
                            element={<ProfileGeneral />}
                        />
                    </Route>

                    {/* Other Routes */}
                    <Route path="/general" element={<General />} />
                    <Route path="/misc" element={<Misc />} />

                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

// Simple Not Found component
function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
                <p className="text-xl text-gray-600 mb-8">Page not found</p>
                <a
                    href="/"
                    className="text-blue-500 hover:text-blue-700 font-semibold"
                >
                    Go back home
                </a>
            </div>
        </div>
    );
}

export default App;
