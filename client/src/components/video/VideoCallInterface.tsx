import { useVideoCall } from "@/context/VideoCallContext"
import { useAppContext } from "@/context/AppContext"
import { useEffect, useRef, useState, useCallback } from "react"
import { 
    BsCameraVideo, 
    BsCameraVideoOff, 
    BsMic, 
    BsMicMute,
    BsDisplay,
    BsTelephone,
    BsPersonVideo3,
    BsFullscreen,
    BsFullscreenExit,
    BsGrid3X3,
    BsGrid1X2,
    BsArrowsAngleExpand,
    BsArrowsAngleContract
} from "react-icons/bs"
import { IoClose } from "react-icons/io5"
import cn from "classnames"

interface VideoCallInterfaceProps {
    isMinimized: boolean
    onMinimize: () => void
    onClose: () => void
}

interface VideoFrameProps {
    participant: any
    isResizable?: boolean
    onResize?: (size: { width: number; height: number }) => void
    className?: string
}

function VideoCallInterface({ isMinimized, onMinimize, onClose }: VideoCallInterfaceProps) {
    const {
        participants,
        isVideoCallActive,
        isVideoEnabled,
        isAudioEnabled,
        isScreenSharing,
        toggleVideo,
        toggleAudio,
        toggleScreenShare,
        endVideoCall,
        leaveVideoCall
    } = useVideoCall()
    
    const { currentUser } = useAppContext()
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [layout, setLayout] = useState<'grid' | 'spotlight'>('grid')
    const [spotlightParticipant, setSpotlightParticipant] = useState<string | null>(null)

    const handleEndCall = () => {
        endVideoCall()
        onClose()
    }

    const handleLeaveCall = () => {
        leaveVideoCall()
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

    const toggleLayout = () => {
        setLayout(layout === 'grid' ? 'spotlight' : 'grid')
    }

    const setSpotlight = (socketId: string) => {
        setSpotlightParticipant(spotlightParticipant === socketId ? null : socketId)
    }

    if (isMinimized) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <div className="bg-dark border border-primary rounded-lg p-2 shadow-lg">
                    <div className="flex items-center gap-2">
                        <BsPersonVideo3 className="text-primary" size={20} />
                        <span className="text-white text-sm">Team Video Call</span>
                        <span className="text-gray-400 text-xs">
                            {participants.length} participant{participants.length !== 1 ? 's' : ''}
                        </span>
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
                            <h3 className="text-white font-semibold">Team Video Call</h3>
                            <p className="text-gray-300 text-sm">
                                {participants.length} participant{participants.length !== 1 ? 's' : ''} • Room: {currentUser.roomId}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleLayout}
                            className="p-2 rounded-full bg-darkHover hover:bg-gray-600 text-white transition-colors"
                            title={layout === 'grid' ? 'Switch to Spotlight' : 'Switch to Grid'}
                        >
                            {layout === 'grid' ? <BsGrid1X2 size={20} /> : <BsGrid3X3 size={20} />}
                        </button>
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
                {layout === 'grid' ? (
                    <VideoGrid 
                        participants={participants} 
                        onSpotlight={setSpotlight}
                    />
                ) : (
                    <VideoSpotlight 
                        participants={participants}
                        spotlightId={spotlightParticipant}
                        onSpotlight={setSpotlight}
                    />
                )}
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

                    {/* Leave Call */}
                    <button
                        onClick={handleLeaveCall}
                        className="p-4 rounded-full bg-yellow-500 hover:bg-yellow-600 text-white transition-all duration-200"
                        title="Leave call"
                    >
                        <BsTelephone size={24} />
                    </button>

                    {/* End Call */}
                    <button
                        onClick={handleEndCall}
                        className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all duration-200"
                        title="End call for everyone"
                    >
                        <IoClose size={24} />
                    </button>
                </div>
            </div>
        </div>
    )
}

