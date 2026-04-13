import {
    defaultCurrentUserId,
    mockConversations,
    mockIgtvVideos,
    mockLikedPostIds,
    mockMessages,
    mockNotifications,
    mockPosts,
    mockSavedPostIds,
    mockStories,
    mockUsers,
} from "@/constants";
import { fakeLogin, fakeSignup } from "@/services/authService";
import { fakeSendMessage } from "@/services/messageService";
import { fakeCreatePost } from "@/services/postService";
import {
    AppNotification,
    AuthResult,
    Conversation,
    IgtvVideo,
    Message,
    Post,
    Story,
    User,
} from "@/types";
import {
    createContext,
    PropsWithChildren,
    useContext,
    useMemo,
    useState,
} from "react";

type SignupPayload = {
    fullName: string;
    username: string;
    email: string;
    password: string;
};

type UpdateProfilePayload = {
    fullName?: string;
    bio?: string;
    website?: string;
};

type AppContextValue = {
    users: User[];
    currentUser: User | null;
    loggedIn: boolean;
    loadingAuth: boolean;
    posts: Post[];
    stories: Story[];
    savedPostIds: string[];
    likedPostIds: string[];
    notifications: AppNotification[];
    conversations: Conversation[];
    messages: Message[];
    igtvVideos: IgtvVideo[];
    login: (email: string, password: string) => Promise<AuthResult>;
    signup: (payload: SignupPayload) => Promise<AuthResult>;
    logout: () => void;
    likePost: (postId: string) => void;
    savePost: (postId: string) => void;
    addComment: (postId: string, content: string) => void;
    addPost: (caption: string, imageUrl: string) => Promise<AuthResult>;
    updateProfile: (payload: UpdateProfilePayload) => void;
    sendMessage: (
        conversationId: string,
        content: string,
    ) => Promise<AuthResult>;
    markNotificationsRead: () => void;
    getUserById: (id: string) => User | undefined;
    getMessagesByConversation: (conversationId: string) => Message[];
    searchUsersAndPosts: (query: string) => { users: User[]; posts: Post[] };
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren) {
    const [users, setUsers] = useState<User[]>(mockUsers);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(false);
    const [posts, setPosts] = useState<Post[]>(mockPosts);
    const [stories] = useState<Story[]>(mockStories);
    const [savedPostIds, setSavedPostIds] =
        useState<string[]>(mockSavedPostIds);
    const [likedPostIds, setLikedPostIds] =
        useState<string[]>(mockLikedPostIds);
    const [notifications, setNotifications] =
        useState<AppNotification[]>(mockNotifications);
    const [conversations, setConversations] =
        useState<Conversation[]>(mockConversations);
    const [messages, setMessages] = useState<Message[]>(mockMessages);
    const [igtvVideos] = useState<IgtvVideo[]>(mockIgtvVideos);

    const currentUser = useMemo(
        () => users.find((user) => user.id === currentUserId) ?? null,
        [currentUserId, users],
    );

    const loggedIn = !!currentUser;

    const getUserById = (id: string) => users.find((user) => user.id === id);

    const getMessagesByConversation = (conversationId: string) =>
        messages.filter((message) => message.conversationId === conversationId);

    const login = async (
        email: string,
        password: string,
    ): Promise<AuthResult> => {
        setLoadingAuth(true);
        const result = await fakeLogin({ email, password });
        if (result.success) {
            setCurrentUserId(defaultCurrentUserId);
        }
        setLoadingAuth(false);
        return result;
    };

    const signup = async (payload: SignupPayload): Promise<AuthResult> => {
        setLoadingAuth(true);
        const result = await fakeSignup(payload);

        if (result.success) {
            const newUser: User = {
                id: `u${Date.now()}`,
                username: payload.username.trim().toLowerCase(),
                fullName: payload.fullName.trim(),
                bio: "New here 👋",
                avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80",
                followers: 0,
                following: 0,
            };
            setUsers((prev) => [newUser, ...prev]);
            setCurrentUserId(newUser.id);
        }

        setLoadingAuth(false);
        return result;
    };

    const logout = () => {
        setCurrentUserId(null);
    };

    const likePost = (postId: string) => {
        const isLiked = likedPostIds.includes(postId);

        setLikedPostIds((prev) =>
            isLiked ? prev.filter((id) => id !== postId) : [postId, ...prev],
        );

        setPosts((prev) =>
            prev.map((post) => {
                if (post.id !== postId) return post;

                return {
                    ...post,
                    likes: isLiked
                        ? Math.max(0, post.likes - 1)
                        : post.likes + 1,
                };
            }),
        );
    };

    const savePost = (postId: string) => {
        setSavedPostIds((prev) =>
            prev.includes(postId)
                ? prev.filter((id) => id !== postId)
                : [postId, ...prev],
        );
    };

    const addComment = (postId: string, content: string) => {
        if (!currentUser || !content.trim()) return;

        setPosts((prev) =>
            prev.map((post) => {
                if (post.id !== postId) return post;

                return {
                    ...post,
                    comments: [
                        ...post.comments,
                        {
                            id: `c${Date.now()}`,
                            userId: currentUser.id,
                            content: content.trim(),
                            createdAt: new Date().toISOString(),
                        },
                    ],
                };
            }),
        );
    };

    const addPost = async (
        caption: string,
        imageUrl: string,
    ): Promise<AuthResult> => {
        if (!currentUser) {
            return { success: false, message: "Please log in first." };
        }

        if (!caption.trim() || !imageUrl.trim()) {
            return {
                success: false,
                message: "Caption and image URL are required.",
            };
        }

        const newPost: Post = {
            id: `p${Date.now()}`,
            userId: currentUser.id,
            image: imageUrl.trim(),
            caption: caption.trim(),
            likes: 0,
            comments: [],
            createdAt: new Date().toISOString(),
        };

        await fakeCreatePost(newPost);
        setPosts((prev) => [newPost, ...prev]);
        return { success: true };
    };

    const updateProfile = (payload: UpdateProfilePayload) => {
        if (!currentUser) return;

        setUsers((prev) =>
            prev.map((user) => {
                if (user.id !== currentUser.id) return user;

                return {
                    ...user,
                    fullName: payload.fullName?.trim() || user.fullName,
                    bio: payload.bio?.trim() || user.bio,
                    website: payload.website?.trim() || user.website,
                };
            }),
        );
    };

    const sendMessage = async (
        conversationId: string,
        content: string,
    ): Promise<AuthResult> => {
        if (!currentUser) {
            return { success: false, message: "Please log in first." };
        }

        if (!content.trim()) {
            return { success: false, message: "Message is empty." };
        }

        const message: Message = {
            id: `m${Date.now()}`,
            conversationId,
            senderId: currentUser.id,
            content: content.trim(),
            createdAt: new Date().toISOString(),
        };

        const sent = await fakeSendMessage(message);
        setMessages((prev) => [...prev, sent]);

        setConversations((prev) =>
            prev.map((conversation) => {
                if (conversation.id !== conversationId) return conversation;

                return {
                    ...conversation,
                    lastMessage: sent.content,
                    updatedAt: sent.createdAt,
                };
            }),
        );

        return { success: true };
    };

    const markNotificationsRead = () => {
        setNotifications((prev) =>
            prev.map((item) => ({ ...item, read: true })),
        );
    };

    const searchUsersAndPosts = (query: string) => {
        const normalized = query.trim().toLowerCase();

        if (!normalized) {
            return {
                users,
                posts,
            };
        }

        const foundUsers = users.filter(
            (user) =>
                user.username.toLowerCase().includes(normalized) ||
                user.fullName.toLowerCase().includes(normalized),
        );

        const foundPosts = posts.filter((post) => {
            const author = getUserById(post.userId);
            return (
                post.caption.toLowerCase().includes(normalized) ||
                author?.username.toLowerCase().includes(normalized)
            );
        });

        return {
            users: foundUsers,
            posts: foundPosts,
        };
    };

    const value = useMemo<AppContextValue>(
        () => ({
            users,
            currentUser,
            loggedIn,
            loadingAuth,
            posts,
            stories,
            savedPostIds,
            likedPostIds,
            notifications,
            conversations,
            messages,
            igtvVideos,
            login,
            signup,
            logout,
            likePost,
            savePost,
            addComment,
            addPost,
            updateProfile,
            sendMessage,
            markNotificationsRead,
            getUserById,
            getMessagesByConversation,
            searchUsersAndPosts,
        }),
        [
            users,
            currentUser,
            loggedIn,
            loadingAuth,
            posts,
            stories,
            savedPostIds,
            likedPostIds,
            notifications,
            conversations,
            messages,
            igtvVideos,
        ],
    );

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useAppContext must be used inside AppProvider");
    }
    return context;
}
