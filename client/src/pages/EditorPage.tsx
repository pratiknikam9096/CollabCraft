import SplitterComponent from "@/context/SplitterComponent"
import ConnectionStatusPage from "@/components/connection/ConnectionStatusPage"
import WorkSpace from "@/components/workspace"
import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import useFullScreen from "@/hooks/useFullScreen"
import useUserActivity from "@/hooks/useUserActivity"
import { SocketEvent } from "@/types/socket"
import { USER_STATUS } from "@/types/user"
import { useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import Sidebar from "@/components/sidebar/Sidebar"

function EditorPage() {
    // Listen user online/offline status
    useUserActivity()
    // Enable fullscreen mode
    useFullScreen()
    const navigate = useNavigate()
    const { roomId } = useParams()
    const { status, currentUser, clearUserData } = useAppContext()
    const { socket } = useSocket()

    useEffect(() => {
        // Check if user is authenticated
        if (currentUser.username && currentUser.roomId) {
            // User is authenticated, check if roomId matches
            if (currentUser.roomId === roomId) {
                // Room matches, try to reconnect
                if (status === USER_STATUS.DISCONNECTED) {
                    socket.emit(SocketEvent.JOIN_REQUEST, currentUser)
                }
            } else {
                // Room mismatch, clear user data and redirect
                clearUserData()
                navigate("/", { replace: true })
            }
        } else {
            // No user data, redirect to home
            navigate("/", { replace: true })
        }
    }, [currentUser, roomId, status, socket, navigate, clearUserData])

    // Handle authentication errors
    useEffect(() => {
        if (status === USER_STATUS.CONNECTION_FAILED) {
            // Clear user data on connection failure
            clearUserData()
            navigate("/", { replace: true })
        }
    }, [status, clearUserData, navigate])

    if (status === USER_STATUS.CONNECTION_FAILED) {
        return <ConnectionStatusPage />
    }

    // Show loading while connecting
    if (status === USER_STATUS.DISCONNECTED || status === USER_STATUS.ATTEMPTING_JOIN) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <div className="mb-4 text-2xl font-bold text-primary">Reconnecting...</div>
                    <div className="text-gray-400">Please wait while we reconnect you to the room.</div>
                </div>
            </div>
        )
    }

    // Only show editor when fully connected
    if (status !== USER_STATUS.JOINED) {
        return null
    }

    return (
        <div className="flex h-screen w-full flex-col bg-dark">
            
            <SplitterComponent>
                <Sidebar />
                <WorkSpace />
            </SplitterComponent>
        </div>
    )
}

export default EditorPage