// Video Grid Component
function VideoGrid({ participants, onSpotlight }: { 
    participants: any[], 
    onSpotlight: (socketId: string) => void 
}) {
    const gridClass = cn(
        "grid gap-4 w-full h-full",
        {
            "grid-cols-1": participants.length === 1,
            "grid-cols-2": participants.length === 2,
            "grid-cols-2 grid-rows-2": participants.length >= 3 && participants.length <= 4,
            "grid-cols-3 grid-rows-2": participants.length >= 5 && participants.length <= 6,
            "grid-cols-4 grid-rows-2": participants.length >= 7 && participants.length <= 8,
            "grid-cols-4 grid-rows-3": participants.length >= 9
        }
    )

    return (
        <div className={gridClass}>
            {participants.map((participant) => (
                <VideoFrame 
                    key={participant.socketId} 
                    participant={participant}
                    onSpotlight={onSpotlight}
                    className="relative group"
                />
            ))}
        </div>
    )
}

// Video Spotlight Component
function VideoSpotlight({ participants, spotlightId, onSpotlight }: {
    participants: any[]
    spotlightId: string | null
    onSpotlight: (socketId: string) => void
}) {
    const mainParticipant = spotlightId 
        ? participants.find(p => p.socketId === spotlightId) 
        : participants[0]
    
    const otherParticipants = participants.filter(p => p.socketId !== mainParticipant?.socketId)

    return (
        <div className="flex gap-4 w-full h-full">
            {/* Main Spotlight */}
            <div className="flex-1">
                {mainParticipant && (
                    <VideoFrame 
                        participant={mainParticipant}
                        className="h-full"
                        onSpotlight={onSpotlight}
                    />
                )}
            </div>
            
            {/* Sidebar */}
            {otherParticipants.length > 0 && (
                <div className="w-48 space-y-2">
                    {otherParticipants.map((participant) => (
                        <VideoFrame 
                            key={participant.socketId} 
                            participant={participant}
                            className="h-32"
                            onSpotlight={onSpotlight}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

// Individual Video Frame Component
function VideoFrame({ participant, className, onSpotlight }: VideoFrameProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isResizing, setIsResizing] = useState(false)
    const [size, setSize] = useState({ width: 0, height: 0 })

    useEffect(() => {
        if (videoRef.current && participant.stream) {
            videoRef.current.srcObject = participant.stream
        }
    }, [participant.stream])

    const handleSpotlight = () => {
        if (onSpotlight) {
            onSpotlight(participant.socketId)
        }
    }

    const hasVideo = participant.stream && participant.isVideoEnabled
    const hasAudio = participant.stream && participant.isAudioEnabled

    return (
        <div className={cn(
            "relative bg-darkHover rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all duration-200",
            className
        )}>
            {/* Video Element */}
            {participant.stream ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={participant.isLocal}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <div className="text-center">
                        <BsCameraVideoOff className="mx-auto mb-2 text-gray-400" size={48} />
                        <p className="text-white font-semibold">{participant.username}</p>
                        <p className="text-gray-400 text-sm">
                            {participant.isLocal ? 'Camera off' : 'Connecting...'}
                        </p>
                    </div>
                </div>
            )}

            {/* Overlay Information */}
            <div className="absolute bottom-2 left-2 bg-black/50 rounded px-2 py-1">
                <span className="text-white text-sm font-medium">
                    {participant.isLocal ? 'You' : participant.username}
                </span>
            </div>

            {/* Status Indicators */}
            <div className="absolute bottom-2 right-2 flex gap-1">
                {!hasAudio && (
                    <BsMicMute className="text-red-500" size={16} />
                )}
                {participant.isScreenSharing && (
                    <BsDisplay className="text-primary" size={16} />
                )}
                {participant.isLocal && (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
            </div>

            {/* Spotlight Button */}
            {onSpotlight && (
                <button
                    onClick={handleSpotlight}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                    title="Spotlight this participant"
                >
                    <BsArrowsAngleExpand className="text-white" size={16} />
                </button>
            )}

            {/* Resize Handle */}
            {isResizing && (
                <div className="absolute inset-0 border-2 border-primary pointer-events-none"></div>
            )}
        </div>
    )
}

export default VideoCallInterface