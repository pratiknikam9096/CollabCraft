import { useVideoCall } from "@/context/VideoCallContext"
import { useAppContext } from "@/context/AppContext"
import { useEffect, useRef, useState } from "react"
import { 
    BsCameraVideo, 
    BsCameraVideoOff, 
    BsMic, 
    BsMicMute,
    BsDisplay,
    BsTelephone,
    BsPersonVideo3,
    BsFullscreen,
    BsFullscreenExit
} from "react-icons/bs"
import { IoClose } from "react-icons/io5"
import cn from "classnames"

interface VideoCallInterfaceProps {
    isMinimized: boolean
    onMinimize: () => void
    onClose: () => void
}

function VideoCallInterface({ isMinimized, onMinimize, onClose }: VideoCallInterfaceProps) {
    const {
        localStream,
        remoteStreams,
        isVideoEnabled,
        isAudioEnabled,
        isScreenSharing,
        toggleVideo,
        toggleAudio,
        toggleScreenShare,
        endVideoCall
    } = useVideoCall()
    
    const { currentUser } = useAppContext()
    const localVideoRef = useRef<HTMLVideoElement>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)

    // Set up local video stream
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream
        }
    }, [localStream])

    const handleEndCall = () => {
        endVideoCall()
        onClose()
    }

    const toggleFullscreen = () => {
        if (!isFullscreen) {
            document.documentElement.requestFullscreen()
        } else {
            document.exitFullscreen()
        }
        setIsFullscreen(!isFullscreen)
    }

    if (isMinimized) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <div className="bg-dark border border-primary rounded-lg p-2 shadow-lg">
                    <div className="flex items-center gap-2">
                        <BsPersonVideo3 className="text-primary" size={20} />
                        <span className="text-white text-sm">Video Call Active</span>
                        <button
                            onClick={onMinimize}
                            className="text-white hover:text-primary"
                        >
                            <BsFullscreen size={16} />
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={cn(
            "fixed inset-0 z-50 bg-dark",
            { "bg-black": isFullscreen }
        )}>
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <BsPersonVideo3 className="text-primary" size={24} />
                        <div>
                            <h3 className="text-white font-semibold">Video Call</h3>
                            <p className="text-gray-300 text-sm">
                                {remoteStreams.size + 1} participant{remoteStreams.size !== 0 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleFullscreen}
                            className="p-2 rounded-full bg-darkHover hover:bg-gray-600 text-white transition-colors"
                        >
                            {isFullscreen ? <BsFullscreenExit size={20} /> : <BsFullscreen size={20} />}
                        </button>
                        <button
                            onClick={onMinimize}
                            className="p-2 rounded-full bg-darkHover hover:bg-gray-600 text-white transition-colors"
                        >
                            <IoClose size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Video Grid */}
            <div className="h-full flex items-center justify-center p-4 pt-20 pb-24">
                <div className={cn(
                    "grid gap-4 w-full h-full",
                    {
                        "grid-cols-1": remoteStreams.size === 0,
                        "grid-cols-2": remoteStreams.size === 1,
                        "grid-cols-2 grid-rows-2": remoteStreams.size >= 2 && remoteStreams.size <= 4,
                        "grid-cols-3 grid-rows-2": remoteStreams.size > 4
                    }
                )}>
                    {/* Local Video */}
                    <div className="relative bg-darkHover rounded-lg overflow-hidden">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        {!isVideoEnabled && (
                            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                                <div className="text-center">
                                    <BsCameraVideoOff className="mx-auto mb-2 text-gray-400" size={48} />
                                    <p className="text-white font-semibold">{currentUser.username}</p>
                                    <p className="text-gray-400 text-sm">Camera off</p>
                                </div>
                            </div>
                        )}
                        <div className="absolute bottom-2 left-2 bg-black/50 rounded px-2 py-1">
                            <span className="text-white text-sm font-medium">You</span>
                        </div>
                        <div className="absolute bottom-2 right-2 flex gap-1">
                            {!isAudioEnabled && (
                                <BsMicMute className="text-red-500" size={16} />
                            )}
                            {isScreenSharing && (
                                <BsDisplay className="text-primary" size={16} />
                            )}
                        </div>
                    </div>

                    {/* Remote Videos */}
                    {Array.from(remoteStreams.entries()).map(([socketId, stream]) => (
                        <RemoteVideo key={socketId} socketId={socketId} stream={stream} />
                    ))}
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-6">
                <div className="flex justify-center items-center gap-4">
                    {/* Audio Toggle */}
                    <button
                        onClick={toggleAudio}
                        className={cn(
                            "p-4 rounded-full transition-all duration-200",
                            {
                                "bg-darkHover hover:bg-gray-600 text-white": isAudioEnabled,
                                "bg-red-500 hover:bg-red-600 text-white": !isAudioEnabled
                            }
                        )}
                        title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
                    >
                        {isAudioEnabled ? <BsMic size={24} /> : <BsMicMute size={24} />}
                    </button>

                    {/* Video Toggle */}
                    <button
                        onClick={toggleVideo}
                        className={cn(
                            "p-4 rounded-full transition-all duration-200",
                            {
                                "bg-darkHover hover:bg-gray-600 text-white": isVideoEnabled,
                                "bg-red-500 hover:bg-red-600 text-white": !isVideoEnabled
                            }
                        )}
                        title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
                    >
                        {isVideoEnabled ? <BsCameraVideo size={24} /> : <BsCameraVideoOff size={24} />}
                    </button>

                    {/* Screen Share */}
                    <button
                        onClick={toggleScreenShare}
                        className={cn(
                            "p-4 rounded-full transition-all duration-200",
                            {
                                "bg-darkHover hover:bg-gray-600 text-white": !isScreenSharing,
                                "bg-primary hover:bg-green-400 text-black": isScreenSharing
                            }
                        )}
                        title={isScreenSharing ? "Stop screen sharing" : "Share screen"}
                    >
                        <BsDisplay size={24} />
                    </button>

                    {/* End Call */}
                    <button
                        onClick={handleEndCall}
                        className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all duration-200"
                        title="End call"
                    >
                        <BsTelephone size={24} />
                    </button>
                </div>
            </div>
        </div>
    )
}

// Remote Video Component
function RemoteVideo({ socketId, stream }: { socketId: string, stream: MediaStream }) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const { users } = useAppContext()
    
    const user = users.find(u => u.socketId === socketId)
    const username = user?.username || 'Unknown User'

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    const hasVideo = stream.getVideoTracks().some(track => track.enabled)
    const hasAudio = stream.getAudioTracks().some(track => track.enabled)

    return (
        <div className="relative bg-darkHover rounded-lg overflow-hidden">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
            />
            {!hasVideo && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <div className="text-center">
                        <BsCameraVideoOff className="mx-auto mb-2 text-gray-400" size={48} />
                        <p className="text-white font-semibold">{username}</p>
                        <p className="text-gray-400 text-sm">Camera off</p>
                    </div>
                </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 rounded px-2 py-1">
                <span className="text-white text-sm font-medium">{username}</span>
            </div>
            <div className="absolute bottom-2 right-2 flex gap-1">
                {!hasAudio && (
                    <BsMicMute className="text-red-500" size={16} />
                )}
            </div>
        </div>
    )
}

export default VideoCallInterface