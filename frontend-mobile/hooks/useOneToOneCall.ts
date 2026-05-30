import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Constants from "expo-constants";
import chatService from "@/services/chatService";
import chatWebsocketService, {
    type CallSignalPayload,
    type CallStatus,
} from "@/services/chatWebsocketService";
import type { Message } from "@/types/chat";
import { useCallMediaPeer } from "@/hooks/useCallMediaPeer";
import chatRuntimeStore from "@/stores/chatRuntimeStore";
export type CallType = "audio" | "video";
interface ActiveCallState {
    callId: string;
    callType: CallType;
    remoteUserId: number;
    remoteUserIds: number[];
    participantUserIds: number[];
    remoteName: string;
    remoteAvatar?: string;
    status: CallStatus;
    isCaller: boolean;
}

interface RejoinableCallState {
    callId: string;
    callType: CallType;
    participantUserIds: number[];
}
interface UseOneToOneCallOptions {
    conversationId: number;
    currentUserId: number;
    targetUserId?: number;
    targetUserIds?: number[];
    targetName?: string;
    targetAvatar?: string;
    pendingIncomingCall?: CallSignalPayload | null;
    onPendingIncomingCallConsumed?: () => void;
    onCallMessageSaved?: (message: Message) => void;
}
const UNANSWERED_CALL_TIMEOUT_MS = 20_000;
export const MAX_CALL_PARTICIPANTS = 8;

const expoEnv = Constants as {
    executionEnvironment?: string;
    appOwnership?: string;
};

const isExpoGo =
    expoEnv.executionEnvironment === "storeClient" ||
    expoEnv.appOwnership === "expo";

function toPeerSessionDescription(
    input: { type: "offer" | "answer" | "pranswer" | "rollback"; sdp: string } | null,
) {
    if (!input) return null;
    if (isExpoGo) return input;

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require("react-native-webrtc") as {
            RTCSessionDescription?: new (init: {
                type: "offer" | "answer" | "pranswer" | "rollback";
                sdp: string;
            }) => unknown;
        };

        if (typeof mod.RTCSessionDescription === "function") {
            return new mod.RTCSessionDescription(input);
        }
    } catch {
        // no-op
    }

    return input;
}

function toNativeSessionDescription(input: CallSignalPayload["sdp"]): {
    type: "offer" | "answer" | "pranswer" | "rollback";
    sdp: string;
} | null {
    if (!input || typeof input.sdp !== "string" || !input.sdp) {
        return null;
    }
    const rawType = String(input.type ?? "").toLowerCase();
    if (
        rawType !== "offer" &&
        rawType !== "answer" &&
        rawType !== "pranswer" &&
        rawType !== "rollback"
    ) {
        return null;
    }
    return {
        type: rawType,
        sdp: input.sdp,
    };
}

function getSignalParticipantUserIds(signal: CallSignalPayload): number[] {
    const direct = signal.participantUserIds;
    if (direct?.length) return direct.filter(Number.isFinite);
    const candidate = signal.candidate as
        | { participantUserIds?: unknown }
        | undefined;
    if (!Array.isArray(candidate?.participantUserIds)) return [];
    return candidate.participantUserIds
        .map((id) => Number(id))
        .filter(Number.isFinite);
}

function getSignalJoiningUserId(signal: CallSignalPayload): number | null {
    const candidate = signal.candidate as { joiningUserId?: unknown } | undefined;
    const id = Number(candidate?.joiningUserId);
    return Number.isFinite(id) ? id : null;
}

function getSignalReason(signal: CallSignalPayload): string | null {
    const candidate = signal.candidate as { reason?: unknown } | undefined;
    return typeof candidate?.reason === "string" ? candidate.reason : null;
}

