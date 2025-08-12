import { useVideoCall } from "@/context/VideoCallContext"
import { useAppContext } from "@/context/AppContext"
import { useState } from "react"
import { BsPersonVideo3, BsTelephone, BsTelephoneX } from "react-icons/bs"
import { toast } from "react-hot-toast"
import cn from "classnames"

interface VideoCallButtonProps {
    className?: string
}

function VideoCallButton({ className }: VideoCallButtonProps) {
    const {
        isVideoCallActive,
        startTeamVideoCall,
        joinTeamVideoCall,
        endVideoCall,
        participants
    } = useVideoCall()
    
    const { users, currentUser } = useAppContext()
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)

    // Get team members in the current room
            const teamMembers = users.filter(user => user.roomId === currentUser.roomId)
        const hasTeamMembers = teamMembers.length > 0

    const handleStartCall = async () => {
        if (!hasTeamMembers) {
            toast.error("You need to be in a room to start a video call")
            return
        }
        
        try {
            await startTeamVideoCall()
            setIsDropdownOpen(false)
        } catch (error) {
            console.error("Failed to start video call:", error)
        }
    }

    const handleJoinCall = async () => {
        try {
            await joinTeamVideoCall()
            setIsDropdownOpen(false)
        } catch (error) {
            console.error("Failed to join video call:", error)
        }
    }

    const handleEndCall = () => {
        endVideoCall()
        setIsDropdownOpen(false)
    }

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen)
    }

    if (!hasTeamMembers) {
        return null // Don't show button if no team members
    }

    return (
        <div className={cn("relative", className)}>
            {/* Main Button */}
            <button
                onClick={toggleDropdown}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
                    {
                        "bg-primary hover:bg-primary/80 text-black": isVideoCallActive,
                        "bg-darkHover hover:bg-gray-600 text-white": !isVideoCallActive
                    }
                )}
                title={isVideoCallActive ? "Video call active" : "Start video call"}
            >
                <BsPersonVideo3 size={20} />
                <span className="hidden sm:inline">
                    {isVideoCallActive ? "Video Call" : "Video Call"}
                </span>
                {isVideoCallActive && (
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                )}
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-dark border border-gray-600 rounded-lg shadow-xl z-50">
                    <div className="p-4">
                        <h3 className="text-white font-semibold mb-3">Team Video Call</h3>
                        
                        {/* Team Members Info */}
                        <div className="mb-4">
                            <p className="text-gray-300 text-sm mb-2">
                                Team Members ({teamMembers.length}):
                            </p>
                            <div className="space-y-1">
                                {teamMembers.map((member) => (
                                    <div key={member.socketId || member.username} className="flex items-center gap-2">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            member.username === currentUser.username 
                                                ? "bg-green-500" 
                                                : "bg-blue-500"
                                        )}></div>
                                        <span className="text-white text-sm">
                                            {member.username}
                                            {member.username === currentUser.username && " (You)"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Call Status */}
                        {isVideoCallActive && (
                            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                                <p className="text-green-400 text-sm font-medium">
                                    Video call active with {participants.length} participant{participants.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-2">
                            {!isVideoCallActive ? (
                                <>
                                    <button
                                        onClick={handleStartCall}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-black rounded-lg transition-colors"
                                    >
                                        <BsTelephone size={16} />
                                        Start Team Call
                                    </button>
                                    
                                    {participants.length > 0 && (
                                        <button
                                            onClick={handleJoinCall}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                        >
                                            <BsPersonVideo3 size={16} />
                                            Join Existing Call
                                        </button>
                                    )}
                                </>
                            ) : (
                                <button
                                    onClick={handleEndCall}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                >
                                    <BsTelephoneX size={16} />
                                    End Call
                                </button>
                            )}
                        </div>

                        {/* Room Info */}
                        <div className="mt-4 pt-3 border-t border-gray-600">
                            <p className="text-gray-400 text-xs">
                                Room: {currentUser.roomId}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Click outside to close dropdown */}
            {isDropdownOpen && (
                <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsDropdownOpen(false)}
                />
            )}
        </div>
    )
}

export default VideoCallButton