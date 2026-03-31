import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
    ArrowLeft, Heart, UserPlus, Settings, Users, Loader2,
    Globe, Phone, Mail, MapPin, Link as LinkIcon,
    MoreHorizontal, Clock, CheckCircle, XCircle, Lock, FileText
} from "lucide-react";
import pageService, { type Page, type PageMember } from "../services/pageService";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { buildS3Url } from "../utils/s3";

type MemberStatus = "loading" | "none" | "pending" | "member" | "admin" | "owner" | "blocked";

export default function PageDetail() {
    const { pageId } = useParams();
    const navigate = useNavigate();
    const currentUser = useCurrentUser();
    
    const [page, setPage] = useState<Page | null>(null);
    const [loading, setLoading] = useState(true);
    const [memberStatus, setMemberStatus] = useState<MemberStatus>("loading");
    const [memberCount, setMemberCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const loadPageData = useCallback(async () => {
        if (!pageId) return;

        setLoading(true);
        try {
            const [pageData, count] = await Promise.all([
                pageService.getPageById(Number(pageId)),
                pageService.getMemberCount(Number(pageId)),
            ]);
            setPage(pageData);
            setMemberCount(count);

            // Check if owner directly from page data
            if (currentUser?.id && pageData.userId === currentUser.id) {
                setMemberStatus("owner");
            } else if (currentUser?.id) {
                // Load member status for non-owner
                try {
                    const status = await pageService.getMemberStatus(Number(pageId), currentUser.id);
                    if (status === "ADMIN") setMemberStatus("admin");
                    else if (status === "MEMBER" || status === "ACTIVE") setMemberStatus("member");
                    else if (status === "PENDING") setMemberStatus("pending");
                    else if (status === "BLOCKED") setMemberStatus("blocked");
                    else setMemberStatus("none");
                } catch (e) {
                    setMemberStatus("none");
                }

                // Load interaction status
                try {
                    const interactionStatus = await pageService.getPageInteractionStatus(Number(pageId));
                    setIsLiked(interactionStatus.isLiked || false);
                    setIsFollowing(interactionStatus.isFollowing || false);
                } catch (e) {
                    // Interaction status endpoint might not exist
                }
            } else {
                setMemberStatus("none");
            }
        } catch (error) {
            console.error("Error loading page:", error);
        } finally {
            setLoading(false);
        }
    }, [pageId, currentUser?.id]);

    useEffect(() => {
        loadPageData();
    }, [loadPageData]);

    const handleLike = async () => {
        if (!currentUser?.id || !pageId) return;
        
        setActionLoading(true);
        try {
            if (isLiked) {
                await pageService.cancelLikePage(currentUser.id, Number(pageId));
                setIsLiked(false);
            } else {
                await pageService.likePage(currentUser.id, Number(pageId));
                setIsLiked(true);
            }
        } catch (error) {
            console.error("Error toggling like:", error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleFollow = async () => {
        if (!currentUser?.id || !pageId) return;
        
        setActionLoading(true);
        try {
            if (isFollowing) {
                await pageService.cancelFollowPage(currentUser.id, Number(pageId));
                setIsFollowing(false);
            } else {
                await pageService.followPage(currentUser.id, Number(pageId));
                setIsFollowing(true);
            }
        } catch (error) {
            console.error("Error toggling follow:", error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleJoinRequest = async () => {
        if (!currentUser?.id || !pageId) return;
        
        setActionLoading(true);
        try {
            if (memberStatus === "pending") {
                await pageService.cancelJoinRequest(Number(pageId), currentUser.id);
                setMemberStatus("none");
            } else {
                await pageService.requestJoinPage(currentUser.id, Number(pageId));
                setMemberStatus("pending");
            }
        } catch (error) {
            console.error("Error handling join request:", error);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    if (!page) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <p className="text-gray-500 dark:text-gray-400 mb-4">Page không tồn tại</p>
                <button onClick={() => navigate("/pages")} className="text-blue-500 hover:underline">
                    Quay lại danh sách
                </button>
            </div>
        );
    }

    const isOwnerOrAdmin = memberStatus === "owner" || memberStatus === "admin";

    return (
        <div className="max-w-4xl mx-auto">
            {/* Cover Image */}
            <div className="relative h-48 md:h-64 bg-gradient-to-r from-blue-500 to-purple-600">
                {page.coverUrl && (
                    <img
                        src={buildS3Url(page.coverUrl)}
                        alt="Cover"
                        className="w-full h-full object-cover"
                    />
                )}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                
                {isOwnerOrAdmin && (
                    <Link
                        to={`/pages/${pageId}/settings`}
                        className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                        <Settings size={20} />
                    </Link>
                )}
            </div>

            {/* Page Info */}
            <div className="px-4 md:px-6 pb-6">
                {/* Avatar & Basic Info */}
                <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12 md:-mt-16 mb-6">
                    <img
                        src={buildS3Url(page.avatarUrl) || "https://via.placeholder.com/120"}
                        alt={page.name}
                        className="w-24 h-24 md:w-32 md:h-32 rounded-xl object-cover border-4 border-white dark:border-black shadow-lg"
                    />
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl md:text-3xl font-bold dark:text-white">
                                {page.name}
                            </h1>
                            {page.isVerified && (
                                <span className="text-blue-500 text-xl">✓</span>
                            )}
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">@{page.username}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                                {page.status === "PRIVATE" ? (
                                    <>
                                        <Lock size={16} />
                                        Riêng tư
                                    </>
                                ) : (
                                    <>
                                        <Globe size={16} />
                                        Công khai
                                    </>
                                )}
                            </span>
                            <span className="flex items-center gap-1">
                                <Globe size={16} />
                                {page.category}
                            </span>
                            <span className="flex items-center gap-1">
                                <Users size={16} />
                                {memberCount} thành viên
                            </span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 mb-6">
                    {/* Owner/Admin Management Buttons */}
                    {memberStatus === "owner" && (
                        <>
                            <Link
                                to={`/pages/${pageId}/settings`}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
                            >
                                <Users size={20} />
                                Quản lý page
                            </Link>
                            <Link
                                to={`/pages/${pageId}/edit`}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                            >
                                <Settings size={20} />
                                Sửa page
                            </Link>
                        </>
                    )}
                    {memberStatus === "admin" && (
                        <>
                            <Link
                                to={`/pages/${pageId}/settings`}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
                            >
                                <Users size={20} />
                                Quản lý page
                            </Link>
                            <Link
                                to={`/pages/${pageId}/posts`}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                            >
                                <FileText size={20} />
                                Duyệt bài viết
                            </Link>
                        </>
                    )}

                    {/* Regular User Buttons */}
                    <button
                        onClick={handleLike}
                        disabled={actionLoading || !currentUser}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                            isLiked
                                ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-gray-100 dark:bg-[#363636] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#454545]"
                        }`}
                    >
                        <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                        {isLiked ? "Đã thích" : "Thích"}
                    </button>

                    <button
                        onClick={handleFollow}
                        disabled={actionLoading || !currentUser}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                            isFollowing
                                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-blue-500 text-white hover:bg-blue-600"
                        }`}
                    >
                        <UserPlus size={20} />
                        {isFollowing ? "Đang theo dõi" : "Theo dõi"}
                    </button>

                    {memberStatus === "loading" ? (
                        <div className="px-4 py-2 bg-gray-100 dark:bg-[#363636] rounded-lg">
                            <Loader2 className="animate-spin" size={20} />
                        </div>
                    ) : memberStatus === "blocked" ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg font-medium">
                            <XCircle size={20} />
                            Đã bị chặn
                        </div>
                    ) : memberStatus === "none" ? (
                        <button
                            onClick={handleJoinRequest}
                            disabled={actionLoading || !currentUser}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                        >
                            <UserPlus size={20} />
                            {page.status === "PRIVATE" ? "Xin tham gia" : "Tham gia"}
                        </button>
                    ) : memberStatus === "pending" ? (
                        <button
                            onClick={handleJoinRequest}
                            disabled={actionLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-lg font-medium hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
                        >
                            <Clock size={20} />
                            Đang chờ duyệt
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg font-medium">
                            <CheckCircle size={20} />
                            {memberStatus === "owner" ? "Chủ sở hữu" : memberStatus === "admin" ? "Quản trị viên" : "Thành viên"}
                        </div>
                    )}
                </div>

                {/* Description */}
                {page.description && (
                    <div className="mb-6">
                        <h3 className="font-semibold dark:text-white mb-2">Giới thiệu</h3>
                        <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
                            {page.description}
                        </p>
                    </div>
                )}

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl">
                    {page.phone && (
                        <a
                            href={`tel:${page.phone}`}
                            className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-blue-500"
                        >
                            <Phone size={18} />
                            {page.phone}
                        </a>
                    )}
                    {page.email && (
                        <a
                            href={`mailto:${page.email}`}
                            className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-blue-500"
                        >
                            <Mail size={18} />
                            {page.email}
                        </a>
                    )}
                    {page.website && (
                        <a
                            href={page.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-blue-500"
                        >
                            <LinkIcon size={18} />
                            {page.website}
                        </a>
                    )}
                    {page.address && (
                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                            <MapPin size={18} />
                            {page.address}
                        </div>
                    )}
                </div>

                {/* Page Posts Section - Placeholder */}
                <div className="mt-8">
                    <h3 className="text-xl font-semibold dark:text-white mb-4">Bài viết</h3>
                    <div className="text-center py-12 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl">
                        <p className="text-gray-500 dark:text-gray-400">
                            Chưa có bài viết nào
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
