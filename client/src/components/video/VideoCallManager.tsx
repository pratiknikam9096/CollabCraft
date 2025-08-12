import { useState, useEffect } from "react"
import VideoCallButton from "./VideoCallButton"
import VideoCallOverlay from "./VideoCallOverlay"
import { useVideoCall } from "@/context/VideoCallContext"

function VideoCallManager() {
    const { isVideoCallActive } = useVideoCall()

    const handleClose = () => {
        // Handle close if needed
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
