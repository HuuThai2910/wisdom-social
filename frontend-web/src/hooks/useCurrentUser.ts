import { useAuth } from '../contexts/AuthContext';

export function useCurrentUser() {
    const { currentUser } = useAuth();
    return currentUser;
}
