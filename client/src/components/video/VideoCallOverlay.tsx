import { useVideoCall } from "@/context/VideoCallContext"
import { useState } from "react"
import { BsCameraVideo, BsMic, BsMicMute, BsDisplay, BsTelephone, BsX } from "react-icons/bs"
import cn from "classnames"

interface VideoCallOverlayProps {
    onClose: () => void
}

function VideoCallOverlay({ onClose }: VideoCallOverlayProps) {
    const { 
        isVideoCallActive, 
        isVideoEnabled, 
        isAudioEnabled, 
        isScreenSharing,
        toggleVideo, 
        toggleAudio, 
        toggleScreenShare,
        leaveVideoCall,
        endVideoCall,
        participants
    } = useVideoCall()
    

    const [isMinimized, setIsMinimized] = useState(false)

    if (!isVideoCallActive) return null

    const handleLeaveCall = () => {
        leaveVideoCall()
        onClose()
    }

    const handleEndCall = () => {
        endVideoCall()
        onClose()
    }

    if (isMinimized) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <div className="bg-dark border border-primary rounded-lg p-3 shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-white text-sm font-medium">Video Call</span>
                            <span className="text-gray-400 text-xs">
                                {participants.length} participant{participants.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setIsMinimized(false)}
                                className="p-1 text-white hover:text-primary transition-colors"
                                title="Expand"
                            >
                                <BsCameraVideo size={16} />
                            </button>
                            <button
                                onClick={handleLeaveCall}
                                className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                title="Leave call"
                            >
                                <BsTelephone size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed top-4 right-4 z-50">
            <div className="bg-dark border border-gray-600 rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gray-800 px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-white text-sm font-medium">Team Call</span>
                        <span className="text-gray-400 text-xs">
                            {participants.length} participant{participants.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setIsMinimized(true)}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                            title="Minimize"
                        >
                            <BsX size={16} />
                        </button>
                    </div>
                </div>

                {/* Video Preview */}
                <div className="w-48 h-32 bg-gray-700 relative">
                    {participants.find(p => p.isLocal)?.stream ? (
                        <video
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                            ref={(el) => {
                                if (el && participants.find(p => p.isLocal)?.stream) {
                                    el.srcObject = participants.find(p => p.isLocal)!.stream!
                                }
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <BsCameraVideo className="text-gray-400" size={32} />
                        </div>
                    )}
                    
                    {/* Local indicator */}
                    <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded">
                        <span className="text-white text-xs">You</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="p-3 bg-gray-800">
                    <div className="flex justify-center gap-2">
                        {/* Audio Toggle */}
                        <button
                            onClick={toggleAudio}
                            className={cn(
                                "p-2 rounded-full transition-colors",
                                isAudioEnabled 
                                    ? "bg-gray-600 hover:bg-gray-500 text-white" 
                                    : "bg-red-500 hover:bg-red-600 text-white"
                            )}
                            title={isAudioEnabled ? "Mute" : "Unmute"}
                        >
                            {isAudioEnabled ? <BsMic size={16} /> : <BsMicMute size={16} />}
                        </button>

                        {/* Video Toggle */}
                        <button
                            onClick={toggleVideo}
                            className={cn(
                                "p-2 rounded-full transition-colors",
                                isVideoEnabled 
                                    ? "bg-gray-600 hover:bg-gray-500 text-white" 
                                    : "bg-red-500 hover:bg-red-600 text-white"
                            )}
                            title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
                        >
                            <BsCameraVideo size={16} />
                        </button>

                        {/* Screen Share */}
                        <button
                            onClick={toggleScreenShare}
                            className={cn(
                                "p-2 rounded-full transition-colors",
                                isScreenSharing 
                                    ? "bg-primary hover:bg-green-400 text-black" 
                                    : "bg-gray-600 hover:bg-gray-500 text-white"
                            )}
                            title={isScreenSharing ? "Stop sharing" : "Share screen"}
                        >
                            <BsDisplay size={16} />
                        </button>

                        {/* Leave Call */}
                        <button
                            onClick={handleLeaveCall}
                            className="p-2 rounded-full bg-yellow-500 hover:bg-yellow-600 text-white transition-colors"
                            title="Leave call"
                        >
                            <BsTelephone size={16} />
                        </button>

                        {/* End Call */}
                        <button
                            onClick={handleEndCall}
                            className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                            title="End call for everyone"
                        >
                            <BsX size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default VideoCallOverlay
