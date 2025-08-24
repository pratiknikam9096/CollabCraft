import { useVideoCall } from "@/context/VideoCallContext"
import { useAppContext } from "@/context/AppContext"
import { useChat } from "@/context/ChatContext"
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
    BsFullscreenExit,
    BsGrid3X3,
    BsGrid1X2,
    BsArrowsAngleExpand,
    BsThreeDots,
    BsChat,
    BsRecordCircle,
    BsSend
} from "react-icons/bs"
import { IoClose } from "react-icons/io5"
import cn from "classnames"
import toast from "react-hot-toast"

interface VideoCallInterfaceProps {
    isMinimized: boolean
    onMinimize: () => void
    onClose: () => void
}

interface VideoFrameProps {
    participant: any
    isResizable?: boolean
    onResize?: (size: { width: number; height: number }) => void
    onSpotlight?: (socketId: string) => void
    className?: string
    isMainView?: boolean
}

function VideoCallInterface({ isMinimized, onMinimize, onClose }: VideoCallInterfaceProps) {
    const {
        participants,
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
    const { messages, sendMessage } = useChat()
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [layout, setLayout] = useState<'grid' | 'spotlight'>('grid')
    const [spotlightParticipant, setSpotlightParticipant] = useState<string | null>(null)
    const [showChat, setShowChat] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [showParticipants, setShowParticipants] = useState(true)
    const [newMessage, setNewMessage] = useState("")
    const chatEndRef = useRef<HTMLDivElement>(null)

    // Auto-scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleEndCall = () => {
        endVideoCall()
        onClose()
    }

    const handleLeaveCall = () => {
        leaveVideoCall()
        onClose()
    }

    const handleSendMessage = () => {
        if (newMessage.trim()) {
            sendMessage(newMessage)
            setNewMessage("")
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
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

    const toggleRecording = () => {
        setIsRecording(!isRecording)
        // TODO: Implement actual recording functionality
        toast.success(isRecording ? "Recording stopped" : "Recording started")
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
                            {/* Network Status */}
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-green-400 text-xs">Network: Good</span>
                                </div>
                                <span className="text-gray-400 text-xs">•</span>
                                <span className="text-blue-400 text-xs">
                                    {participants.filter(p => p.isSpeaking).length} speaking
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Layout Toggle */}
                        <button
                            onClick={toggleLayout}
                            className="p-2 rounded-full bg-darkHover hover:bg-gray-600 text-white transition-colors"
                            title={layout === 'grid' ? 'Switch to Spotlight' : 'Switch to Grid'}
                        >
                            {layout === 'grid' ? <BsGrid1X2 size={20} /> : <BsGrid3X3 size={20} />}
                        </button>
                        
                        {/* Participants Toggle */}
                        <button
                            onClick={() => setShowParticipants(!showParticipants)}
                            className={cn(
                                "p-2 rounded-full transition-colors",
                                showParticipants 
                                    ? "bg-primary text-black" 
                                    : "bg-darkHover hover:bg-gray-600 text-white"
                            )}
                            title="Toggle participants list"
                        >
                            <BsPersonVideo3 size={20} />
                        </button>
                        
                        {/* Chat Toggle */}
                        <button
                            onClick={() => setShowChat(!showChat)}
                            className={cn(
                                "p-2 rounded-full transition-colors",
                                showChat 
                                    ? "bg-primary text-black" 
                                    : "bg-darkHover hover:bg-gray-600 text-white"
                            )}
                            title="Toggle chat"
                        >
                            <BsChat size={20} />
                        </button>
                        
                        {/* Fullscreen */}
                        <button
                            onClick={toggleFullscreen}
                            className="p-2 rounded-full bg-darkHover hover:bg-gray-600 text-white transition-colors"
                        >
                            {isFullscreen ? <BsFullscreenExit size={20} /> : <BsFullscreen size={20} />}
                        </button>
                        
                        {/* Minimize */}
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
            <div className={cn(
                "h-full flex items-center justify-center p-4 pt-20 pb-24 transition-all duration-300",
                {
                    "ml-64": showParticipants, // Show participants sidebar
                    "mr-80": showChat
                }
            )}>
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

                    {/* Recording */}
                    <button
                        onClick={toggleRecording}
                        className={cn(
                            "p-4 rounded-full transition-all duration-200",
                            {
                                "bg-darkHover hover:bg-gray-600 text-white": !isRecording,
                                "bg-red-500 hover:bg-red-600 text-white": isRecording
                            }
                        )}
                        title={isRecording ? "Stop recording" : "Start recording"}
                    >
                        <BsRecordCircle size={24} />
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

            {/* Chat Sidebar */}
            {showChat && (
                <div className="absolute right-0 top-0 bottom-0 w-80 bg-dark border-l border-gray-600 z-20 flex flex-col">
                    {/* Chat Header */}
                    <div className="p-4 border-b border-gray-600">
                        <h3 className="text-white font-semibold">Call Chat</h3>
                        <p className="text-gray-400 text-sm">Real-time messaging</p>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.length === 0 ? (
                            <div className="text-center text-gray-400 py-8">
                                <BsChat size={32} className="mx-auto mb-2" />
                                <p>No messages yet</p>
                                <p className="text-sm">Start the conversation!</p>
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex flex-col",
                                        msg.isLocal ? "items-end" : "items-start"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "max-w-xs px-3 py-2 rounded-lg",
                                            msg.isLocal
                                                ? "bg-primary text-black"
                                                : "bg-gray-600 text-white"
                                        )}
                                    >
                                        <p className="text-sm">{msg.message}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={cn(
                                            "text-xs",
                                            msg.isLocal ? "text-gray-400" : "text-gray-500"
                                        )}>
                                            {msg.username}
                                        </span>
                                        <span className={cn(
                                            "text-xs",
                                            msg.isLocal ? "text-gray-400" : "text-gray-500"
                                        )}>
                                            {msg.timestamp.toLocaleTimeString([], { 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 border-t border-gray-600">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type a message..."
                                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!newMessage.trim()}
                                className="p-2 bg-primary text-black rounded-lg hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <BsSend size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Participants List Sidebar */}
            {showParticipants && (
                <div className="absolute left-0 top-0 bottom-0 w-64 bg-dark border-r border-gray-600 z-20">
                    <div className="p-4">
                        <h3 className="text-white font-semibold mb-4">Participants ({participants.length})</h3>
                        <div className="space-y-2">
                            {participants.map((participant) => (
                                <div 
                                    key={participant.socketId}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg transition-colors",
                                        {
                                            "bg-primary/20 border border-primary": participant.isLocal,
                                            "bg-darkHover": !participant.isLocal
                                        }
                                    )}
                                >
                                    {/* Avatar/Status */}
                                    <div className="relative">
                                        <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                                            {participant.stream ? (
                                                <BsCameraVideo className="text-white" size={20} />
                                            ) : (
                                                <BsCameraVideoOff className="text-gray-400" size={20} />
                                            )}
                                        </div>
                                        {/* Speaking indicator */}
                                        {participant.isSpeaking && (
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-dark"></div>
                                        )}
                                        {/* Local indicator */}
                                        {participant.isLocal && (
                                            <div className="absolute -top-1 -left-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-dark text-xs text-white flex items-center justify-center">
                                                Y
                                            </div>
                                        )}
                                    </div>

                                    {/* Participant Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-medium truncate">
                                                {participant.username}
                                            </span>
                                            {participant.isLocal && (
                                                <span className="text-blue-400 text-xs">(You)</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            {/* Connection Quality */}
                                            <span className={cn(
                                                "px-2 py-1 rounded",
                                                {
                                                    "bg-green-500/20 text-green-400": participant.connectionQuality === 'excellent',
                                                    "bg-blue-500/20 text-blue-400": participant.connectionQuality === 'good',
                                                    "bg-yellow-500/20 text-yellow-400": participant.connectionQuality === 'fair',
                                                    "bg-red-500/20 text-red-400": participant.connectionQuality === 'poor'
                                                }
                                            )}>
                                                {participant.connectionQuality}
                                            </span>
                                            
                                            {/* Status Indicators */}
                                            {!participant.isVideoEnabled && (
                                                <span className="text-red-400">📹 Off</span>
                                            )}
                                            {!participant.isAudioEnabled && (
                                                <span className="text-red-400">🎤 Off</span>
                                            )}
                                            {participant.isScreenSharing && (
                                                <span className="text-primary">🖥️ Sharing</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-1">
                                        {!participant.isLocal && (
                                            <button
                                                onClick={() => setSpotlight(participant.socketId)}
                                                className="p-2 text-gray-400 hover:text-white transition-colors"
                                                title="Spotlight"
                                            >
                                                <BsArrowsAngleExpand size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
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
                        isMainView={true}
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
function VideoFrame({ participant, className, onSpotlight, isMainView }: VideoFrameProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [showControls, setShowControls] = useState(false)
    const [hasVideo, setHasVideo] = useState(false)

    useEffect(() => {
        if (videoRef.current && participant.stream) {
            console.log(`Setting video source for ${participant.username} (${participant.socketId}):`, 
                participant.stream.getTracks().length, 'tracks');
            
            // Check if the stream has video tracks
            const videoTracks = participant.stream.getVideoTracks();
            setHasVideo(videoTracks.length > 0 && videoTracks.some((track: MediaStreamTrack) => track.enabled));
            
            videoRef.current.srcObject = participant.stream;
            
            // Add event listeners to track video state changes
            const handleTrackEnded = () => {
                console.log(`Video track ended for ${participant.username}`);
                setHasVideo(false);
            };
            
            const handleTrackMute = () => {
                console.log(`Video track muted for ${participant.username}`);
                setHasVideo(false);
            };
            
            const handleTrackUnmute = () => {
                console.log(`Video track unmuted for ${participant.username}`);
                setHasVideo(true);
            };
            
            videoTracks.forEach((track: MediaStreamTrack) => {
                track.addEventListener('ended', handleTrackEnded);
                track.addEventListener('mute', handleTrackMute);
                track.addEventListener('unmute', handleTrackUnmute);
            });
            
            return () => {
                videoTracks.forEach((track: MediaStreamTrack) => {
                    track.removeEventListener('ended', handleTrackEnded);
                    track.removeEventListener('mute', handleTrackMute);
                    track.removeEventListener('unmute', handleTrackUnmute);
                });
            };
        } else if (videoRef.current) {
            videoRef.current.srcObject = null;
            setHasVideo(false);
        }
    }, [participant.stream, participant.username, participant.socketId])

    const handleSpotlight = () => {
        if (onSpotlight) {
            onSpotlight(participant.socketId)
        }
    }

    const hasAudio = participant.stream && participant.isAudioEnabled

    // Connection quality indicator
    const getConnectionQualityColor = (quality: string) => {
        switch (quality) {
            case 'excellent': return 'bg-green-500'
            case 'good': return 'bg-blue-500'
            case 'fair': return 'bg-yellow-500'
            case 'poor': return 'bg-red-500'
            default: return 'bg-gray-500'
        }
    }

    return (
        <div 
            className={cn(
                "relative bg-darkHover rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all duration-200",
                className,
                { "border-primary": isMainView }
            )}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            {/* Video Element */}
            {participant.stream && hasVideo ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={participant.isLocal}
                    className="w-full h-full object-cover"
                    onLoadedMetadata={() => console.log(`Video loaded for ${participant.username}`)}
                    onError={(e) => console.error(`Video error for ${participant.username}:`, e)}
                />
            ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <div className="text-center">
                        <BsCameraVideoOff className="mx-auto mb-2 text-gray-400" size={isMainView ? 64 : 32} />
                        <p className="text-white font-semibold">{participant.username}</p>
                        <p className="text-gray-400 text-sm">
                            {participant.isLocal ? 'Camera off' : hasVideo ? 'Connecting...' : 'No video'}
                        </p>
                    </div>
                </div>
            )}

            {/* Voice Activity Indicator */}
            {participant.isSpeaking && (
                <div className="absolute top-2 left-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                </div>
            )}

            {/* Connection Quality Indicator */}
            <div className="absolute top-2 right-2 flex items-center gap-1">
                <div className={cn(
                    "w-2 h-2 rounded-full",
                    getConnectionQualityColor(participant.connectionQuality)
                )}></div>
                {participant.isLocal && (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
            </div>

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
                {participant.isSpeaking && (
                    <BsMic className="text-green-400" size={16} />
                )}
            </div>

            {/* Hover Controls */}
            {showControls && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="flex gap-2">
                        {/* Spotlight Button */}
                        {onSpotlight && !isMainView && (
                            <button
                                onClick={handleSpotlight}
                                className="p-2 bg-black/70 rounded-full hover:bg-black/90 transition-colors"
                                title="Spotlight this participant"
                            >
                                <BsArrowsAngleExpand className="text-white" size={20} />
                            </button>
                        )}
                        
                        {/* More Options */}
                        <button
                            className="p-2 bg-black/70 rounded-full hover:bg-black/90 transition-colors"
                            title="More options"
                        >
                            <BsThreeDots className="text-white" size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Spotlight Button - Always visible for main view */}
            {isMainView && onSpotlight && (
                <button
                    onClick={handleSpotlight}
                    className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                    title="Exit spotlight mode"
                >
                    <BsGrid3X3 className="text-white" size={16} />
                </button>
            )}

            {/* Connection Quality Badge */}
            <div className="absolute top-2 left-2 bg-black/50 rounded px-2 py-1">
                <span className={cn(
                    "text-xs font-medium",
                    {
                        "text-green-400": participant.connectionQuality === 'excellent',
                        "text-blue-400": participant.connectionQuality === 'good',
                        "text-yellow-400": participant.connectionQuality === 'fair',
                        "text-red-400": participant.connectionQuality === 'poor'
                    }
                )}>
                    {participant.connectionQuality}
                </span>
            </div>
        </div>
    )
}

export default VideoCallInterface