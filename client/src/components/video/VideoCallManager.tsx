import { useVideoCall } from "@/context/VideoCallContext"
import { useState } from "react"
import VideoCallButton from "./VideoCallButton"
import VideoCallInterface from "./VideoCallInterface"

function VideoCallManager() {
    const { isVideoCallActive } = useVideoCall()
    const [showInterface, setShowInterface] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)

    const handleShowInterface = () => {
        setShowInterface(true)
        setIsMinimized(false)
    }

    const handleMinimize = () => {
        setIsMinimized(!isMinimized)
    }

    const handleClose = () => {
        setShowInterface(false)
        setIsMinimized(false)
    }

    // Auto-show interface when video call becomes active
    if (isVideoCallActive && !showInterface) {
        setShowInterface(true)
    }

    return (
        <>
            {/* Video Call Button - Fixed Position */}
            <div className="fixed top-4 right-4 z-40">
                <VideoCallButton 
                    className="mb-2"
                />
            </div>

            {/* Video Call Interface */}
            {isVideoCallActive && showInterface && (
                <VideoCallInterface
                    isMinimized={isMinimized}
                    onMinimize={handleMinimize}
                    onClose={handleClose}
                />
            )}
        </>
    )
}

export default VideoCallManager
