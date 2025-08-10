import { useVideoCall } from "@/context/VideoCallContext"
import { useState } from "react"
import { BsCameraVideo, BsTelephone } from "react-icons/bs"
import { IoVideocam } from "react-icons/io5"
import VideoCallInterface from "./VideoCallInterface"
import cn from "classnames"

function VideoCallButton() {
    const { 
        isVideoCallActive, 
        startVideoCall, 
        endVideoCall,
        remoteStreams 
    } = useVideoCall()
    
    const [showInterface, setShowInterface] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)

    const handleStartCall = async () => {
        await startVideoCall()
        setShowInterface(true)
        setIsMinimized(false)
    }

    const handleEndCall = () => {
        endVideoCall()
        setShowInterface(false)
        setIsMinimized(false)
    }

    const handleMinimize = () => {
        setIsMinimized(!isMinimized)
    }

    const handleClose = () => {
        setShowInterface(false)
        setIsMinimized(false)
    }

    return (
        <>
            {/* Video Call Button */}
            <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
                {!isVideoCallActive ? (
                    <button
                        onClick={handleStartCall}
                        className="flex items-center gap-2 bg-primary hover:bg-green-400 text-black px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                        title="Start Video Call"
                    >
                        <IoVideocam size={20} />
                        <span className="hidden sm:inline">Start Call</span>
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        {/* Call Status */}
                        <div className="bg-dark/80 backdrop-blur-sm border border-primary/30 rounded-lg px-3 py-2 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-white text-sm font-medium">
                                Call Active ({remoteStreams.size + 1})
                            </span>
                        </div>

                        {/* Show/Hide Interface */}
                        <button
                            onClick={() => setShowInterface(!showInterface)}
                            className={cn(
                                "p-2 rounded-lg transition-all duration-200",
                                {
                                    "bg-primary hover:bg-green-400 text-black": !showInterface,
                                    "bg-darkHover hover:bg-gray-600 text-white": showInterface
                                }
                            )}
                            title={showInterface ? "Hide video call" : "Show video call"}
                        >
                            <BsCameraVideo size={20} />
                        </button>

                        {/* End Call */}
                        <button
                            onClick={handleEndCall}
                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200"
                            title="End call"
                        >
                            <BsTelephone size={20} />
                        </button>
                    </div>
                )}
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

export default VideoCallButton