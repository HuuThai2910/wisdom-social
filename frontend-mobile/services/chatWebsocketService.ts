import { Client, type IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type {
    Conversation,
    ConversationCreatedEvent,
    ConversationMembershipEvent,
    ConversationUpdatedEvent,
    GroupDisbandedEvent,
    LastMessage,
    MemberUpdatedEvent,
    Message,
    MessageCreatedEvent,
    MessageRecalledEvent,
    MessageSeenEvent,
    PinUpdatedEvent,
    TypingEvent,
} from "@/types/chat";
import apiClient from "@/api/apiClient";

type ConversationEvent =
    | MessageCreatedEvent
    | MessageRecalledEvent
    | MessageSeenEvent
    | TypingEvent;

type ConversationSnapshot = Conversation;

type UserConversationEvent =
    | ConversationUpdatedEvent
    | ConversationCreatedEvent
    | ConversationMembershipEvent
    | GroupDisbandedEvent;

function toLastMessageUpdate(conversation: Conversation): LastMessage | null {
    return conversation.lastMessage ?? null;
}

function buildFallbackLastMessageUpdate(conversation: Conversation): LastMessage {
    return {
        lastMessageContent: "",
        lastMessageType: "SYSTEM_CREATE_GROUP",
        lastSenderId: 0,
        lastSenderName: "",
        lastMessageAt: conversation.updatedAt,
        read: false,
    };
}

function buildSystemFallbackByDomainEvent(
    domainEventType?: string,
): LastMessage {
    const now = new Date().toISOString();

    if (domainEventType === "MEMBER_ADDED") {
        return {
            lastMessageContent: "",
            lastMessageType: "SYSTEM_ADD_MEMBER",
            lastSenderId: 0,
            lastSenderName: "",
            lastMessageAt: now,
            read: false,
        };
    }

    if (domainEventType === "MEMBER_ROLE_UPDATED") {
        return {
            lastMessageContent: "",
            lastMessageType: "SYSTEM_UPDATE_ROLE",
            lastSenderId: 0,
            lastSenderName: "",
            lastMessageAt: now,
            read: false,
        };
    }

    if (domainEventType === "MEMBER_KICKED") {
        return {
            lastMessageContent: "",
            lastMessageType: "SYSTEM_KICK_MEMBER",
            lastSenderId: 0,
            lastSenderName: "",
            lastMessageAt: now,
            read: false,
        };
    }

    if (domainEventType === "MEMBER_LEFT") {
        return {
            lastMessageContent: "",
            lastMessageType: "SYSTEM_LEAVE_GROUP",
            lastSenderId: 0,
            lastSenderName: "",
            lastMessageAt: now,
            read: false,
        };
    }

    return {
        lastMessageContent: "",
        lastMessageType: "SYSTEM_DISBAND_GROUP",
        lastSenderId: 0,
        lastSenderName: "",
        lastMessageAt: now,
        read: false,
    };
}
export type CallStatus =
    | "calling"
    | "ringing"
    | "accepted"
    | "rejected"
    | "ended";

export type CallSignalEvent =
    | "call-user"
    | "incoming-call"
    | "answer-call"
    | "ice-candidate"
    | "reject-call"
    | "end-call";

export interface CallSignalPayload {
    event: CallSignalEvent;
    conversationId: number;
    callId: string;
    callType: "audio" | "video";
    fromUserId: number;
    targetUserId: number;
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
    timestamp?: string;
}

function resolveWsBrokerUrl(): string {
    const baseUrl = apiClient.defaults.baseURL ?? "http://10.0.2.2:8080/api";
    const apiRoot = baseUrl.replace(/\/?api\/?$/, "");
    const wsRoot = apiRoot.replace(/^http/i, "ws");
    return `${wsRoot}/ws`;
}

function resolveSockJsHttpUrl(): string {
    const baseUrl = apiClient.defaults.baseURL ?? "http://10.0.2.2:8080/api";
    const apiRoot = baseUrl.replace(/\/?api\/?$/, "");
    return `${apiRoot}/ws`;
}

const WS_DEBUG_PREFIX = "[RECALL_DEBUG][mobile][chatWebsocketService]";

class ChatWebsocketService {
    private client: Client | null = null;
    private subscriptions = new Map<string, { unsubscribe: () => void }>();
    private subscriptionFactories = new Map<
        string,
        () => { unsubscribe: () => void }
    >();
    private connectPromise: Promise<void> | null = null;
    private callEventListeners = new Map<
        number,
        Set<(event: CallSignalPayload) => void>
    >();

    private syncSubscriptions(): void {
        if (!this.client?.connected) return;

        this.subscriptionFactories.forEach((factory, destination) => {
            if (this.subscriptions.has(destination)) return;

            try {
                const subscription = factory();
                this.subscriptions.set(destination, subscription);
                console.log(`${WS_DEBUG_PREFIX} synced subscription`, {
                    destination,
                });
            } catch {
                console.log(`${WS_DEBUG_PREFIX} sync subscription failed`, {
                    destination,
                });
            }
        });
    }

    private registerSubscription(
        destination: string,
        factory: () => { unsubscribe: () => void },
    ): void {
        this.subscriptionFactories.set(destination, factory);

        const activeSubscription = this.subscriptions.get(destination);
        if (activeSubscription) {
            activeSubscription.unsubscribe();
            this.subscriptions.delete(destination);
        }

        this.syncSubscriptions();
    }

    private removeSubscription(destination: string): void {
        const activeSubscription = this.subscriptions.get(destination);
        if (activeSubscription) {
            activeSubscription.unsubscribe();
            this.subscriptions.delete(destination);
        }

        this.subscriptionFactories.delete(destination);
    }

    private connectWithBrokerUrl(brokerURL: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let settled = false;
            const timeout = setTimeout(() => {
                if (settled) return;
                settled = true;

                console.log(`${WS_DEBUG_PREFIX} connect timeout`, {
                    brokerURL,
                });

                if (this.client) {
                    void this.client.deactivate();
                    this.client = null;
                }

                reject(new Error(`WebSocket connect timeout: ${brokerURL}`));
            }, 6000);

            this.client = new Client({
                brokerURL,
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
                debug: (message) => {
                    if (
                        message.includes("CONNECTED") ||
                        message.includes("ERROR") ||
                        message.includes("SUBSCRIBE")
                    ) {
                        console.log(`${WS_DEBUG_PREFIX} stomp`, { message });
                    }
                },
                onConnect: () => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timeout);

                    console.log(`${WS_DEBUG_PREFIX} onConnect`, {
                        brokerURL,
                    });

                    this.syncSubscriptions();
                    resolve();
                },
                onStompError: (frame) => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timeout);

                    console.log(`${WS_DEBUG_PREFIX} onStompError`, {
                        brokerURL,
                        headers: frame.headers,
                        body: frame.body,
                    });

                    reject(frame);
                },
                onWebSocketError: (event) => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timeout);

                    console.log(`${WS_DEBUG_PREFIX} onWebSocketError`, {
                        brokerURL,
                        event,
                    });

                    reject(event);
                },
                onWebSocketClose: () => {
                    console.log(`${WS_DEBUG_PREFIX} onWebSocketClose`, {
                        brokerURL,
                    });
                    this.subscriptions.clear();

                    if (!settled) {
                        settled = true;
                        clearTimeout(timeout);
                        reject(
                            new Error(
                                `WebSocket closed before connect: ${brokerURL}`,
                            ),
                        );
                    }
                },
            });

            this.client.activate();
        });
    }

    private connectWithSockJsUrl(sockJsUrl: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let settled = false;
            const timeout = setTimeout(() => {
                if (settled) return;
                settled = true;

                console.log(`${WS_DEBUG_PREFIX} connect timeout`, {
                    sockJsUrl,
                    mode: "sockjs",
                });

                if (this.client) {
                    void this.client.deactivate();
                    this.client = null;
                }

                reject(new Error(`SockJS connect timeout: ${sockJsUrl}`));
            }, 6000);

            this.client = new Client({
                webSocketFactory: () =>
                    new SockJS(sockJsUrl, undefined, {
                        transports: ["websocket"],
                    }),
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
                debug: (message) => {
                    if (
                        message.includes("CONNECTED") ||
                        message.includes("ERROR") ||
                        message.includes("SUBSCRIBE")
                    ) {
                        console.log(`${WS_DEBUG_PREFIX} stomp`, {
                            message,
                            mode: "sockjs",
                        });
                    }
                },
                onConnect: () => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timeout);

                    console.log(`${WS_DEBUG_PREFIX} onConnect`, {
                        sockJsUrl,
                        mode: "sockjs",
                    });

                    this.syncSubscriptions();
                    resolve();
                },
                onStompError: (frame) => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timeout);

                    console.log(`${WS_DEBUG_PREFIX} onStompError`, {
                        sockJsUrl,
                        mode: "sockjs",
                        headers: frame.headers,
                        body: frame.body,
                    });

                    reject(frame);
                },
                onWebSocketError: (event) => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timeout);

                    console.log(`${WS_DEBUG_PREFIX} onWebSocketError`, {
                        sockJsUrl,
                        mode: "sockjs",
                        event,
                    });

                    reject(event);
                },
                onWebSocketClose: () => {
                    console.log(`${WS_DEBUG_PREFIX} onWebSocketClose`, {
                        sockJsUrl,
                        mode: "sockjs",
                    });
                    this.subscriptions.clear();

                    if (!settled) {
                        settled = true;
                        clearTimeout(timeout);
                        reject(
                            new Error(
                                `SockJS closed before connect: ${sockJsUrl}`,
                            ),
                        );
                    }
                },
            });

            this.client.activate();
        });
    }

    connect(): Promise<void> {
        if (this.connectPromise) return this.connectPromise;
        if (this.client?.connected) return Promise.resolve();

        const wsBaseUrl = resolveWsBrokerUrl();
        const sockJsUrl = resolveSockJsHttpUrl();
        const rawBrokerPrimary = `${wsBaseUrl}/websocket`;
        const rawBrokerFallback = wsBaseUrl;

        const candidates: (
            | { mode: "sockjs"; sockJsUrl: string }
            | { mode: "raw"; brokerURL: string }
        )[] = [
                { mode: "sockjs", sockJsUrl },
                { mode: "raw", brokerURL: rawBrokerPrimary },
                { mode: "raw", brokerURL: rawBrokerFallback },
            ];

        const candidateLabels = Array.from(
            new Set(
                candidates.map((candidate) =>
                    candidate.mode === "sockjs"
                        ? `sockjs:${candidate.sockJsUrl}`
                        : `raw:${candidate.brokerURL}`,
                ),
            ),
        );

        console.log(`${WS_DEBUG_PREFIX} connect()`, {
            candidateBrokerUrls: candidateLabels,
        });

        this.subscriptions.forEach((subscription) =>
            subscription.unsubscribe(),
        );
        this.subscriptions.clear();

        this.connectPromise = (async () => {
            let lastError: unknown = null;

            for (const candidate of candidates) {
                try {
                    if (this.client) {
                        void this.client.deactivate();
                        this.client = null;
                    }

                    if (candidate.mode === "sockjs") {
                        await this.connectWithSockJsUrl(candidate.sockJsUrl);
                    } else {
                        await this.connectWithBrokerUrl(candidate.brokerURL);
                    }

                    return;
                } catch (error) {
                    lastError = error;
                    console.log(`${WS_DEBUG_PREFIX} connect attempt failed`, {
                        candidate:
                            candidate.mode === "sockjs"
                                ? `sockjs:${candidate.sockJsUrl}`
                                : `raw:${candidate.brokerURL}`,
                        error,
                    });
                }
            }

            throw (
                lastError ??
                new Error("All websocket broker connection attempts failed")
            );
        })().finally(() => {
            this.connectPromise = null;
        });

        return this.connectPromise;
    }

    disconnect(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
        this.subscriptions.clear();
        this.subscriptionFactories.clear();
        this.callEventListeners.clear();

        if (this.client) {
            void this.client.deactivate();
            this.client = null;
        }
    }

    isConnected(): boolean {
        return this.client?.connected ?? false;
    }

    subscribeToConversation(
        conversationId: number,
        onMessage: (message: Message) => void,
        onRecall?: (messageId: string) => void,
        onSeen?: (event: MessageSeenEvent) => void,
        onTyping?: (event: TypingEvent) => void,
    ): void {
        const destination = `/topic/conversation/${conversationId}`;
        console.log(`${WS_DEBUG_PREFIX} subscribeToConversation`, {
            conversationId,
            destination,
            connected: this.client?.connected ?? false,
        });
        this.registerSubscription(destination, () => {
            const client = this.client;
            if (!client?.connected) {
                throw new Error("WebSocket not connected");
            }

            return client.subscribe(destination, (message: IMessage) => {
                try {
                    const rawBody = message.body;
                    const raw = JSON.parse(message.body) as
                        | ConversationEvent
                        | {
                            payload?: unknown;
                            data?: unknown;
                            domainEventType?: unknown;
                            type?: unknown;
                        };

                    const container =
                        (raw as { payload?: unknown }).payload ??
                        (raw as { data?: unknown }).data ??
                        raw;

                    const domainType = String(
                        (
                            container as {
                                domainEventType?: unknown;
                                type?: unknown;
                            }
                        ).domainEventType ??
                        (
                            container as {
                                domainEventType?: unknown;
                                type?: unknown;
                            }
                        ).type ??
                        (
                            raw as {
                                domainEventType?: unknown;
                                type?: unknown;
                            }
                        ).domainEventType ??
                        (
                            raw as {
                                domainEventType?: unknown;
                                type?: unknown;
                            }
                        ).type ??
                        "",
                    );

                    if (domainType === "MESSAGE_CREATED") {
                        console.log(
                            `${WS_DEBUG_PREFIX} MESSAGE_CREATED received`,
                            {
                                destination,
                                conversationId,
                            },
                        );
                        const createdMessage = (
                            container as { messageResponse?: Message }
                        ).messageResponse;
                        if (createdMessage) {
                            onMessage(createdMessage);
                        }
                        return;
                    }

                    if (domainType === "MESSAGE_RECALLED") {
                        const recalledPayload = (
                            container as {
                                messageRecalledResponse?: {
                                    messageId?: unknown;
                                    conversationId?: unknown;
                                };
                            }
                        ).messageRecalledResponse;
                        const recalledMessageId =
                            recalledPayload?.messageId ??
                            (
                                container as {
                                    messageId?: unknown;
                                }
                            ).messageId;

                        if (typeof recalledMessageId === "string") {
                            console.log(
                                "[RECALL_DEBUG][mobile][chatWebsocketService] MESSAGE_RECALLED received",
                                {
                                    destination,
                                    conversationId,
                                    domainType,
                                    messageId: recalledMessageId,
                                    payloadConversationId:
                                        recalledPayload?.conversationId,
                                    rawBody,
                                },
                            );
                            onRecall?.(recalledMessageId);
                        } else {
                            console.log(
                                "[RECALL_DEBUG][mobile][chatWebsocketService] MESSAGE_RECALLED missing messageId",
                                {
                                    destination,
                                    conversationId,
                                    domainType,
                                    rawBody,
                                },
                            );
                        }
                        return;
                    }

                    if (domainType === "MESSAGE_SEEN") {
                        onSeen?.(container as MessageSeenEvent);
                        return;
                    }

                    if (domainType === "TYPING") {
                        onTyping?.(container as TypingEvent);
                    }
                } catch {
                    console.log(
                        `${WS_DEBUG_PREFIX} parse error on conversation event`,
                        {
                            destination,
                            conversationId,
                            body: message.body,
                        },
                    );
                }
            });
        });
    }

    unsubscribeFromConversation(conversationId: number): void {
        const destination = `/topic/conversation/${conversationId}`;
        this.removeSubscription(destination);
    }

    subscribeToConversationPins(
        conversationId: number,
        onPinUpdated: (event: PinUpdatedEvent) => void,
    ): void {
        const destination = `/topic/conversations/${conversationId}/pins`;
        this.registerSubscription(destination, () => {
            const client = this.client;
            if (!client?.connected) {
                throw new Error("WebSocket not connected");
            }

            return client.subscribe(destination, (message: IMessage) => {
                try {
                    onPinUpdated(JSON.parse(message.body) as PinUpdatedEvent);
                } catch {
                    // no-op
                }
            });
        });
    }

    unsubscribeFromConversationPins(conversationId: number): void {
        const destination = `/topic/conversations/${conversationId}/pins`;
        this.removeSubscription(destination);
    }

    subscribeToConversationMembers(
        conversationId: number,
        onMemberUpdated: (event: MemberUpdatedEvent) => void,
    ): void {
        const destination = `/topic/conversations/${conversationId}/members`;
        this.registerSubscription(destination, () => {
            const client = this.client;
            if (!client?.connected) {
                throw new Error("WebSocket not connected");
            }

            return client.subscribe(destination, (message: IMessage) => {
                try {
                    onMemberUpdated(
                        JSON.parse(message.body) as MemberUpdatedEvent,
                    );
                } catch {
                    // no-op
                }
            });
        });
    }

    unsubscribeFromConversationMembers(conversationId: number): void {
        const destination = `/topic/conversations/${conversationId}/members`;
        this.removeSubscription(destination);
    }

    subscribeToUserConversations(
        userId: number,
        onConversationUpdated: (
            conversationId: number,
            lastMessage: ConversationUpdatedEvent["lastMessage"],
            conversation?: ConversationSnapshot,
        ) => void,
        onDisbanded?: (conversationId: number) => void,
    ): void {
        const destination = `/topic/user/${userId}/conversations`;
        this.registerSubscription(destination, () => {
            const client = this.client;
            if (!client?.connected) {
                throw new Error("WebSocket not connected");
            }

            return client.subscribe(destination, (message: IMessage) => {
                try {
                    const payload = JSON.parse(message.body) as UserConversationEvent;

                    const createdConversation = (
                        payload as { conversationResponse?: Conversation }
                    ).conversationResponse;

                    if (createdConversation?.id) {
                        const lastMessageData =
                            toLastMessageUpdate(createdConversation);
                        const resolvedLastMessage =
                            lastMessageData ??
                            buildFallbackLastMessageUpdate(createdConversation);
                        const conversationSnapshot: ConversationSnapshot = {
                            ...createdConversation,
                            lastMessage:
                                createdConversation.lastMessage ??
                                resolvedLastMessage,
                        };

                        onConversationUpdated(
                            createdConversation.id,
                            resolvedLastMessage,
                            conversationSnapshot,
                        );
                        return;
                    }

                    const disbandPayload = payload as GroupDisbandedEvent;
                    if (
                        disbandPayload.domainEventType === "GROUP_DISBANDED" &&
                        typeof disbandPayload.conversationId === "number"
                    ) {
                        // Gọi callback chuyên biệt nếu có (dùng trong useChatWindowController)
                        onDisbanded?.(disbandPayload.conversationId);

                        // Vẫn gọi onConversationUpdated để cập nhật sidebar list
                        onConversationUpdated(
                            disbandPayload.conversationId,
                            buildSystemFallbackByDomainEvent(
                                disbandPayload.domainEventType,
                            ),
                        );
                        return;
                    }

                    const updatedEvent = payload as ConversationUpdatedEvent;
                    if (
                        typeof updatedEvent.conversationId === "number" &&
                        updatedEvent.lastMessage
                    ) {
                        onConversationUpdated(
                            updatedEvent.conversationId,
                            updatedEvent.lastMessage,
                        );
                    }
                } catch {
                    // no-op
                }
            });
        });
    }


    /**
     * Subscribe to GROUP_DISBANDED events for a specific conversation.
     * Uses a unique internal key so it doesn't overwrite the generic
     * subscribeToUserConversations subscription used by the sidebar.
     */
    subscribeToGroupDisbanded(
        userId: number,
        conversationId: number,
        onDisbanded: () => void,
    ): void {
        const destination = `/topic/user/${userId}/conversations`;
        const key = `${destination}::disband-watch::${conversationId}`;

        this.subscriptionFactories.set(key, () => {
            const client = this.client;
            if (!client?.connected) {
                throw new Error("WebSocket not connected");
            }

            // Không subscribe STOMP mới — chỉ forward từ topic gốc.
            // Thay vào đó ta tạo một subscriber độc lập lên cùng topic.
            return client.subscribe(destination, (message: IMessage) => {
                try {
                    const payload = JSON.parse(message.body) as {
                        domainEventType?: string;
                        conversationId?: number;
                    };
                    const disbandCid =
                        payload.domainEventType === "GROUP_DISBANDED"
                            ? payload.conversationId
                            : undefined;
                    if (disbandCid === conversationId) {
                        onDisbanded();
                    }
                } catch {
                    // no-op
                }
            });
        });

        // Kích hoạt ngay nếu đã kết nối
        if (this.client?.connected && !this.subscriptions.has(key)) {
            try {
                const sub = this.subscriptionFactories.get(key)!();
                this.subscriptions.set(key, sub);
            } catch {
                // retry sẽ được thực hiện ở syncSubscriptions()
            }
        }
    }

    unsubscribeFromGroupDisbanded(
        userId: number,
        conversationId: number,
    ): void {
        const destination = `/topic/user/${userId}/conversations`;
        const key = `${destination}::disband-watch::${conversationId}`;
        this.removeSubscription(key);
    }


    unsubscribeFromUserConversations(userId: number): void {
        const destination = `/topic/user/${userId}/conversations`;
        this.removeSubscription(destination);
    }

    subscribeToCallEvents(
        userId: number,
        callback: (event: CallSignalPayload) => void,
    ): void {
        const existingListeners = this.callEventListeners.get(userId);
        if (existingListeners) {
            existingListeners.add(callback);
        } else {
            this.callEventListeners.set(userId, new Set([callback]));
        }

        const destination = `/topic/user/${userId}/calls`;
        if (this.subscriptions.has(destination)) {
            return;
        }

        if (this.subscriptionFactories.has(destination)) {
            this.syncSubscriptions();
            return;
        }

        this.registerSubscription(destination, () => {
            const client = this.client;
            if (!client?.connected) {
                throw new Error("WebSocket not connected");
            }

            return client.subscribe(destination, (message: IMessage) => {
                try {
                    const payload = JSON.parse(message.body) as CallSignalPayload;
                    const listeners = this.callEventListeners.get(userId);
                    listeners?.forEach((listener) => listener(payload));
                } catch {
                    // no-op
                }
            });
        });
    }

    unsubscribeFromCallEvents(
        userId: number,
        callback?: (event: CallSignalPayload) => void,
    ): void {
        const listeners = this.callEventListeners.get(userId);

        if (callback && listeners) {
            listeners.delete(callback);
            if (listeners.size > 0) {
                return;
            }
        }

        if (!callback || !listeners || listeners.size === 0) {
            this.callEventListeners.delete(userId);
        }

        const destination = `/topic/user/${userId}/calls`;
        this.removeSubscription(destination);
    }

    sendCallSignal(payload: CallSignalPayload): void {
        if (!this.client?.connected) {
            console.log(`${WS_DEBUG_PREFIX} sendCallSignal skipped: disconnected`);
            return;
        }

        this.client.publish({
            destination: "/app/call.signal",
            body: JSON.stringify(payload),
        });
    }

    sendTypingSignal(
        conversationId: number,
        userId: number,
        isTyping: boolean,
    ): void {
        if (!this.client?.connected) return;

        this.client.publish({
            destination: `/app/chat/${conversationId}/typing`,
            body: JSON.stringify({ userId, isTyping }),
        });
    }
}

const chatWebsocketService = new ChatWebsocketService();

export default chatWebsocketService;
