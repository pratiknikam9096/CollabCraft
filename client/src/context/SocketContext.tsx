import { DrawingData } from "@/types/app"
import {
    SocketContext as SocketContextType,
    SocketEvent,
    SocketId,
} from "@/types/socket"
import { RemoteUser, USER_STATUS, User } from "@/types/user"
import {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
} from "react"
import { toast } from "react-hot-toast"
import { Socket, io } from "socket.io-client"
import { useAppContext } from "./AppContext"

const SocketContext = createContext<SocketContextType | null>(null)

export const useSocket = (): SocketContextType => {
    const context = useContext(SocketContext)
    if (!context) {
        throw new Error("useSocket must be used within a SocketProvider")
    }
    return context
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL 

const SocketProvider = ({ children }: { children: ReactNode }) => {
    const {
        users,
        setUsers,
        setStatus,
        setCurrentUser,
        drawingData,
        setDrawingData,
    } = useAppContext()
    
    const socket: Socket = useMemo(
        () =>
            io(BACKEND_URL, {
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
                auth: {
                    // Send stored room data on reconnection
                    roomId: localStorage.getItem('currentRoomId'),
                    username: localStorage.getItem('currentUsername')
                }
            }),
        [],
    )

    const SYNC_TOAST_ID = 'syncing-toast'
    const syncingToastRef = useRef<string | null>(null)
    const hasSyncedRef = useRef(false)
    const hasRequestedReconnectRef = useRef(false)

    const handleError = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err: any) => {
            console.log("socket error", err)
            setStatus(USER_STATUS.CONNECTION_FAILED)
            toast.dismiss()
            toast.error("Failed to connect to the server")
        },
        [setStatus],
    )

    const handleUsernameExist = useCallback(() => {
        toast.dismiss()
        setStatus(USER_STATUS.INITIAL)
        toast.error(
            "The username you chose already exists in the room. Please choose a different username.",
        )
    }, [setStatus])

    const handleJoiningAccept = useCallback(
        ({ user, users }: { user: User; users: RemoteUser[] }) => {
            console.log("Join accepted:", { user, users })
            
            // Update user state first
            setCurrentUser(user)
            setUsers(users)
            
            // Persist room data for refresh recovery
            localStorage.setItem('currentRoomId', user.roomId)
            localStorage.setItem('currentUsername', user.username)
            
            // Update status after user state is set
            setTimeout(() => {
                setStatus(USER_STATUS.JOINED)
                toast.dismiss()
                
                // Show syncing message only once per session if there are other users
                if (users.length > 1 && !hasSyncedRef.current) {
                    // Use a stable toast id to prevent duplicates
                    syncingToastRef.current = toast.loading("Syncing data, please wait...", { id: SYNC_TOAST_ID }) as unknown as string
                    hasSyncedRef.current = true
                }
            }, 50)
        },
        [setCurrentUser, setStatus, setUsers],
    )

    const handleUserLeft = useCallback(
        ({ user }: { user: User }) => {
            toast.success(`${user.username} left the room`)
            setUsers(users.filter((u: User) => u.username !== user.username))
            
            // Clear stored data if current user left
            if (user.username === localStorage.getItem('currentUsername')) {
                localStorage.removeItem('currentRoomId')
                localStorage.removeItem('currentUsername')
            }
        },
        [setUsers, users],
    )

    const handleRequestDrawing = useCallback(
        ({ socketId }: { socketId: SocketId }) => {
            socket.emit(SocketEvent.SYNC_DRAWING, { socketId, drawingData })
        },
        [drawingData, socket],
    )

    const handleDrawingSync = useCallback(
        ({ drawingData }: { drawingData: DrawingData }) => {
            setDrawingData(drawingData)
        },
        [setDrawingData],
    )

    const handleSyncingComplete = useCallback(() => {
        toast.dismiss(SYNC_TOAST_ID)
        syncingToastRef.current = null
        hasSyncedRef.current = true
        toast.success("Data sync completed!")
    }, [])

    const handleVideoCallStatus = useCallback(({ isActive, participants, startedBy }: any) => {
        if (isActive) {
            // Store video call state for reconnection
            localStorage.setItem('activeVideoCall', JSON.stringify({
                isActive: true,
                participants,
                startedBy,
                timestamp: Date.now()
            }))
        }
    }, [])

    const handleUserOnline = useCallback(({ username }: { socketId: string, username: string }) => {
        toast.success(`${username} is back online`)
        // Update user status in the users list
        setUsers(prevUsers => 
            prevUsers.map(user => 
                user.username === username 
                    ? { ...user, status: 'online' as any }
                    : user
            )
        )
    }, [setUsers])

    useEffect(() => {
        // Auto-reconnect to room once per connection
        const onConnect = () => {
            const savedRoomId = localStorage.getItem('currentRoomId')
            const savedUsername = localStorage.getItem('currentUsername')
            const suppressReconnect = sessionStorage.getItem('suppressReconnect') === 'true'
            if (!hasRequestedReconnectRef.current && savedRoomId && savedUsername && !suppressReconnect) {
                socket.emit("reconnect_attempt", { roomId: savedRoomId, username: savedUsername })
                hasRequestedReconnectRef.current = true
            }
        }

        if (socket.connected) onConnect()

        socket.on("connect_error", handleError)
        socket.on("connect_failed", handleError)
        socket.on("connect", onConnect)
        socket.on("disconnect", () => { 
            hasRequestedReconnectRef.current = false 
        })
        socket.on(SocketEvent.USERNAME_EXISTS, handleUsernameExist)
        socket.on(SocketEvent.JOIN_ACCEPTED, handleJoiningAccept)
        socket.on(SocketEvent.USER_DISCONNECTED, handleUserLeft)
        socket.on(SocketEvent.USER_ONLINE, handleUserOnline)
        socket.on(SocketEvent.REQUEST_DRAWING, handleRequestDrawing)
        socket.on(SocketEvent.SYNC_DRAWING, handleDrawingSync)
        socket.on("syncing-complete", handleSyncingComplete)
        socket.on("video-call-status", handleVideoCallStatus)

        return () => {
            socket.off("connect_error")
            socket.off("connect_failed")
            socket.off("connect", onConnect)
            socket.off("disconnect")
            socket.off(SocketEvent.USERNAME_EXISTS)
            socket.off(SocketEvent.JOIN_ACCEPTED)
            socket.off(SocketEvent.USER_DISCONNECTED)
            socket.off(SocketEvent.USER_ONLINE)
            socket.off(SocketEvent.REQUEST_DRAWING)
            socket.off(SocketEvent.SYNC_DRAWING)
            socket.off("syncing-complete")
            socket.off("video-call-status")
        }
    }, [
        handleDrawingSync,
        handleError,
        handleJoiningAccept,
        handleRequestDrawing,
        handleUserLeft,
        handleUserOnline,
        handleUsernameExist,
        handleSyncingComplete,
        handleVideoCallStatus,
        setUsers,
        socket,
    ])

    return (
        <SocketContext.Provider
            value={{
                socket,
            }}
        >
            {children}
        </SocketContext.Provider>
    )
}

export { SocketProvider }
export default SocketContext
