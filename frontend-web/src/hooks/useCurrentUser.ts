import { useState, useEffect } from 'react';
import { getCurrentUser } from '../utils/auth';

interface CurrentUser {
    id: number;
    name: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    bio?: string;
    phone?: string;
    birthday: string;
    gender: string;
}

export function useCurrentUser() {
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                console.log("🔄 Fetching current user via auth/me...");
                const user = await getCurrentUser();
                console.log("✅ Current user fetched:", user);
                if (user) {
                    setCurrentUser(user);
                } else {
                    console.warn("⚠️ getCurrentUser returned null");
                }
            } catch (error) {
                console.error("❌ Failed to fetch current user:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    return currentUser;
}
