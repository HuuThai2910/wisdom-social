import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
    ArrowLeft, Loader2, Users, UserPlus, UserMinus, Shield, 
    Ban, CheckCircle, XCircle, Clock, Trash2, Settings as SettingsIcon,
    Edit, Image, MoreVertical, FileText
} from "lucide-react";
import pageService, { type Page, type PageMember } from "../services/pageService";
import userService from "../services/userService";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { buildS3Url } from "../utils/s3";
import type { User } from "../types";

type TabType = "members" | "pending" | "posts" | "settings";

interface MemberWithUser extends PageMember {
    user?: User;
}

export default function PageSettings() {
    const { pageId } = useParams();
    const navigate = useNavigate();
    const currentUser = useCurrentUser();
    
    const [page, setPage] = useState<Page | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>("members");
    const [members, setMembers] = useState<MemberWithUser[]>([]);
    const [pendingRequests, setPendingRequests] = useState<MemberWithUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [isOwner, setIsOwner] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const loadPageData = useCallback(async () => {
        if (!pageId || !currentUser?.id) return;
        
        setLoading(true);
        try {
            const [pageData, membersList, pendingList, memberStatus] = await Promise.all([
                pageService.getPageById(Number(pageId)),
                pageService.getPageMembers(Number(pageId)),
                pageService.getPendingJoinRequests(Number(pageId)),
                pageService.getMemberStatus(Number(pageId), currentUser.id),
            ]);
            
            setPage(pageData);
            setIsOwner(pageData.userId === currentUser.id);
            setIsAdmin(memberStatus === "ADMIN" || memberStatus === "OWNER" || pageData.userId === currentUser.id);

            // Load user info for members
            const membersWithUsers = await Promise.all(
                membersList.map(async (member) => {
                    try {
                        const user = await userService.getUserProfile(member.userId);
                        return { ...member, user: user as any };
                    } catch {
                        return member;
                    }
                })
            );
            setMembers(membersWithUsers);

            // Load user info for pending requests
            const pendingWithUsers = await Promise.all(
                pendingList.map(async (request) => {
                    try {
                        const user = await userService.getUserProfile(request.userId);
                        return { ...request, user: user as any };
                    } catch {
                        return request;
                    }
                })
            );
            setPendingRequests(pendingWithUsers);
        } catch (error) {
            console.error("Error loading page settings:", error);
        } finally {
            setLoading(false);
        }
    }, [pageId, currentUser?.id]);

    useEffect(() => {
        loadPageData();
    }, [loadPageData]);

    const handleApproveRequest = async (userId: number) => {
        if (!pageId) return;
        
        setActionLoading(userId);
        try {
            await pageService.approveJoinRequest(Number(pageId), userId);
            // Move from pending to members
            const approved = pendingRequests.find(r => r.userId === userId);
            if (approved) {
                setPendingRequests(prev => prev.filter(r => r.userId !== userId));
                setMembers(prev => [...prev, { ...approved, memberStatus: "MEMBER", pageRole: "MEMBER" }]);
            }
        } catch (error) {
            console.error("Error approving request:", error);
            alert("Không thể duyệt yêu cầu");
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectRequest = async (userId: number) => {
        if (!pageId) return;
        
        setActionLoading(userId);
        try {
            await pageService.rejectJoinRequest(Number(pageId), userId);
            setPendingRequests(prev => prev.filter(r => r.userId !== userId));
        } catch (error) {
            console.error("Error rejecting request:", error);
            alert("Không thể từ chối yêu cầu");
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemoveMember = async (userId: number) => {
        if (!pageId) return;
        
        if (!confirm("Bạn có chắc muốn xóa thành viên này?")) return;
        
        setActionLoading(userId);
        try {
            await pageService.deleteMember(Number(pageId), userId);
            setMembers(prev => prev.filter(m => m.userId !== userId));
        } catch (error) {
            console.error("Error removing member:", error);
            alert("Không thể xóa thành viên");
        } finally {
            setActionLoading(null);
        }
    };

    const handleBlockMember = async (userId: number) => {
        if (!pageId) return;
        
        if (!confirm("Bạn có chắc muốn chặn thành viên này?")) return;
        
        setActionLoading(userId);
        try {
            await pageService.blockMember(Number(pageId), userId);
            setMembers(prev => prev.map(m => 
                m.userId === userId ? { ...m, memberStatus: "BLOCKED" } : m
            ));
        } catch (error) {
            console.error("Error blocking member:", error);
            alert("Không thể chặn thành viên");
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnblockMember = async (userId: number) => {
        if (!pageId) return;
        
        setActionLoading(userId);
        try {
            await pageService.unblockMember(Number(pageId), userId);
            setMembers(prev => prev.map(m => 
                m.userId === userId ? { ...m, memberStatus: "MEMBER" } : m
            ));
        } catch (error) {
            console.error("Error unblocking member:", error);
            alert("Không thể bỏ chặn thành viên");
        } finally {
            setActionLoading(null);
        }
    };

    const handlePromoteToAdmin = async (userId: number) => {
        if (!pageId) return;
        
        setActionLoading(userId);
        try {
            await pageService.authorizeMember(userId, Number(pageId), "ADMIN");
            setMembers(prev => prev.map(m => 
                m.userId === userId ? { ...m, pageRole: "ADMIN" } : m
            ));
        } catch (error) {
            console.error("Error promoting member:", error);
            alert("Không thể thăng cấp thành viên");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDemoteToMember = async (userId: number) => {
        if (!pageId) return;
        
        setActionLoading(userId);
        try {
            await pageService.authorizeMember(userId, Number(pageId), "MEMBER");
            setMembers(prev => prev.map(m => 
                m.userId === userId ? { ...m, pageRole: "MEMBER" } : m
            ));
        } catch (error) {
            console.error("Error demoting member:", error);
            alert("Không thể hạ cấp thành viên");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeletePage = async () => {
        if (!pageId || !isOwner) return;
        
        if (!confirm("Bạn có chắc muốn XÓA page này? Hành động này không thể hoàn tác!")) return;
        if (!confirm("Xác nhận lần cuối: XÓA VĨNH VIỄN page này?")) return;
        
        try {
            await pageService.deletePage(Number(pageId));
            alert("Đã xóa page thành công");
            navigate("/pages");
        } catch (error) {
            console.error("Error deleting page:", error);
            alert("Không thể xóa page");
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

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate(`/pages/${pageId}`)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-[#363636] rounded-full transition-colors"
                >
                    <ArrowLeft size={24} className="dark:text-white" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold dark:text-white">Quản lý Page</h1>
                    <p className="text-gray-500 dark:text-gray-400">{page.name}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-[#363636] overflow-x-auto">
                <button
                    onClick={() => setActiveTab("members")}
                    className={`pb-3 px-1 font-medium whitespace-nowrap transition-colors ${
                        activeTab === "members"
                            ? "text-blue-500 border-b-2 border-blue-500"
                            : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                >
                    <Users className="inline mr-2" size={18} />
                    Thành viên ({members.length})
                </button>
                {isAdmin && (
                    <button
                        onClick={() => setActiveTab("pending")}
                        className={`pb-3 px-1 font-medium whitespace-nowrap transition-colors ${
                            activeTab === "pending"
                                ? "text-blue-500 border-b-2 border-blue-500"
                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        <Clock className="inline mr-2" size={18} />
                        Chờ duyệt ({pendingRequests.length})
                    </button>
                )}
                {isAdmin && (
                    <button
                        onClick={() => setActiveTab("posts")}
                        className={`pb-3 px-1 font-medium whitespace-nowrap transition-colors ${
                            activeTab === "posts"
                                ? "text-blue-500 border-b-2 border-blue-500"
                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        <FileText className="inline mr-2" size={18} />
                        Bài viết
                    </button>
                )}
                {isOwner && (
                    <button
                        onClick={() => setActiveTab("settings")}
                        className={`pb-3 px-1 font-medium whitespace-nowrap transition-colors ${
                            activeTab === "settings"
                                ? "text-blue-500 border-b-2 border-blue-500"
                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        <SettingsIcon className="inline mr-2" size={18} />
                        Cài đặt
                    </button>
                )}
            </div>

            {/* Members Tab */}
            {activeTab === "members" && (
                <div className="space-y-3">
                    {members.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            Chưa có thành viên nào
                        </div>
                    ) : (
                        members.map((member) => (
                            <div
                                key={member.userId}
                                className="flex items-center justify-between p-4 bg-white dark:bg-[#262626] rounded-xl border border-gray-200 dark:border-[#363636]"
                            >
                                <div className="flex items-center gap-3">
                                    <img
                                        src={buildS3Url(member.user?.avatarUrl) || "https://via.placeholder.com/40"}
                                        alt={member.user?.username}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium dark:text-white">
                                                {member.user?.username || `User #${member.userId}`}
                                            </span>
                                            {member.pageRole === "OWNER" && (
                                                <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full">
                                                    Chủ sở hữu
                                                </span>
                                            )}
                                            {member.pageRole === "ADMIN" && (
                                                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                                                    Quản trị viên
                                                </span>
                                            )}
                                            {member.memberStatus === "BLOCKED" && (
                                                <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                                                    Đã chặn
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {member.user?.fullName || member.user?.name}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                {member.pageRole !== "OWNER" && isOwner && (
                                    <div className="flex items-center gap-2">
                                        {actionLoading === member.userId ? (
                                            <Loader2 className="animate-spin text-gray-400" size={20} />
                                        ) : (
                                            <>
                                                {member.memberStatus === "BLOCKED" ? (
                                                    <button
                                                        onClick={() => handleUnblockMember(member.userId)}
                                                        className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                                                        title="Bỏ chặn"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                ) : (
                                                    <>
                                                        {member.pageRole === "ADMIN" ? (
                                                            <button
                                                                onClick={() => handleDemoteToMember(member.userId)}
                                                                className="p-2 text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg"
                                                                title="Hạ cấp"
                                                            >
                                                                <UserMinus size={18} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handlePromoteToAdmin(member.userId)}
                                                                className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                                                title="Thăng cấp Admin"
                                                            >
                                                                <Shield size={18} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleBlockMember(member.userId)}
                                                            className="p-2 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg"
                                                            title="Chặn"
                                                        >
                                                            <Ban size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemoveMember(member.userId)}
                                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                            title="Xóa"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Pending Requests Tab */}
            {activeTab === "pending" && (
                <div className="space-y-3">
                    {pendingRequests.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            Không có yêu cầu nào đang chờ duyệt
                        </div>
                    ) : (
                        pendingRequests.map((request) => (
                            <div
                                key={request.userId}
                                className="flex items-center justify-between p-4 bg-white dark:bg-[#262626] rounded-xl border border-gray-200 dark:border-[#363636]"
                            >
                                <div className="flex items-center gap-3">
                                    <img
                                        src={buildS3Url(request.user?.avatarUrl) || "https://via.placeholder.com/40"}
                                        alt={request.user?.username}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                    <div>
                                        <span className="font-medium dark:text-white">
                                            {request.user?.username || `User #${request.userId}`}
                                        </span>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {request.user?.fullName || request.user?.name}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {actionLoading === request.userId ? (
                                        <Loader2 className="animate-spin text-gray-400" size={20} />
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleApproveRequest(request.userId)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                                            >
                                                <CheckCircle size={16} />
                                                Duyệt
                                            </button>
                                            <button
                                                onClick={() => handleRejectRequest(request.userId)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                                            >
                                                <XCircle size={16} />
                                                Từ chối
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Posts Tab - Admin only */}
            {activeTab === "posts" && (
                <div className="space-y-3">
                    <Link
                        to={`/pages/${pageId}/posts`}
                        className="flex items-center justify-between p-4 bg-white dark:bg-[#262626] rounded-xl border border-gray-200 dark:border-[#363636] hover:bg-gray-50 dark:hover:bg-[#363636] transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <FileText size={20} className="text-green-500" />
                            </div>
                            <div>
                                <h3 className="font-medium dark:text-white">Quản lý bài viết</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Duyệt, từ chối, xóa bài viết của page
                                </p>
                            </div>
                        </div>
                    </Link>
                </div>
            )}

            {/* Settings Tab - Owner only */}
            {activeTab === "settings" && isOwner && (
                <div className="space-y-6">
                    {/* Edit Page - Owner only */}
                    <Link
                        to={`/pages/${pageId}/edit`}
                        className="flex items-center justify-between p-4 bg-white dark:bg-[#262626] rounded-xl border border-gray-200 dark:border-[#363636] hover:bg-gray-50 dark:hover:bg-[#363636] transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Edit size={20} className="text-blue-500" />
                            </div>
                            <div>
                                <h3 className="font-medium dark:text-white">Chỉnh sửa thông tin</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Thay đổi tên, mô tả, ảnh bìa, avatar
                                </p>
                            </div>
                        </div>
                    </Link>

                    {/* Delete Page - Owner only */}
                    <button
                        onClick={handleDeletePage}
                        className="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                <Trash2 size={20} className="text-red-500" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-medium text-red-600 dark:text-red-400">Xóa Page</h3>
                                <p className="text-sm text-red-500 dark:text-red-400/70">
                                    Xóa vĩnh viễn page này và tất cả dữ liệu
                                </p>
                            </div>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}
 