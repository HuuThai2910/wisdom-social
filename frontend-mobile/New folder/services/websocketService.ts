import { Client } from '@stomp/stompjs';
import { Platform } from 'react-native';
import { getUser } from '../utils/storage';

type MessageHandler = (message: any) => void;

// Use same base URL as apiClient but for WebSocket
const API_BASE_URL = Platform.select({
    android: '192.168.1.151:8080',
    ios: '192.168.137.101:8080',
    default: '192.168.1.151:8080',
});

const WS_URL = `ws://${API_BASE_URL}/ws-native`;

class WebSocketService {
    private client: Client | null = null;
    private connected: boolean = false;
    private messageHandlers: Map<string, Set<MessageHandler>> = new Map();

    async connect() {
        try {
            if (this.client) {
                this.client.deactivate();
                this.client = null;
                this.connected = false;
            }

            const user = await getUser();
            if (!user?.phone) return;

            const internationalPhone = this.convertToInternationalFormat(user.phone);
            const wsUrl = WS_URL;

            this.client = new Client({
                webSocketFactory: () => new WebSocket(wsUrl),
                connectHeaders: {
                    login: internationalPhone,
                    passcode: 'none',
                },
                debug: () => {},
                reconnectDelay: 5000,
                heartbeatIncoming: 10000,
                heartbeatOutgoing: 10000,
                forceBinaryWSFrames: true,
                appendMissingNULLonIncoming: true,
            });

            this.client.onConnect = () => {
                this.connected = true;
                this.subscribeToTopics(internationalPhone);
            };

            this.client.onDisconnect = () => {
                this.connected = false;
            };

            this.client.onStompError = () => {
            };

            this.client.onWebSocketClose = () => {
                this.connected = false;
            };

            this.client.onWebSocketError = () => {
            };

            this.client.activate();
        } catch {
        }
    }

    private subscribeToTopics(phone: string) {
        if (!this.client) return;

        const queues = [
            'friend-request', 'friend-accept', 'friend-cancel', 'friend-reject',
            'save-block', 'cancel-block',
            'profile-update',
        ];
        queues.forEach(queue => {
            this.client!.subscribe(`/topic/user/${phone}/${queue}`, (message) => {
                this.notifyHandlers(queue, message.body);
            });
        });
    }

    on(queue: string, handler: MessageHandler) {
        if (!this.messageHandlers.has(queue)) {
            this.messageHandlers.set(queue, new Set());
        }
        this.messageHandlers.get(queue)!.add(handler);
    }

    off(queue: string, handler: MessageHandler) {
        this.messageHandlers.get(queue)?.delete(handler);
    }

    private notifyHandlers(queue: string, message: string) {
        const handlers = this.messageHandlers.get(queue);
        if (handlers && handlers.size > 0) {
            handlers.forEach(handler => {
                try {
                    handler(message);
                } catch {
                }
            });
        }
    }

    disconnect() {
        if (this.client) {
            this.client.deactivate();
            this.client = null;
            this.connected = false;
        }
    }

    isConnected(): boolean {
        return this.connected;
    }

    private convertToInternationalFormat(phone: string): string {
        if (!phone) return '';
        if (phone.startsWith('+84')) return phone;
        if (phone.startsWith('0')) return '+84' + phone.substring(1);
        if (phone.startsWith('84')) return '+' + phone;
        return '+84' + phone;
    }
}

const websocketService = new WebSocketService();
export default websocketService;
