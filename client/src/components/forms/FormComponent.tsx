import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { SocketEvent } from "@/types/socket"
import { USER_STATUS } from "@/types/user"
import { ChangeEvent, FormEvent, useEffect, useRef, useCallback } from "react"
import { toast } from "react-hot-toast"
import { useLocation, useNavigate } from "react-router-dom"
import { v4 as uuidv4 } from "uuid"
// import logo from "@/assets/logo.svg"

const FormComponent = () => {
    const location = useLocation()
    const { currentUser, setCurrentUser, status, setStatus, clearUserData } = useAppContext()
    const { socket } = useSocket()

    const usernameRef = useRef<HTMLInputElement | null>(null)
    const navigate = useNavigate()
    
    // Debug render counter
    const renderCount = useRef(0)
    renderCount.current += 1

    const createNewRoomId = useCallback(() => {
        setCurrentUser({ ...currentUser, roomId: uuidv4() })
        toast.success("Created a new Room Id")
        usernameRef.current?.focus()
    }, [currentUser, setCurrentUser])

    const handleInputChanges = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const name = e.target.name
        const value = e.target.value
        
        console.log(`Input change - ${name}:`, value)
        console.log(`Event type:`, e.type)
        console.log(`Target value:`, e.target.value)
        console.log(`Current user before update:`, currentUser)
        
        setCurrentUser({ 
            ...currentUser, 
            [name]: value 
        })
        
        console.log(`Set currentUser called with:`, { ...currentUser, [name]: value })
    }, [currentUser, setCurrentUser])

    const validateForm = useCallback(() => {
        const username = currentUser.username.trim()
        const roomId = currentUser.roomId.trim()
        
        console.log("Validating form:", { username, roomId })
        
        if (!username || username.length === 0) {
            toast.error("Enter your username")
            return false
        } else if (!roomId || roomId.length === 0) {
            toast.error("Enter a room id")
            return false
        } else if (roomId.length < 5) {
            toast.error("Room ID must be at least 5 characters long")
            return false
        } else if (username.length < 3) {
            toast.error("Username must be at least 3 characters long")
            return false
        }
        
        console.log("Form validation passed")
        return true
    }, [currentUser.username, currentUser.roomId])

    const joinRoom = useCallback((e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (status === USER_STATUS.ATTEMPTING_JOIN) return
        if (!validateForm()) return
        
        // Ensure we have valid values before sending
        const username = currentUser.username.trim()
        const roomId = currentUser.roomId.trim()
        
        console.log("Joining room:", { username, roomId })
        console.log("Current user state:", currentUser)
        
        // Double-check validation
        if (!username || !roomId) {
            toast.error("Username and room ID are required")
            return
        }
        
        toast.loading("Joining room...")
        setStatus(USER_STATUS.ATTEMPTING_JOIN)
        
        // Send the exact values we validated
        const joinData = { username, roomId }
        console.log("Sending JOIN_REQUEST with data:", joinData)
        console.log("Data type:", typeof joinData)
        console.log("Data keys:", Object.keys(joinData))
        console.log("Socket connected:", socket.connected)
        console.log("Socket ID:", socket.id)
        
        if (!socket.connected) {
            console.error("Socket not connected, attempting to connect...")
            socket.connect()
            toast.error("Connection lost, please try again")
            return
        }
        
        socket.emit(SocketEvent.JOIN_REQUEST, joinData)
    }, [status, validateForm, currentUser, setStatus, socket])

    // Clear any existing user data when component mounts
    useEffect(() => {
        clearUserData()
    }, [clearUserData])

    useEffect(() => {
        if (currentUser.roomId.length > 0) return
        if (location.state?.roomId) {
            setCurrentUser({ ...currentUser, roomId: location.state.roomId })
            if (currentUser.username.length === 0) {
                toast.success("Enter your username")
            }
        }
    }, [currentUser, location.state?.roomId, setCurrentUser])

    useEffect(() => {
        if (status === USER_STATUS.DISCONNECTED && !socket.connected) {
            console.log("Socket disconnected, attempting to connect...")
            socket.connect()
            return
        }

        if (status === USER_STATUS.JOINED && currentUser.username && currentUser.roomId) {
            // Ensure we have both username and roomId before navigating
            const username = currentUser.username
            const roomId = currentUser.roomId
            
            console.log("Status is JOINED, navigating to editor:", { username, roomId })
            
            // Add a small delay to ensure state is fully updated
            setTimeout(() => {
                navigate(`/editor/${roomId}`, {
                    state: { username },
                    replace: true
                })
            }, 100)
        }
    }, [currentUser.username, currentUser.roomId, navigate, socket, status])

    // Add socket connection status monitoring
    useEffect(() => {
        const handleConnect = () => {
            console.log("Socket connected, ready to join room")
        }
        
        const handleDisconnect = () => {
            console.log("Socket disconnected")
        }
        
        const handleError = (error: any) => {
            console.error("Socket error:", error)
        }
        
        socket.on("connect", handleConnect)
        socket.on("disconnect", handleDisconnect)
        socket.on("connect_error", handleError)
        
        return () => {
            socket.off("connect", handleConnect)
            socket.off("disconnect", handleDisconnect)
            socket.off("connect_error", handleError)
        }
    }, [socket])

    return (
        <div className="w-full">
            <form onSubmit={joinRoom} className="flex w-full flex-col gap-6">
                <input
                    type="text"
                    name="roomId"
                    placeholder="Room Id"
                    autoComplete="off"
                    spellCheck="false"
                    className="w-full rounded-lg border border-gray-600 bg-darkHover/80 px-4 py-4 text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-200 focus:border-primary focus:bg-darkHover focus:outline-none focus:ring-2 focus:ring-primary/20"
                    onChange={handleInputChanges}
                    value={currentUser.roomId}
                />
                <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    autoComplete="off"
                    spellCheck="false"
                    className="w-full rounded-lg border border-gray-600 bg-darkHover/80 px-4 py-4 text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    onChange={handleInputChanges}
                    value={currentUser.username}
                    ref={usernameRef}
                />
                
                {/* Debug info - remove this in production */}
                <div className="text-xs text-gray-500 bg-gray-800/50 p-2 rounded">
                    <div>Debug - Username: "{currentUser.username}" (length: {currentUser.username.length})</div>
                    <div>Debug - Room ID: "{currentUser.roomId}" (length: {currentUser.roomId.length})</div>
                    <div>Debug - Render count: {renderCount.current}</div>
                </div>
                <button
                    type="submit"
                    className="mt-4 w-full rounded-lg bg-gradient-to-r from-primary to-green-400 px-8 py-4 text-lg font-bold text-black transition-all duration-200 hover:from-green-400 hover:to-primary hover:shadow-lg hover:shadow-primary/25 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={status === USER_STATUS.ATTEMPTING_JOIN}
                >
                    {status === USER_STATUS.ATTEMPTING_JOIN ? "Joining..." : "Join Room"}
                </button>
            </form>
            <button
                className="mt-6 w-full cursor-pointer select-none text-center text-sm text-gray-400 underline transition-colors hover:text-primary"
                onClick={createNewRoomId}
            >
                Generate Unique Room Id
            </button>
            
            {/* Debug button for testing socket connection */}
            <button
                type="button"
                className="mt-4 w-full cursor-pointer select-none text-center text-sm text-gray-500 underline transition-colors hover:text-primary"
                onClick={() => {
                    console.log("Testing socket connection...")
                    console.log("Socket connected:", socket.connected)
                    console.log("Socket ID:", socket.id)
                    console.log("Backend URL:", import.meta.env.VITE_BACKEND_URL || "http://localhost:3001")
                    
                    if (socket.connected) {
                        toast.success("Socket is connected!")
                    } else {
                        toast.error("Socket is not connected")
                        socket.connect()
                    }
                }}
            >
                Test Socket Connection
            </button>
            
            {/* Test button for input state updates */}
            <button
                type="button"
                className="mt-2 w-full cursor-pointer select-none text-center text-sm text-blue-500 underline transition-colors hover:text-blue-400"
                onClick={() => {
                    console.log("Testing input state updates...")
                    setCurrentUser({ username: "testuser", roomId: "testroom123" })
                    toast.success("Set test values - check if inputs update!")
                }}
            >
                Test Input State Updates
            </button>
        </div>
    )
}

export default FormComponent
