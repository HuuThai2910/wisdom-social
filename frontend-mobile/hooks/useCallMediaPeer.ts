import { useCallback, useRef, useState } from "react";
import Constants from "expo-constants";

type InCallManagerShape = {
    start: (options: { media: "audio" | "video" }) => void;
    stop: () => void;
    setForceSpeakerphoneOn: (enabled: boolean) => void;
    setSpeakerphoneOn: (enabled: boolean) => void;
};

type WebRtcShape = {
    MediaStream?: new () => {
        addTrack: (track: unknown) => void;
        getTracks: () => Array<{ stop: () => void }>;
        getAudioTracks: () => Array<{ enabled: boolean }>;
        getVideoTracks: () => Array<{ enabled: boolean; _switchCamera?: () => void }>;
        toURL: () => string;
    };
    mediaDevices?: {
        getUserMedia: (constraints: {
            audio: boolean;
            video:
            | false
            | {
                facingMode: "user" | "environment";
            };
        }) => Promise<{
            getTracks: () => Array<{ stop: () => void }>;
            getAudioTracks: () => Array<{ enabled: boolean }>;
            getVideoTracks: () => Array<{ enabled: boolean; _switchCamera?: () => void }>;
            toURL: () => string;
        }>;
    };
    RTCPeerConnection?: new (config: RTCConfiguration) => {
        close: () => void;
        addTrack: (track: unknown, stream: unknown) => void;
        addIceCandidate: (candidate: unknown) => Promise<void>;
        createOffer: () => Promise<RTCSessionDescriptionInit>;
        createAnswer: () => Promise<RTCSessionDescriptionInit>;
        setLocalDescription: (description: unknown) => Promise<void>;
        setRemoteDescription: (description: unknown) => Promise<void>;
        onicecandidate?: (event: { candidate?: { toJSON: () => RTCIceCandidateInit } | null }) => void;
        ontrack?: (event: {
            streams: Array<{
                toURL: () => string;
                addTrack?: (track: unknown) => void;
                getTracks?: () => Array<{ stop: () => void }>;
            }>;
            track: unknown;
        }) => void;
    };
    RTCIceCandidate?: new (candidate: RTCIceCandidateInit) => unknown;
};

const expoEnv = Constants as {
    executionEnvironment?: string;
    appOwnership?: string;
};

const isExpoGo =
    expoEnv.executionEnvironment === "storeClient" ||
    expoEnv.appOwnership === "expo";

function loadInCallManager(): InCallManagerShape | null {
    if (isExpoGo) return null;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require("react-native-incall-manager");
        return (mod?.default ?? mod) as InCallManagerShape;
    } catch {
        return null;
    }
}

function loadWebRtc(): WebRtcShape {
    if (isExpoGo) return {};
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require("react-native-webrtc") as WebRtcShape;
    } catch {
        return {};
    }
}

const inCallManager = loadInCallManager();
const webRtc = loadWebRtc();
const MediaStreamClass = webRtc.MediaStream;
const mediaDevices = webRtc.mediaDevices;
const RTCPeerConnectionClass = webRtc.RTCPeerConnection;
const RTCIceCandidateClass = webRtc.RTCIceCandidate;
const WEBRTC_SUPPORTED = Boolean(
    mediaDevices?.getUserMedia &&
    RTCPeerConnectionClass &&
    RTCIceCandidateClass &&
    MediaStreamClass,
);

export type MobileCallType = "audio" | "video";

const RTC_CONFIG: RTCConfiguration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

interface CreatePeerParams {
    onIceCandidate: (candidate: RTCIceCandidateInit) => void;
}

