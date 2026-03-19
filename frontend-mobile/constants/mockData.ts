import type { User, Post, Story, Chat, Message, Notification } from '../types';

// Mock Users
export const mockUsers: User[] = [
    {
        id: 1,
        phone: '+1234567890',
        username: 'john_doe',
        fullName: 'John Doe',
        avatar: 'https://i.pravatar.cc/150?img=1',
        avatarUrl: 'https://i.pravatar.cc/150?img=1',
        bio: 'Photography enthusiast 📷 | Travel lover ✈️',
        isVerified: true,
        followersCount: 1234,
        followingCount: 567,
        postsCount: 89,
    },
    {
        id: 2,
        phone: '+1234567891',
        username: 'jane_smith',
        fullName: 'Jane Smith',
        avatar: 'https://i.pravatar.cc/150?img=2',
        avatarUrl: 'https://i.pravatar.cc/150?img=2',
        bio: 'Digital artist 🎨 | Coffee addict ☕',
        followersCount: 2345,
        followingCount: 123,
        postsCount: 145,
    },
    {
        id: 3,
        phone: '+1234567892',
        username: 'mike_wilson',
        fullName: 'Mike Wilson',
        avatar: 'https://i.pravatar.cc/150?img=3',
        avatarUrl: 'https://i.pravatar.cc/150?img=3',
        bio: 'Fitness coach 💪 | Healthy lifestyle',
        followersCount: 5678,
        followingCount: 234,
        postsCount: 234,
    },
    {
        id: 4,
        phone: '+1234567893',
        username: 'sarah_jones',
        fullName: 'Sarah Jones',
        avatar: 'https://i.pravatar.cc/150?img=4',
        avatarUrl: 'https://i.pravatar.cc/150?img=4',
        bio: 'Fashion designer 👗 | Style blogger',
        isVerified: true,
        followersCount: 8901,
        followingCount: 345,
        postsCount: 567,
    },
    {
        id: 5,
        phone: '+1234567894',
        username: 'robert_fox',
        fullName: 'Robert Fox',
        avatar: 'https://i.pravatar.cc/150?img=5',
        avatarUrl: 'https://i.pravatar.cc/150?img=5',
        bio: 'Software Engineer 💻 | Tech enthusiast',
        followersCount: 456,
        followingCount: 789,
        postsCount: 45,
    },
];

// Current User
export const currentUser: User = mockUsers[4];

// Mock Posts
export const mockPosts: Post[] = [
    {
        id: '1',
        user: mockUsers[0],
        images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800'],
        caption: 'Beautiful sunset at the mountains 🏔️ #nature #photography',
        likes: 1234,
        comments: [
            {
                id: 'c1',
                user: mockUsers[1],
                text: 'Amazing shot!',
                createdAt: '2h ago',
                likes: 12,
            },
            {
                id: 'c2',
                user: mockUsers[2],
                text: 'Love this! 😍',
                createdAt: '1h ago',
                likes: 5,
            },
        ],
        createdAt: '3h ago',
        isLiked: false,
        isSaved: false,
    },
    {
        id: '2',
        user: mockUsers[1],
        images: ['https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800'],
        caption: 'Coffee and art, perfect combination ☕🎨',
        likes: 567,
        comments: [],
        createdAt: '5h ago',
        isLiked: true,
        isSaved: false,
    },
    {
        id: '3',
        user: mockUsers[2],
        images: ['https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800'],
        caption: 'Workout motivation! 💪 #fitness',
        likes: 891,
        comments: [],
        createdAt: '1d ago',
        isLiked: false,
        isSaved: true,
    },
];

// Mock Stories
export const mockStories: Story[] = [
    {
        id: 's1',
        user: currentUser,
        image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
        isViewed: false,
    },
    {
        id: 's2',
        user: mockUsers[0],
        image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
        isViewed: false,
    },
    {
        id: 's3',
        user: mockUsers[1],
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
        isViewed: true,
    },
];

// Mock Messages
export const mockMessages: Message[] = [
    {
        id: 'm1',
        senderId: '1',
        conversationId: 'conv1',
        content: 'Hey! How are you?',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        isRead: true,
    },
    {
        id: 'm2',
        senderId: '5',
        conversationId: 'conv1',
        content: "I'm good! What about you?",
        createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        isRead: true,
    },
];

// Mock Chats
export const mockChats: Chat[] = [
    {
        id: 'conv1',
        participants: [currentUser, mockUsers[0]],
        lastMessage: mockMessages[1],
        unreadCount: 0,
        updatedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
    {
        id: 'conv2',
        participants: [currentUser, mockUsers[1]],
        lastMessage: {
            id: 'm3',
            senderId: '2',
            conversationId: 'conv2',
            content: 'Thanks for the feedback!',
            createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            isRead: false,
        },
        unreadCount: 2,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
];

// Mock Notifications
export const mockNotifications: Notification[] = [
    {
        id: 'n1',
        user: mockUsers[0],
        type: 'like',
        message: 'liked your photo',
        createdAt: '2h ago',
        isRead: false,
        post: mockPosts[0],
    },
    {
        id: 'n2',
        user: mockUsers[1],
        type: 'comment',
        message: 'commented on your photo',
        createdAt: '3h ago',
        isRead: false,
        post: mockPosts[1],
    },
    {
        id: 'n3',
        user: mockUsers[2],
        type: 'follow',
        message: 'started following you',
        createdAt: '1d ago',
        isRead: true,
    },
];
