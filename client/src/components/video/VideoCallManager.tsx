import { useState, useEffect } from "react"
import VideoCallButton from "./VideoCallButton"
import VideoCallOverlay from "./VideoCallOverlay"
import { useVideoCall } from "@/context/VideoCallContext"

function VideoCallManager() {
    const { isVideoCallActive } = useVideoCall()
    const [showInterface, setShowInterface] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)

    // Automatically show interface when video call becomes active
    useEffect(() => {
        if (isVideoCallActive) {
            setShowInterface(true)
        }
    }, [isVideoCallActive])

    const handleClose = () => {
        setShowInterface(false)
        setIsMinimized(false)
    }

    const handleMinimize = () => {
        setIsMinimized(!isMinimized)
    }

    return (
        <>
            {/* Video Call Button - Always visible */}
            <VideoCallButton />
            
            {/* Video Call Overlay - Shows during calls */}
            {isVideoCallActive && (
                <VideoCallOverlay onClose={handleClose} />
            )}
        </>
    )
}

export default VideoCallManager
