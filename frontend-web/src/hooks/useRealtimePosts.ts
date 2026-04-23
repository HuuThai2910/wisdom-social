import { useEffect } from 'react';
import websocketService from '../services/websocket';

export interface PostRealtimeEvent {
    action: "CREATE" | "UPDATE" | "DELETE";
    post?: any;
    postId: string;
    authorId: string;
}

interface UseRealtimePostsProps {
    topic?: string; // e.g. "/topic/posts" or "/topic/user/{userId}/posts"
    onPostCreated?: (post: any) => void;
    onPostUpdated?: (post: any) => void;
    onPostDeleted?: (postId: string) => void;
}

export function useRealtimePosts({
    topic = "/topic/posts",
    onPostCreated,
    onPostUpdated,
    onPostDeleted
}: UseRealtimePostsProps) {
    useEffect(() => {
        const handleEvent = (event: PostRealtimeEvent) => {
            console.log('📡 Realtime Post Event:', event);
            const { action, post, postId } = event;

            switch (action) {
                case "CREATE":
                    if (post && onPostCreated) onPostCreated(post);
                    break;
                case "UPDATE":
                    if (post && onPostUpdated) onPostUpdated(post);
                    break;
                case "DELETE":
                    if (onPostDeleted) onPostDeleted(postId);
                    break;
            }
        };

        const setup = async () => {
            try {
                if (!websocketService.isConnected()) {
                    await websocketService.connect();
                }
                websocketService.subscribeToTopic(topic, handleEvent);
            } catch (err) {
                console.error("❌ WebSocket setup failed for posts:", err);
            }
        };

        setup();

        return () => {
            websocketService.unsubscribeFromTopic(topic);
        };
    }, [topic, onPostCreated, onPostUpdated, onPostDeleted]);
}

export default useRealtimePosts;