export function useCallMediaPeer() {
    const [localStreamUrl, setLocalStreamUrl] = useState<string | null>(null);
    const [remoteStreamUrl, setRemoteStreamUrl] = useState<string | null>(null);
    const [micEnabled, setMicEnabled] = useState(true);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [speakerEnabled, setSpeakerEnabled] = useState(false);

    const peerConnectionRef = useRef<{
        close: () => void;
        addTrack: (track: unknown, stream: unknown) => void;
        addIceCandidate: (candidate: unknown) => Promise<void>;
        createOffer: () => Promise<RTCSessionDescriptionInit>;
        createAnswer: () => Promise<RTCSessionDescriptionInit>;
        setLocalDescription: (description: unknown) => Promise<void>;
        setRemoteDescription: (description: unknown) => Promise<void>;
        onicecandidate?: (event: { candidate?: { toJSON: () => RTCIceCandidateInit } | null }) => void;
        ontrack?: (event: { streams: Array<{ toURL: () => string }>; track: unknown }) => void;
    } | null>(null);
    const localStreamRef = useRef<{
        getTracks: () => Array<{ stop: () => void }>;
        getAudioTracks: () => Array<{ enabled: boolean }>;
        getVideoTracks: () => Array<{ enabled: boolean; _switchCamera?: () => void }>;
        toURL: () => string;
    } | null>(null);
    const remoteStreamRef = useRef<{
        addTrack?: (track: unknown) => void;
        getTracks?: () => Array<{ stop: () => void }>;
        toURL: () => string;
    } | null>(null);
    const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

    const stopAudioSession = useCallback(() => {
        if (!inCallManager) return;
        try {
            inCallManager.stop();
        } catch {
            // no-op
        }
    }, []);

    const startAudioSession = useCallback((callType: MobileCallType) => {
        const shouldUseSpeaker = callType === "video";
        setSpeakerEnabled(shouldUseSpeaker);

        if (!inCallManager) return;

        try {
            inCallManager.start({
                media: callType === "video" ? "video" : "audio",
            });
            inCallManager.setForceSpeakerphoneOn(shouldUseSpeaker);
            inCallManager.setSpeakerphoneOn(shouldUseSpeaker);
        } catch {
            // no-op
        }
    }, []);

    const cleanupPeer = useCallback(() => {
        const peer = peerConnectionRef.current;
        if (!peer) return;

        const mutablePeer = peer;
        mutablePeer.onicecandidate = undefined;
        mutablePeer.ontrack = undefined;

        peer.close();
        peerConnectionRef.current = null;
    }, []);

    const cleanupMedia = useCallback(() => {
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        remoteStreamRef.current?.getTracks?.().forEach((track) => track.stop());

        localStreamRef.current = null;
        remoteStreamRef.current = null;

        setLocalStreamUrl(null);
        setRemoteStreamUrl(null);
        setMicEnabled(true);
        setCameraEnabled(true);
        setSpeakerEnabled(false);
    }, []);

    const resetPeerAndMedia = useCallback(() => {
        stopAudioSession();
        cleanupPeer();
        cleanupMedia();
        pendingIceCandidatesRef.current = [];
    }, [cleanupMedia, cleanupPeer, stopAudioSession]);

    const createLocalStream = useCallback(async (callType: MobileCallType) => {
        if (!WEBRTC_SUPPORTED || !mediaDevices?.getUserMedia) {
            throw new Error("WEBRTC_NOT_SUPPORTED");
        }

        const stream = await mediaDevices.getUserMedia({
            audio: true,
            video:
                callType === "video"
                    ? {
                        facingMode: "user",
                    }
                    : false,
        });

        localStreamRef.current = stream;
        setLocalStreamUrl(stream.toURL());

        const audioTracks = stream.getAudioTracks();
        const videoTracks = stream.getVideoTracks();

        setMicEnabled(audioTracks.every((track) => track.enabled));
        setCameraEnabled(videoTracks.every((track) => track.enabled));

        return stream;
    }, []);

    const createPeerConnection = useCallback(
        (params: CreatePeerParams) => {
            cleanupPeer();

            if (!WEBRTC_SUPPORTED || !RTCPeerConnectionClass) {
                throw new Error("WEBRTC_NOT_SUPPORTED");
            }

            const peer = new RTCPeerConnectionClass(RTC_CONFIG);
            peerConnectionRef.current = peer;

            const mutablePeer = peer;

            mutablePeer.onicecandidate = (event) => {
                if (!event.candidate) return;
                params.onIceCandidate(event.candidate.toJSON());
            };

            mutablePeer.ontrack = (event) => {
                const inboundStream = event.streams[0];
                if (inboundStream) {
                    remoteStreamRef.current = inboundStream;
                    setRemoteStreamUrl(inboundStream.toURL());
                    return;
                }

                if (!remoteStreamRef.current) {
                    if (!MediaStreamClass) return;
                    remoteStreamRef.current = new MediaStreamClass();
                }

                remoteStreamRef.current.addTrack?.(event.track);
                setRemoteStreamUrl(remoteStreamRef.current.toURL());
            };

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => {
                    peer.addTrack(track, localStreamRef.current);
                });
            }

            return peer;
        },
        [cleanupPeer],
    );

    const queueIceCandidate = useCallback((candidate: RTCIceCandidateInit) => {
        pendingIceCandidatesRef.current.push(candidate);
    }, []);

    const flushQueuedIceCandidates = useCallback(async () => {
        const peer = peerConnectionRef.current;
        if (!peer) return;

        const queued = [...pendingIceCandidatesRef.current];
        if (!queued.length) return;

        for (const candidate of queued) {
            try {
                if (!RTCIceCandidateClass) break;
                await peer.addIceCandidate(new RTCIceCandidateClass(candidate));
            } catch {
                // no-op
            }
        }

        pendingIceCandidatesRef.current = [];
    }, []);

    const addIceCandidateOrQueue = useCallback(
        async (candidate: RTCIceCandidateInit) => {
            const peer = peerConnectionRef.current;
            if (!peer) {
                queueIceCandidate(candidate);
                return;
            }

            try {
                if (!RTCIceCandidateClass) {
                    queueIceCandidate(candidate);
                    return;
                }
                await peer.addIceCandidate(new RTCIceCandidateClass(candidate));
            } catch {
                queueIceCandidate(candidate);
            }
        },
        [queueIceCandidate],
    );

    const toggleMic = useCallback(() => {
        const stream = localStreamRef.current;
        if (!stream) return;

        stream.getAudioTracks().forEach((track) => {
            track.enabled = !track.enabled;
        });

        setMicEnabled(stream.getAudioTracks().every((track) => track.enabled));
    }, []);

    const toggleCamera = useCallback((callType: MobileCallType | null) => {
        const stream = localStreamRef.current;
        if (!stream || callType !== "video") return;

        const videoTracks = stream.getVideoTracks();
        if (!videoTracks.length) return;

        videoTracks.forEach((track) => {
            track.enabled = !track.enabled;
        });

        setCameraEnabled(videoTracks.every((track) => track.enabled));
    }, []);

    const switchCamera = useCallback((callType: MobileCallType | null) => {
        const stream = localStreamRef.current;
        if (!stream || callType !== "video") return;

        const videoTrack = stream.getVideoTracks()[0] as
            | {
                _switchCamera?: () => void;
            }
            | undefined;

        if (videoTrack && typeof videoTrack._switchCamera === "function") {
            videoTrack._switchCamera();
        }
    }, []);

    const toggleSpeaker = useCallback(() => {
        setSpeakerEnabled((prev) => {
            const next = !prev;
            try {
                inCallManager?.setForceSpeakerphoneOn(next);
                inCallManager?.setSpeakerphoneOn(next);
            } catch {
                // no-op
            }
            return next;
        });
    }, []);

    return {
        peerConnectionRef,
        localStreamRef,
        localStreamUrl,
        remoteStreamUrl,
        micEnabled,
        cameraEnabled,
        speakerEnabled,
        isWebRTCSupported: WEBRTC_SUPPORTED,
        startAudioSession,
        stopAudioSession,
        createLocalStream,
        createPeerConnection,
        queueIceCandidate,
        flushQueuedIceCandidates,
        addIceCandidateOrQueue,
        resetPeerAndMedia,
        toggleMic,
        toggleCamera,
        switchCamera,
        toggleSpeaker,
    };
}