function buildCallMetadata(
    participantUserIds: number[],
    joiningUserId?: number,
): Record<string, unknown> {
    return {
        participantUserIds: Array.from(new Set(participantUserIds)),
        ...(joiningUserId != null ? { joiningUserId } : {}),
    };
}
export function useOneToOneCall(options: UseOneToOneCallOptions) {
    const {
        conversationId,
        currentUserId,
        targetUserId,
        targetUserIds,
        targetName,
        targetAvatar,
        pendingIncomingCall,
        onPendingIncomingCallConsumed,
        onCallMessageSaved,
    } = options;
    const {
        localStreamUrl,
        remoteStreamUrl,
        remoteStreamUrls,
        micEnabled,
        cameraEnabled,
        speakerEnabled,
        isWebRTCSupported,
        startAudioSession,
        createLocalStream,
        createPeerConnection,
        flushQueuedIceCandidates,
        addIceCandidateOrQueue,
        getPeerConnection,
        closePeerConnectionForUser,
        resetPeerAndMedia,
        toggleMic,
        toggleCamera,
        switchCamera,
        toggleSpeaker,
    } = useCallMediaPeer();
    const [incomingCall, setIncomingCall] = useState<CallSignalPayload | null>(
        null,
    );
    const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
    const [rejoinableCall, setRejoinableCall] =
        useState<RejoinableCallState | null>(null);
    const [busyCallUserId, setBusyCallUserId] = useState<number | null>(null);
    const [durationSeconds, setDurationSeconds] = useState(0);
    const activeCallRef = useRef<ActiveCallState | null>(null);
    const incomingCallRef = useRef<CallSignalPayload | null>(null);
    const callSavedRef = useRef(false);
    const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const durationSecondsRef = useRef(0);
    const unansweredTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const activeCallRequestAtRef = useRef(0);
    const rejoinProbeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    useEffect(() => {
        activeCallRef.current = activeCall;
    }, [activeCall]);
    useEffect(() => {
        if (activeCall) {
            chatRuntimeStore.setActiveCall({
                callId: activeCall.callId,
                conversationId,
                callType: activeCall.callType,
                userId: currentUserId,
            });
            return;
        }

        const currentRuntimeCall = chatRuntimeStore.getActiveCall();
        if (
            currentRuntimeCall?.conversationId === conversationId &&
            currentRuntimeCall.userId === currentUserId
        ) {
            chatRuntimeStore.setActiveCall(null);
        }
    }, [activeCall, conversationId, currentUserId]);
    useEffect(() => {
        incomingCallRef.current = incomingCall;
    }, [incomingCall]);
    useEffect(() => {
        durationSecondsRef.current = durationSeconds;
    }, [durationSeconds]);
    const targetUserIdsKey = useMemo(
        () => (targetUserIds ?? []).filter(Number.isFinite).join(","),
        [targetUserIds],
    );
    const clearDurationTimer = useCallback(() => {
        if (durationTimerRef.current) {
            clearInterval(durationTimerRef.current);
            durationTimerRef.current = null;
        }
    }, []);
    const clearUnansweredTimeout = useCallback(() => {
        if (unansweredTimeoutRef.current) {
            clearTimeout(unansweredTimeoutRef.current);
            unansweredTimeoutRef.current = null;
        }
    }, []);
    const startDurationTimer = useCallback(() => {
        clearDurationTimer();
        const startedAt = Date.now() - durationSecondsRef.current * 1000;
        durationTimerRef.current = setInterval(() => {
            setDurationSeconds(
                Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
            );
        }, 1000);
    }, [clearDurationTimer]);
    const resetCallState = useCallback(
        (options?: { keepIncoming?: boolean }) => {
            clearDurationTimer();
            clearUnansweredTimeout();
            resetPeerAndMedia();
            setDurationSeconds(0);
            setActiveCall(null);
            activeCallRef.current = null;
            if (!options?.keepIncoming) {
                setIncomingCall(null);
                incomingCallRef.current = null;
            }
            callSavedRef.current = false;
        },
        [clearDurationTimer, clearUnansweredTimeout, resetPeerAndMedia],
    );
    const persistCallMessage = useCallback(
        async (callType: CallType, status: CallStatus, seconds: number) => {
            if (callSavedRef.current) return;
            callSavedRef.current = true;
            try {
                const saved = await chatService.sendCallMessage(
                    {
                        conversationId,
                        callType,
                        status,
                        durationSeconds: Math.max(0, Math.floor(seconds)),
                    },
                    currentUserId,
                );
                if (saved?.id) {
                    onCallMessageSaved?.(saved);
                }
            } catch {
                // no-op
            }
        },
        [conversationId, currentUserId, onCallMessageSaved],
    );
    const applyStatus = useCallback((status: CallStatus) => {
        setActiveCall((prev) => {
            if (!prev) return prev;
            const next = { ...prev, status };
            activeCallRef.current = next;
            return next;
        });
    }, []);
    const startUnansweredTimeout = useCallback(
        (callId: string, callType: CallType, remoteUserIds: number[]) => {
            clearUnansweredTimeout();
            unansweredTimeoutRef.current = setTimeout(() => {
                const current = activeCallRef.current;
                if (!current || current.callId !== callId) return;
                if (current.status !== "calling") return;
                chatWebsocketService.sendCallSignal({
                    event: "end-call",
                    conversationId,
                    callId,
                    callType,
                    fromUserId: currentUserId,
                    targetUserId: remoteUserIds[0],
                });
                void persistCallMessage(callType, "ended", 0);
                resetCallState();
            }, UNANSWERED_CALL_TIMEOUT_MS);
        },
        [
            clearUnansweredTimeout,
            conversationId,
            currentUserId,
            persistCallMessage,
            resetCallState,
        ],
    );
    const placeOutgoingCallToUsers = useCallback(
        async (callId: string, callType: CallType, remoteUserIds: number[]) => {
            await Promise.all(
                remoteUserIds.map(async (remoteUserId) => {
                    const peer = createPeerConnection({
                        remoteUserId,
                        onIceCandidate: (candidate) => {
                            chatWebsocketService.sendCallSignal({
                                event: "ice-candidate",
                                conversationId,
                                callId,
                                callType,
                                fromUserId: currentUserId,
                                targetUserId: remoteUserId,
                                candidate,
                            });
                        },
                    });
                    const offer = await peer.createOffer();
                    await peer.setLocalDescription(offer);
                    chatWebsocketService.sendCallSignal({
                        event: "call-user",
                        conversationId,
                        callId,
                        callType,
                        fromUserId: currentUserId,
                        targetUserId: remoteUserId,
                        sdp: offer,
                        candidate: buildCallMetadata(
                            activeCallRef.current?.participantUserIds ?? [
                                currentUserId,
                            ],
                        ),
                    });
                    await flushQueuedIceCandidates(remoteUserId);
                }),
            );
        },
        [
            conversationId,
            createPeerConnection,
            currentUserId,
            flushQueuedIceCandidates,
        ],
    );
    const startCall = useCallback(
        async (callType: CallType, selectedUserIds?: number[]) => {
            if (!isWebRTCSupported) return false;
            const remoteUserIds = Array.from(
                new Set(
                    (selectedUserIds?.length
                        ? selectedUserIds
                        : targetUserIds?.length
                          ? targetUserIds
                          : targetUserId
                            ? [targetUserId]
                            : []
                    ).filter((id) => id !== currentUserId),
                ),
            ).slice(0, MAX_CALL_PARTICIPANTS - 1);
            if (!remoteUserIds.length) return false;
            if (activeCallRef.current || incomingCallRef.current) return false;
            callSavedRef.current = false;
            try {
                await createLocalStream(callType);
                startAudioSession(callType);
                setRejoinableCall(null);
                const callId = `call-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
                const nextCall: ActiveCallState = {
                    callId,
                    callType,
                    remoteUserId: remoteUserIds[0],
                    remoteUserIds,
                    participantUserIds: [currentUserId],
                    remoteName:
                        remoteUserIds.length > 1
                            ? `Nhom (${remoteUserIds.length} nguoi)`
                            : targetName || `Nguoi dung ${remoteUserIds[0]}`,
                    remoteAvatar: targetAvatar,
                    status: "calling",
                    isCaller: true,
                };
                setActiveCall(nextCall);
                activeCallRef.current = nextCall;
                setDurationSeconds(0);
                await placeOutgoingCallToUsers(callId, callType, remoteUserIds);
                startUnansweredTimeout(callId, callType, remoteUserIds);
                return true;
            } catch {
                resetCallState();
                return false;
            }
        },
        [
            targetUserId,
            targetUserIds,
            createLocalStream,
            startAudioSession,
            targetName,
            targetAvatar,
            currentUserId,
            isWebRTCSupported,
            placeOutgoingCallToUsers,
            startUnansweredTimeout,
            resetCallState,
        ],
    );
    const inviteUsersToCall = useCallback(
        async (userIds: number[]) => {
            const current = activeCallRef.current;
            if (!current) return false;
            const existingIds = new Set(current.remoteUserIds);
            const nextIds = Array.from(
                new Set(
                    userIds.filter(
                        (id) => id !== currentUserId && !existingIds.has(id),
                    ),
                ),
            ).slice(
                0,
                Math.max(
                    0,
                    MAX_CALL_PARTICIPANTS - 1 - current.remoteUserIds.length,
                ),
            );
            if (!nextIds.length) return false;

            await placeOutgoingCallToUsers(current.callId, current.callType, nextIds);
            const nextCall = {
                ...current,
                remoteUserIds: [...current.remoteUserIds, ...nextIds],
                participantUserIds: current.participantUserIds,
                remoteName: `Nhom (${current.remoteUserIds.length + nextIds.length} nguoi)`,
            };
            setActiveCall(nextCall);
            activeCallRef.current = nextCall;
            setRejoinableCall(null);
            return true;
        },
        [currentUserId, placeOutgoingCallToUsers],
    );
    const acceptIncomingSignal = useCallback(async (incoming: CallSignalPayload) => {
        if (!isWebRTCSupported) return false;
        callSavedRef.current = false;
        try {
            await createLocalStream(incoming.callType);
            startAudioSession(incoming.callType);
            setRejoinableCall(null);
            const peer = createPeerConnection({
                remoteUserId: incoming.fromUserId,
                onIceCandidate: (candidate) => {
                    chatWebsocketService.sendCallSignal({
                        event: "ice-candidate",
                        conversationId,
                        callId: incoming.callId,
                        callType: incoming.callType,
                        fromUserId: currentUserId,
                        targetUserId: incoming.fromUserId,
                        candidate,
                    });
                },
            });
            const remoteDescription = toNativeSessionDescription(incoming.sdp);
            if (remoteDescription) {
                await peer.setRemoteDescription(
                    toPeerSessionDescription(remoteDescription) as never,
                );
            }
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            await flushQueuedIceCandidates(incoming.fromUserId);
            const nextCall: ActiveCallState = {
                callId: incoming.callId,
                callType: incoming.callType,
                remoteUserId: incoming.fromUserId,
                remoteUserIds: [incoming.fromUserId],
                participantUserIds: Array.from(
                    new Set([
                        ...getSignalParticipantUserIds(incoming),
                        incoming.fromUserId,
                        currentUserId,
                    ]),
                ),
                remoteName: targetName || `Nguoi dung ${incoming.fromUserId}`,
                remoteAvatar: targetAvatar,
                status: "accepted",
                isCaller: false,
            };
            setIncomingCall(null);
            incomingCallRef.current = null;
            setActiveCall(nextCall);
            activeCallRef.current = nextCall;
            setDurationSeconds(0);
            startDurationTimer();
            chatWebsocketService.sendCallSignal({
                event: "answer-call",
                conversationId,
                callId: incoming.callId,
                callType: incoming.callType,
                fromUserId: currentUserId,
                targetUserId: incoming.fromUserId,
                sdp: answer,
                candidate: buildCallMetadata(
                    Array.from(
                        new Set([
                            ...getSignalParticipantUserIds(incoming),
                            incoming.fromUserId,
                            currentUserId,
                        ]),
                    ),
                ),
            });
            return true;
        } catch {
            resetCallState();
            return false;
        }
    }, [
        createLocalStream,
        startAudioSession,
        createPeerConnection,
        conversationId,
        currentUserId,
        flushQueuedIceCandidates,
        resetCallState,
        startDurationTimer,
        targetAvatar,
        targetName,
        isWebRTCSupported,
    ]);

    const acceptIncomingCall = useCallback(async () => {
        const incoming = incomingCallRef.current;
        if (!incoming) return false;
        return acceptIncomingSignal(incoming);
    }, [acceptIncomingSignal]);

    const updateCallParticipants = useCallback(
        (participantUserIds: number[]) => {
            const normalizedParticipantIds = Array.from(
                new Set(participantUserIds.filter(Number.isFinite)),
            );
            if (!normalizedParticipantIds.length) return;
            setActiveCall((prev) => {
                if (!prev) return prev;
                const remoteUserIds = normalizedParticipantIds.filter(
                    (id) => id !== currentUserId,
                );
                const next = {
                    ...prev,
                    remoteUserId: remoteUserIds[0] ?? prev.remoteUserId,
                    remoteUserIds,
                    participantUserIds: normalizedParticipantIds,
                    remoteName:
                        normalizedParticipantIds.length > 2
                            ? `Nhom (${normalizedParticipantIds.length} nguoi)`
                            : prev.remoteName,
                };
                activeCallRef.current = next;
                return next;
            });
        },
        [currentUserId],
    );

    const sendParticipantSnapshot = useCallback(
        (participantUserIds: number[]) => {
            const current = activeCallRef.current;
            if (!current) return;
            const metadata = buildCallMetadata(participantUserIds);
            participantUserIds
                .filter((id) => id !== currentUserId)
                .forEach((targetUserId) => {
                    chatWebsocketService.sendCallSignal({
                        event: "call-participants",
                        conversationId,
                        callId: current.callId,
                        callType: current.callType,
                        fromUserId: currentUserId,
                        targetUserId,
                        candidate: metadata,
                    });
                });
        },
        [conversationId, currentUserId],
    );

    const notifyExistingParticipantsToConnect = useCallback(
        (joiningUserId: number, participantUserIds: number[]) => {
            const current = activeCallRef.current;
            if (!current) return;
            const metadata = buildCallMetadata(participantUserIds, joiningUserId);
            participantUserIds
                .filter((id) => id !== currentUserId && id !== joiningUserId)
                .forEach((targetUserId) => {
                    chatWebsocketService.sendCallSignal({
                        event: "join-call",
                        conversationId,
                        callId: current.callId,
                        callType: current.callType,
                        fromUserId: currentUserId,
                        targetUserId,
                        candidate: metadata,
                    });
                });
        },
        [conversationId, currentUserId],
    );

    const ensurePeerConnectionsForParticipants = useCallback(
        async (participantUserIds: number[]) => {
            const current = activeCallRef.current;
            if (!current || current.status !== "accepted") return;

            const normalizedParticipantIds = Array.from(
                new Set(participantUserIds.filter(Number.isFinite)),
            );
            if (normalizedParticipantIds.length < 2) return;
            if (Math.min(...normalizedParticipantIds) !== currentUserId) return;

            const missingRemoteUserIds = normalizedParticipantIds.filter(
                (id) => id !== currentUserId && !getPeerConnection(id),
            );
            if (!missingRemoteUserIds.length) return;

            await placeOutgoingCallToUsers(
                current.callId,
                current.callType,
                missingRemoteUserIds,
            );
        },
        [currentUserId, getPeerConnection, placeOutgoingCallToUsers],
    );

    const acceptPeerOffer = useCallback(
        async (incoming: CallSignalPayload) => {
            const current = activeCallRef.current;
            if (!current || current.callId !== incoming.callId) return false;
            if (incoming.fromUserId === currentUserId) return false;
            if (!isWebRTCSupported) return false;
            try {
                const peer = createPeerConnection({
                    remoteUserId: incoming.fromUserId,
                    onIceCandidate: (candidate) => {
                        chatWebsocketService.sendCallSignal({
                            event: "ice-candidate",
                            conversationId,
                            callId: incoming.callId,
                            callType: incoming.callType,
                            fromUserId: currentUserId,
                            targetUserId: incoming.fromUserId,
                            candidate,
                        });
                    },
                });
                const remoteDescription = toNativeSessionDescription(incoming.sdp);
                if (remoteDescription) {
                    await peer.setRemoteDescription(
                        toPeerSessionDescription(remoteDescription) as never,
                    );
                }
                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
                await flushQueuedIceCandidates(incoming.fromUserId);
                const participantUserIds = Array.from(
                    new Set([
                        ...current.participantUserIds,
                        ...getSignalParticipantUserIds(incoming),
                        incoming.fromUserId,
                        currentUserId,
                    ]),
                );
                updateCallParticipants(participantUserIds);
                chatWebsocketService.sendCallSignal({
                    event: "answer-call",
                    conversationId,
                    callId: incoming.callId,
                    callType: incoming.callType,
                    fromUserId: currentUserId,
                    targetUserId: incoming.fromUserId,
                    sdp: answer,
                    candidate: buildCallMetadata(participantUserIds),
                });
                return true;
            } catch {
                return false;
            }
        },
        [
            conversationId,
            createPeerConnection,
            currentUserId,
            flushQueuedIceCandidates,
            isWebRTCSupported,
            updateCallParticipants,
        ],
    );

    useEffect(() => {
        if (!pendingIncomingCall) return;
        if (pendingIncomingCall.conversationId !== conversationId) return;
        if (activeCallRef.current) return;

        onPendingIncomingCallConsumed?.();
        void acceptIncomingSignal(pendingIncomingCall);
    }, [
        acceptIncomingSignal,
        conversationId,
        onPendingIncomingCallConsumed,
        pendingIncomingCall,
    ]);
    const rejectIncomingCall = useCallback(() => {
        const incoming = incomingCallRef.current;
        if (!incoming) return;
        chatWebsocketService.sendCallSignal({
            event: "reject-call",
            conversationId,
            callId: incoming.callId,
            callType: incoming.callType,
            fromUserId: currentUserId,
            targetUserId: incoming.fromUserId,
        });
        setIncomingCall(null);
        incomingCallRef.current = null;
    }, [conversationId, currentUserId]);
    const endCall = useCallback(() => {
        if (incomingCallRef.current && !activeCallRef.current) {
            rejectIncomingCall();
            return;
        }
        const current = activeCallRef.current;
        if (!current) return;
        const shouldOfferRejoin =
            current.participantUserIds.length > 2 &&
            current.status === "accepted";
        const nextRejoinableCall = shouldOfferRejoin
            ? {
                callId: current.callId,
                callType: current.callType,
                participantUserIds: current.participantUserIds.filter(
                    (id) => id !== currentUserId,
                ),
            }
            : null;
        clearUnansweredTimeout();
        current.remoteUserIds.forEach((remoteUserId) => {
            chatWebsocketService.sendCallSignal({
                event: "end-call",
                conversationId,
                callId: current.callId,
                callType: current.callType,
                fromUserId: currentUserId,
                targetUserId: remoteUserId,
            });
        });
        const shouldPersist = current.isCaller;
        const elapsed = durationSecondsRef.current;
        const callType = current.callType;
        resetCallState();
        setRejoinableCall(nextRejoinableCall);
        if (shouldPersist) {
            void persistCallMessage(callType, "ended", elapsed);
        }
    }, [
        clearUnansweredTimeout,
        conversationId,
        currentUserId,
        persistCallMessage,
        rejectIncomingCall,
        resetCallState,
    ]);
    const rejoinActiveCall = useCallback(() => {
        const call = rejoinableCall;
        if (!call || activeCallRef.current) return false;
        activeCallRequestAtRef.current = Date.now();
        call.participantUserIds.forEach((targetUserId) => {
            chatWebsocketService.sendCallSignal({
                event: "request-active-call",
                conversationId,
                callId: call.callId,
                callType: call.callType,
                fromUserId: currentUserId,
                targetUserId,
            });
        });
        return true;
    }, [conversationId, currentUserId, rejoinableCall]);
    const handleCallSignal = useCallback(
        async (signal: CallSignalPayload) => {
            if (signal.conversationId !== conversationId) return;
            const current = activeCallRef.current;
            if (signal.event === "incoming-call" || signal.event === "call-user") {
                if (current?.callId === signal.callId) {
                    await acceptPeerOffer(signal);
                    return;
                }
                if (!isWebRTCSupported) {
                    chatWebsocketService.sendCallSignal({
                        event: "reject-call",
                        conversationId,
                        callId: signal.callId,
                        callType: signal.callType,
                        fromUserId: currentUserId,
                        targetUserId: signal.fromUserId,
                    });
                    return;
                }

                if (current) {
                    chatWebsocketService.sendCallSignal({
                        event: "reject-call",
                        conversationId,
                        callId: signal.callId,
                        callType: signal.callType,
                        fromUserId: currentUserId,
                        targetUserId: signal.fromUserId,
                        candidate: { reason: "busy" },
                    });
                    return;
                }
                const shouldAutoAccept =
                    Date.now() - activeCallRequestAtRef.current < 8000 &&
                    getSignalParticipantUserIds(signal).length > 0;
                if (shouldAutoAccept) {
                    await acceptIncomingSignal(signal);
                    return;
                }
                setIncomingCall(signal);
                incomingCallRef.current = signal;
                return;
            }
            if (signal.event === "request-active-call") {
                if (!current || current.status !== "accepted") return;
                if (current.participantUserIds.includes(signal.fromUserId)) return;
                const leaderId = Math.min(...current.participantUserIds);
                if (leaderId !== currentUserId) return;
                const participantUserIds = Array.from(
                    new Set([...current.participantUserIds, signal.fromUserId]),
                );
                updateCallParticipants(participantUserIds);
                await placeOutgoingCallToUsers(current.callId, current.callType, [
                    signal.fromUserId,
                ]);
                notifyExistingParticipantsToConnect(
                    signal.fromUserId,
                    participantUserIds,
                );
                sendParticipantSnapshot(participantUserIds);
                return;
            }
            if (signal.event === "check-active-call") {
                if (!current || current.status !== "accepted") return;
                chatWebsocketService.sendCallSignal({
                    event: "call-participants",
                    conversationId,
                    callId: current.callId,
                    callType: current.callType,
                    fromUserId: currentUserId,
                    targetUserId: signal.fromUserId,
                    candidate: buildCallMetadata(current.participantUserIds),
                });
                return;
            }
            if (signal.event === "join-call") {
                if (!current || current.callId !== signal.callId) return;
                const joiningUserId = getSignalJoiningUserId(signal);
                if (!joiningUserId || joiningUserId === currentUserId) return;
                updateCallParticipants(getSignalParticipantUserIds(signal));
                await placeOutgoingCallToUsers(signal.callId, signal.callType, [
                    joiningUserId,
                ]);
                return;
            }
            if (signal.event === "call-participants") {
                if (current?.callId === signal.callId) {
                    const participantUserIds =
                        getSignalParticipantUserIds(signal);
                    updateCallParticipants(participantUserIds);
                    void ensurePeerConnectionsForParticipants(participantUserIds);
                } else {
                    const participantUserIds = getSignalParticipantUserIds(signal);
                    if (
                        participantUserIds.length > 1 &&
                        !participantUserIds.includes(currentUserId)
                    ) {
                        setRejoinableCall({
                            callId: signal.callId,
                            callType: signal.callType,
                            participantUserIds,
                        });
                    } else if (participantUserIds.length <= 1) {
                        setRejoinableCall(null);
                    }
                }
                return;
            }
            const currentIncoming = incomingCallRef.current;
            if (
                (signal.event === "end-call" || signal.event === "reject-call") &&
                currentIncoming?.callId === signal.callId &&
                currentIncoming?.fromUserId === signal.fromUserId
            ) {
                setIncomingCall(null);
                incomingCallRef.current = null;
            }
            if (!current || current.callId !== signal.callId) return;
            if (signal.event === "answer-call") {
                if (!current.isCaller) return;
                const peer = getPeerConnection(signal.fromUserId);
                const remoteDescription = toNativeSessionDescription(signal.sdp);
                if (!peer || !remoteDescription) return;
                await peer.setRemoteDescription(
                    toPeerSessionDescription(remoteDescription) as never,
                );
                await flushQueuedIceCandidates(signal.fromUserId);
                clearUnansweredTimeout();
                applyStatus("accepted");
                const participantUserIds = Array.from(
                    new Set([
                        ...current.participantUserIds,
                        ...getSignalParticipantUserIds(signal),
                        signal.fromUserId,
                        currentUserId,
                    ]),
                );
                updateCallParticipants(participantUserIds);
                notifyExistingParticipantsToConnect(
                    signal.fromUserId,
                    participantUserIds,
                );
                sendParticipantSnapshot(participantUserIds);
                setDurationSeconds(0);
                startDurationTimer();
                return;
            }
            if (signal.event === "ice-candidate") {
                if (!signal.candidate) return;
                await addIceCandidateOrQueue(
                    signal.candidate as RTCIceCandidateInit,
                    signal.fromUserId,
                );
                return;
            }
            if (signal.event === "reject-call") {
                if (current.isCaller) {
                    if (getSignalReason(signal) === "busy") {
                        setBusyCallUserId(signal.fromUserId);
                    }
                    const remainingParticipants =
                        current.participantUserIds.filter(
                            (id) => id !== signal.fromUserId,
                        );
                    if (remainingParticipants.length <= 1) {
                        resetCallState();
                        void persistCallMessage(current.callType, "rejected", 0);
                        return;
                    }
                    closePeerConnectionForUser(signal.fromUserId);
                    updateCallParticipants(remainingParticipants);
                    sendParticipantSnapshot(remainingParticipants);
                    void ensurePeerConnectionsForParticipants(
                        remainingParticipants,
                    );
                }
                return;
            }
            if (signal.event === "end-call") {
                const remainingParticipants = current.participantUserIds.filter(
                    (id) => id !== signal.fromUserId,
                );
                if (remainingParticipants.length > 1) {
                    closePeerConnectionForUser(signal.fromUserId);
                    updateCallParticipants(remainingParticipants);
                    sendParticipantSnapshot(remainingParticipants);
                    void ensurePeerConnectionsForParticipants(
                        remainingParticipants,
                    );
                    return;
                }
                const elapsed = durationSecondsRef.current;
                const shouldPersist = current.isCaller;
                const callType = current.callType;
                resetCallState();
                if (shouldPersist) {
                    void persistCallMessage(callType, "ended", elapsed);
                }
            }
        },
        [
            addIceCandidateOrQueue,
            acceptIncomingSignal,
            acceptPeerOffer,
            applyStatus,
            clearUnansweredTimeout,
            closePeerConnectionForUser,
            conversationId,
            currentUserId,
            flushQueuedIceCandidates,
            getPeerConnection,
            ensurePeerConnectionsForParticipants,
            isWebRTCSupported,
            notifyExistingParticipantsToConnect,
            persistCallMessage,
            placeOutgoingCallToUsers,
            resetCallState,
            sendParticipantSnapshot,
            startDurationTimer,
            updateCallParticipants,
        ],
    );
    useEffect(() => {
        if (rejoinProbeTimerRef.current) {
            clearTimeout(rejoinProbeTimerRef.current);
            rejoinProbeTimerRef.current = null;
        }

        if (!rejoinableCall) return;

        rejoinableCall.participantUserIds.forEach((targetUserId) => {
            chatWebsocketService.sendCallSignal({
                event: "check-active-call",
                conversationId,
                callId: rejoinableCall.callId,
                callType: rejoinableCall.callType,
                fromUserId: currentUserId,
                targetUserId,
            });
        });

        rejoinProbeTimerRef.current = setTimeout(() => {
            setRejoinableCall(null);
            rejoinProbeTimerRef.current = null;
        }, 7000);

        return () => {
            if (rejoinProbeTimerRef.current) {
                clearTimeout(rejoinProbeTimerRef.current);
                rejoinProbeTimerRef.current = null;
            }
        };
    }, [conversationId, currentUserId, rejoinableCall]);

    useEffect(() => {
        let disposed = false;
        const onCallEvent = (event: CallSignalPayload) => {
            if (disposed) return;
            void handleCallSignal(event);
        };
        const setup = async () => {
            if (!chatWebsocketService.isConnected()) {
                await chatWebsocketService.connect();
            }
            if (disposed) return;
            chatWebsocketService.subscribeToCallEvents(currentUserId, onCallEvent);
            const targetIds = Array.from(
                new Set(
                    (targetUserIdsKey
                        ? targetUserIdsKey
                              .split(",")
                              .map((id) => Number(id))
                              .filter(Number.isFinite)
                        : targetUserId
                          ? [targetUserId]
                          : []
                    ).filter((id) => id !== currentUserId),
                ),
            );
            if (targetIds.length && !activeCallRef.current) {
                activeCallRequestAtRef.current = Date.now();
                targetIds.forEach((targetId) => {
                    chatWebsocketService.sendCallSignal({
                        event: "request-active-call",
                        conversationId,
                        callId: `conversation-${conversationId}`,
                        callType: "audio",
                        fromUserId: currentUserId,
                        targetUserId: targetId,
                    });
                });
            }
        };
        void setup();
        return () => {
            disposed = true;
            chatWebsocketService.unsubscribeFromCallEvents(currentUserId, onCallEvent);
            if (rejoinProbeTimerRef.current) {
                clearTimeout(rejoinProbeTimerRef.current);
                rejoinProbeTimerRef.current = null;
            }
            const currentRuntimeCall = chatRuntimeStore.getActiveCall();
            if (
                currentRuntimeCall?.conversationId === conversationId &&
                currentRuntimeCall.userId === currentUserId
            ) {
                chatRuntimeStore.setActiveCall(null);
            }
            resetCallState();
        };
    }, [
        conversationId,
        currentUserId,
        handleCallSignal,
        resetCallState,
        targetUserId,
        targetUserIdsKey,
    ]);
    const callDurationText = useMemo(() => {
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = durationSeconds % 60;
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }, [durationSeconds]);
    return {
        incomingCall,
        activeCall,
        rejoinableCall,
        busyCallUserId,
        callStatus: activeCall?.status ?? null,
        localStreamUrl,
        remoteStreamUrl,
        remoteStreamUrls,
        micEnabled,
        cameraEnabled,
        speakerEnabled,
        isCallSupported: isWebRTCSupported,
        callDurationText,
        startCall,
        rejoinActiveCall,
        clearBusyCallNotice: () => setBusyCallUserId(null),
        inviteUsersToCall,
        maxCallParticipants: MAX_CALL_PARTICIPANTS,
        acceptIncomingCall,
        rejectIncomingCall,
        endCall,
        toggleMic,
        toggleCamera: () => toggleCamera(activeCallRef.current?.callType ?? null),
        switchCamera: () => switchCamera(activeCallRef.current?.callType ?? null),
        toggleSpeaker,
    };
}
