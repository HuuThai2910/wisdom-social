import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import websocketService from '../services/websocket';
import { clearAuthStorage } from '../utils/cookies';
import { convertPhoneToInternational } from './useCurrentUser';

/**
 * useForceLogout
 *
 * Hook lắng nghe WebSocket event FORCE_LOGOUT từ backend.
 * Khi mobile (hoặc bất kỳ thiết bị nào) gọi logoutAllDevices,
 * backend sẽ push event tới /topic/user/{phone}/force-logout.
 * Hook này sẽ:
 * 1. Xóa toàn bộ auth data khỏi cookie & localStorage
 * 2. Disconnect WebSocket
 * 3. Redirect ngay về /login
 *
 * @param phone - Số điện thoại của user đang đăng nhập (format 0xxx hoặc +84xxx)
 */
export function useForceLogout(phone: string | undefined) {
    const navigate = useNavigate();
    const subscribedRef = useRef(false);

    const handleForceLogout = useCallback(() => {
        console.log('🔴 FORCE LOGOUT: Đăng xuất tất cả thiết bị được kích hoạt. Đang đăng xuất...');

        // 1. Clear auth data immediately
        clearAuthStorage();

        // 2. Disconnect WebSocket
        websocketService.disconnect();
        subscribedRef.current = false;

        // 3. Redirect to login
        navigate('/login', { replace: true });
    }, [navigate]);

    useEffect(() => {
        if (!phone) return;

        const internationalPhone = convertPhoneToInternational(phone);
        if (!internationalPhone) return;

        let cancelled = false;

        const setup = async () => {
            try {
                // Ensure WebSocket is connected before subscribing
                if (!websocketService.isConnected()) {
                    await websocketService.connect();
                }

                if (cancelled) return;

                websocketService.subscribeToForceLogout(internationalPhone, handleForceLogout);
                subscribedRef.current = true;
                console.log(`🔒 useForceLogout: subscribed for ${internationalPhone}`);
            } catch (error) {
                console.error('❌ useForceLogout: setup error', error);
            }
        };

        setup();

        return () => {
            cancelled = true;
            if (subscribedRef.current) {
                websocketService.unsubscribeFromForceLogout(internationalPhone);
                subscribedRef.current = false;
            }
        };
    }, [phone, handleForceLogout]);
}
