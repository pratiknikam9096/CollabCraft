// import VideoCallManager from "@/components/video/VideoCallManager" 
import useResponsive from "@/hooks/useResponsive"
import VideoCallButton from "@/components/video/VideoCallButton"
import VideoCallOverlay from "@/components/video/VideoCallOverlay"
import { useVideoCall } from "@/context/VideoCallContext"

const VideoCallView = () => {
    const { viewHeight } = useResponsive()
    const { isVideoCallActive } = useVideoCall()

    const handleClose = () => {
        // Handle close if needed
    }

    return (
        <div
            className="flex max-h-full min-h-[400px] w-full flex-col gap-2 p-4"
            style={{ height: viewHeight }}
        >
            <h1 className="view-title">Video Call</h1>
            {/* Video Call Button - Always visible */}
            <div className="flex justify-center items-center">
            <VideoCallButton />
             {/* Video Call Overlay - Shows during calls */}
            {isVideoCallActive && (
                <VideoCallOverlay onClose={handleClose} />
            )}
            </div>
        </div>
    )
}

export default VideoCallView    
