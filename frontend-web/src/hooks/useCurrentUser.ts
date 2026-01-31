import { useState, useEffect } from 'react';
import { getCurrentUser } from '../utils/auth';

interface CurrentUser {
    id: number;
    username: string;
    fullName: string;
    avatar: string;
    bio?: string;
    phone?: string;
}

export function useCurrentUser() {
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

    useEffect(() => {
        const user = getCurrentUser();
        setCurrentUser(user);
    }, []);

    return currentUser;
}
