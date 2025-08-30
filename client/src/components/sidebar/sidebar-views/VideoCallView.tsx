// import VideoCallManager from "@/components/video/VideoCallManager" 
import useResponsive from "@/hooks/useResponsive"
import VideoCallButton from "@/components/video/VideoCallButton"
import VideoCallOverlay from "@/components/video/VideoCallOverlay"
import { useVideoCall, VideoCallFrame } from "@/context/VideoCallContext"
import "../../../context/VideoCall.css"

const VideoCallView = () => {
    const { viewHeight } = useResponsive()
    const { isVideoCallActive } = useVideoCall()

    const handleClose = () => {
        // Handle close if needed
    }

    return (
        <div className="flex flex-col p-4 min-h-0" style={{ height: viewHeight }}>
            <h1 className="view-title">Video Call</h1>
            {/* Video Call Button - Always visible */}
            <div className="flex flex-col justify-center items-center w-full">
                <VideoCallButton />

                {/* Video Call Overlay - Shows during calls */}
                {isVideoCallActive && (
                    <VideoCallOverlay onClose={handleClose} />
                )}
            </div>

            {/* Video grid/frame showing all participant videos (scrollable) */}
            <div className="flex-1 overflow-y-auto min-h-0 w-full mt-4">
                {isVideoCallActive && <VideoCallFrame />}
            </div>
        </div>
    )
}

export default VideoCallView    
