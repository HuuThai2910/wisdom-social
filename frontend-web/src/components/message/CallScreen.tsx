import { useEffect, useRef } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import type { CallStatus } from "../../services/websocket";

interface CallScreenProps {
    open: boolean;
    callType: "audio" | "video";
    remoteName: string;
    remoteAvatar?: string;
    status: CallStatus;
    durationText: string;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    remoteStreams?: Array<{ userId: number; stream: MediaStream }>;
    participants?: Array<{
        userId: number;
        name: string;
        avatar?: string;
    }>;
    micEnabled: boolean;
    cameraEnabled: boolean;
    isScreenSharing: boolean;
    canToggleCamera: boolean;
    canShareScreen: boolean;
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onToggleScreenShare: () => void;
    onEndCall: () => void;
}

function getStatusText(status: CallStatus) {
    if (status === "calling") return "Đang gọi...";
    if (status === "ringing") return "Đang đổ chuông...";
    if (status === "accepted") return "Đang trong cuộc gọi";
    if (status === "rejected") return "Cuộc gọi bị từ chối";
    return "Cuộc gọi đã kết thúc";
}

export default function CallScreen({
    open,
    callType,
    remoteName,
    remoteAvatar,
    status,
    durationText,
    localStream,
    remoteStream,
    remoteStreams = [],
    participants = [],
    micEnabled,
    cameraEnabled,
    isScreenSharing,
    canToggleCamera,
    canShareScreen,
    onToggleMic,
    onToggleCamera,
    onToggleScreenShare,
    onEndCall,
}: CallScreenProps) {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);

    const isGroupCall = remoteStreams.length > 1;
    const showParticipants = participants.length > 0;

    const attachStreamToMediaElement = (
        element: HTMLMediaElement | null,
        stream: MediaStream | null,
    ) => {
        if (!element) return;

        if (element.srcObject !== stream) {
            element.srcObject = stream;
        }

        if (stream) {
            void element.play().catch(() => undefined);
        }
    };

    useEffect(() => {
        if (!open) return;
        attachStreamToMediaElement(localVideoRef.current, localStream);
    }, [open, localStream]);

    useEffect(() => {
        if (!open) return;
        attachStreamToMediaElement(remoteVideoRef.current, remoteStream);
    }, [open, remoteStream]);

    useEffect(() => {
        if (!open) return;

        if (callType !== "audio") {
            attachStreamToMediaElement(remoteAudioRef.current, null);
            return;
        }

        attachStreamToMediaElement(remoteAudioRef.current, remoteStream);
    }, [open, callType, remoteStream]);

    if (!open) return null;

    const showTimer = status === "accepted";

    return (
        <div className="fixed inset-0 z-[95] bg-gray-950 text-white">
            <audio
                ref={remoteAudioRef}
                autoPlay
                playsInline
                className="absolute h-px w-px opacity-0 pointer-events-none"
            />

            {callType === "video" ? (
                <div className="relative h-full w-full">
                    {isGroupCall ? (
                        <div className="h-full w-full grid grid-cols-2 gap-2 p-2 bg-black">
                            {remoteStreams.map((remote) => (
                                <video
                                    key={remote.userId}
                                    autoPlay
                                    playsInline
                                    ref={(node) => {
                                        if (node)
                                            node.srcObject = remote.stream;
                                    }}
                                    onLoadedMetadata={(event) => {
                                        const element =
                                            event.currentTarget as HTMLVideoElement;
                                        void element
                                            .play()
                                            .catch(() => undefined);
                                    }}
                                    className="h-full w-full object-cover rounded-lg bg-gray-900"
                                />
                            ))}
                        </div>
                    ) : (
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="h-full w-full object-cover bg-black"
                        />
                    )}
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="absolute bottom-24 right-4 h-36 w-28 rounded-xl object-cover border border-white/20 bg-gray-900"
                    />

                    <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center">
                        <p className="text-lg font-semibold">{remoteName}</p>
                        <p className="text-sm text-gray-200">
                            {getStatusText(status)}
                        </p>
                        {isGroupCall && (
                            <p className="text-xs text-gray-300 mt-1">
                                {remoteStreams.length + 1} người trong cuộc gọi
                            </p>
                        )}
                        {showTimer && (
                            <p className="mt-1 text-xs text-gray-300">
                                {durationText}
                            </p>
                        )}
                    </div>

                    {showParticipants && (
                        <div className="absolute top-5 left-4 w-[260px] max-w-[calc(100vw-2rem)] rounded-xl border border-white/15 bg-black/45 backdrop-blur-sm p-3">
                            <p className="text-xs uppercase tracking-wide text-gray-300 mb-2">
                                Thành viên cuộc gọi
                            </p>
                            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                {participants.map((member) => (
                                    <div
                                        key={member.userId}
                                        className="flex items-center gap-2"
                                    >
                                        <div className="min-w-0 flex items-center gap-2">
                                            <img
                                                src={
                                                    member.avatar ||
                                                    "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                                                }
                                                alt={member.name}
                                                className="h-7 w-7 rounded-full object-cover border border-white/20"
                                            />
                                            <span className="text-sm text-white truncate">
                                                {member.name}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center px-4 text-center">
                    <img
                        src={
                            remoteAvatar ||
                            "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                        }
                        alt={remoteName}
                        className="h-24 w-24 rounded-full object-cover border border-white/20"
                    />
                    <p className="mt-4 text-xl font-semibold">{remoteName}</p>
                    <p className="mt-2 text-sm text-gray-300">
                        {getStatusText(status)}
                    </p>
                    {showTimer && (
                        <p className="mt-1 text-sm text-gray-300">
                            {durationText}
                        </p>
                    )}

                    {showParticipants && (
                        <div className="mt-5 w-full max-w-sm rounded-xl border border-white/15 bg-white/5 p-3 text-left">
                            <p className="text-xs uppercase tracking-wide text-gray-300 mb-2">
                                Thành viên cuộc gọi
                            </p>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {participants.map((member) => (
                                    <div
                                        key={member.userId}
                                        className="flex items-center gap-2"
                                    >
                                        <div className="min-w-0 flex items-center gap-2">
                                            <img
                                                src={
                                                    member.avatar ||
                                                    "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                                                }
                                                alt={member.name}
                                                className="h-7 w-7 rounded-full object-cover border border-white/20"
                                            />
                                            <span className="text-sm text-white truncate">
                                                {member.name}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
                <button
                    type="button"
                    onClick={onToggleMic}
                    className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
                    title={micEnabled ? "Tắt mic" : "Bật mic"}
                >
                    {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                </button>

                {canToggleCamera && (
                    <button
                        type="button"
                        onClick={onToggleCamera}
                        className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
                        title={cameraEnabled ? "Tắt camera" : "Bật camera"}
                    >
                        {cameraEnabled ? (
                            <Video size={20} />
                        ) : (
                            <VideoOff size={20} />
                        )}
                    </button>
                )}

                {canShareScreen && (
                    <button
                        type="button"
                        onClick={onToggleScreenShare}
                        className="h-12 px-4 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-sm font-medium"
                        title={
                            isScreenSharing
                                ? "Dừng chia sẻ màn hình"
                                : "Chia sẻ màn hình"
                        }
                    >
                        {isScreenSharing ? "Dừng share" : "Share màn hình"}
                    </button>
                )}

                <button
                    type="button"
                    onClick={onEndCall}
                    className="h-12 w-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center"
                    title="Kết thúc cuộc gọi"
                >
                    <PhoneOff size={20} />
                </button>
            </div>
        </div>
    );
}
