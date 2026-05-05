import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Constants from "expo-constants";
import chatService from "@/services/chatService";
import chatWebsocketService, {
    type CallSignalPayload,
    type CallStatus,
} from "@/services/chatWebsocketService";
import type { Message } from "@/types/chat";
import { useCallMediaPeer } from "@/hooks/useCallMediaPeer";
export type CallType = "audio" | "video";
interface ActiveCallState {
    callId: string;
    callType: CallType;
    remoteUserId: number;
    remoteName: string;
    remoteAvatar?: string;
    status: CallStatus;
    isCaller: boolean;
}
interface UseOneToOneCallOptions {
    conversationId: number;
    currentUserId: number;
    targetUserId?: number;
    targetName?: string;
    targetAvatar?: string;
    onCallMessageSaved?: (message: Message) => void;
}
const UNANSWERED_CALL_TIMEOUT_MS = 20_000;

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
export function useOneToOneCall(options: UseOneToOneCallOptions) {
    const {
        conversationId,
        currentUserId,
        targetUserId,
        targetName,
        targetAvatar,
        onCallMessageSaved,
    } = options;
    const {
        peerConnectionRef,
        localStreamUrl,
        remoteStreamUrl,
        micEnabled,
        cameraEnabled,
        speakerEnabled,
        isWebRTCSupported,
        startAudioSession,
        createLocalStream,
        createPeerConnection,
        flushQueuedIceCandidates,
        addIceCandidateOrQueue,
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
    const [durationSeconds, setDurationSeconds] = useState(0);
    const activeCallRef = useRef<ActiveCallState | null>(null);
    const incomingCallRef = useRef<CallSignalPayload | null>(null);
    const callSavedRef = useRef(false);
    const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const durationSecondsRef = useRef(0);
    const unansweredTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    useEffect(() => {
        activeCallRef.current = activeCall;
    }, [activeCall]);
    useEffect(() => {
        incomingCallRef.current = incomingCall;
    }, [incomingCall]);
    useEffect(() => {
        durationSecondsRef.current = durationSeconds;
    }, [durationSeconds]);
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
        (callId: string, callType: CallType, remoteUserId: number) => {
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
                    targetUserId: remoteUserId,
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
    const startCall = useCallback(
        async (callType: CallType) => {
            if (!isWebRTCSupported) return false;
            if (!targetUserId) return false;
            if (activeCallRef.current || incomingCallRef.current) return false;
            callSavedRef.current = false;
            try {
                await createLocalStream(callType);
                startAudioSession(callType);
                const callId = `call-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
                const nextCall: ActiveCallState = {
                    callId,
                    callType,
                    remoteUserId: targetUserId,
                    remoteName: targetName || `Nguoi dung ${targetUserId}`,
                    remoteAvatar: targetAvatar,
                    status: "calling",
                    isCaller: true,
                };
                setActiveCall(nextCall);
                activeCallRef.current = nextCall;
                setDurationSeconds(0);
                const peer = createPeerConnection({
                    onIceCandidate: (candidate) => {
                        chatWebsocketService.sendCallSignal({
                            event: "ice-candidate",
                            conversationId,
                            callId,
                            callType,
                            fromUserId: currentUserId,
                            targetUserId,
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
                    targetUserId,
                    sdp: offer,
                });
                await flushQueuedIceCandidates();
                startUnansweredTimeout(callId, callType, targetUserId);
                return true;
            } catch {
                resetCallState();
                return false;
            }
        },
        [
            targetUserId,
            createLocalStream,
            startAudioSession,
            targetName,
            targetAvatar,
            createPeerConnection,
            conversationId,
            currentUserId,
            flushQueuedIceCandidates,
            isWebRTCSupported,
            startUnansweredTimeout,
            resetCallState,
        ],
    );
    const acceptIncomingCall = useCallback(async () => {
        if (!isWebRTCSupported) return false;
        const incoming = incomingCallRef.current;
        if (!incoming) return false;
        callSavedRef.current = false;
        try {
            await createLocalStream(incoming.callType);
            startAudioSession(incoming.callType);
            const peer = createPeerConnection({
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
            await flushQueuedIceCandidates();
            const nextCall: ActiveCallState = {
                callId: incoming.callId,
                callType: incoming.callType,
                remoteUserId: incoming.fromUserId,
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
        clearUnansweredTimeout();
        chatWebsocketService.sendCallSignal({
            event: "end-call",
            conversationId,
            callId: current.callId,
            callType: current.callType,
            fromUserId: currentUserId,
            targetUserId: current.remoteUserId,
        });
        const shouldPersist = current.isCaller;
        const elapsed = durationSecondsRef.current;
        const callType = current.callType;
        resetCallState();
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
    const handleCallSignal = useCallback(
        async (signal: CallSignalPayload) => {
            if (signal.conversationId !== conversationId) return;
            const current = activeCallRef.current;
            if (signal.event === "incoming-call" || signal.event === "call-user") {
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
                    });
                    return;
                }
                setIncomingCall(signal);
                incomingCallRef.current = signal;
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
                const peer = peerConnectionRef.current;
                const remoteDescription = toNativeSessionDescription(signal.sdp);
                if (!peer || !remoteDescription) return;
                await peer.setRemoteDescription(
                    toPeerSessionDescription(remoteDescription) as never,
                );
                await flushQueuedIceCandidates();
                clearUnansweredTimeout();
                applyStatus("accepted");
                setDurationSeconds(0);
                startDurationTimer();
                return;
            }
            if (signal.event === "ice-candidate") {
                if (!signal.candidate) return;
                await addIceCandidateOrQueue(signal.candidate);
                return;
            }
            if (signal.event === "reject-call") {
                if (current.isCaller) {
                    resetCallState();
                    void persistCallMessage(current.callType, "rejected", 0);
                }
                return;
            }
            if (signal.event === "end-call") {
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
            applyStatus,
            clearUnansweredTimeout,
            conversationId,
            currentUserId,
            flushQueuedIceCandidates,
            isWebRTCSupported,
            peerConnectionRef,
            persistCallMessage,
            resetCallState,
            startDurationTimer,
        ],
    );
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
        };
        void setup();
        return () => {
            disposed = true;
            chatWebsocketService.unsubscribeFromCallEvents(currentUserId, onCallEvent);
            resetCallState();
        };
    }, [currentUserId, handleCallSignal, resetCallState]);
    const callDurationText = useMemo(() => {
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = durationSeconds % 60;
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }, [durationSeconds]);
    return {
        incomingCall,
        activeCall,
        callStatus: activeCall?.status ?? null,
        localStreamUrl,
        remoteStreamUrl,
        micEnabled,
        cameraEnabled,
        speakerEnabled,
        isCallSupported: isWebRTCSupported,
        callDurationText,
        startCall,
        acceptIncomingCall,
        rejectIncomingCall,
        endCall,
        toggleMic,
        toggleCamera: () => toggleCamera(activeCallRef.current?.callType ?? null),
        switchCamera: () => switchCamera(activeCallRef.current?.callType ?? null),
        toggleSpeaker,
    };
}
