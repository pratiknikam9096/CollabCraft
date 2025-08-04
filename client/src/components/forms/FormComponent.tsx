import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { SocketEvent } from "@/types/socket"
import { USER_STATUS } from "@/types/user"
import { ChangeEvent, FormEvent, useEffect, useRef } from "react"
import { toast } from "react-hot-toast"
import { useLocation, useNavigate } from "react-router-dom"
import { v4 as uuidv4 } from "uuid"
// import logo from "@/assets/logo.svg"

const FormComponent = () => {
    const location = useLocation()
    const { currentUser, setCurrentUser, status, setStatus } = useAppContext()
    const { socket } = useSocket()

    const usernameRef = useRef<HTMLInputElement | null>(null)
    const navigate = useNavigate()

    const createNewRoomId = () => {
        setCurrentUser({ ...currentUser, roomId: uuidv4() })
        toast.success("Created a new Room Id")
        usernameRef.current?.focus()
    }

    const handleInputChanges = (e: ChangeEvent<HTMLInputElement>) => {
        const name = e.target.name
        const value = e.target.value
        setCurrentUser({ ...currentUser, [name]: value })
    }

    const validateForm = () => {
        if (currentUser.username.trim().length === 0) {
            toast.error("Enter your username")
            return false
        } else if (currentUser.roomId.trim().length === 0) {
            toast.error("Enter a room id")
            return false
        } else if (currentUser.roomId.trim().length < 5) {
            toast.error("ROOM Id must be at least 5 characters long")
            return false
        } else if (currentUser.username.trim().length < 3) {
            toast.error("Username must be at least 3 characters long")
            return false
        }
        return true
    }

    const joinRoom = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (status === USER_STATUS.ATTEMPTING_JOIN) return
        if (!validateForm()) return
        toast.loading("Joining room...")
        setStatus(USER_STATUS.ATTEMPTING_JOIN)
        socket.emit(SocketEvent.JOIN_REQUEST, currentUser)
    }

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
            socket.connect()
            return
        }

        const isRedirect = sessionStorage.getItem("redirect") || false

        if (status === USER_STATUS.JOINED && !isRedirect) {
            const username = currentUser.username
            sessionStorage.setItem("redirect", "true")
            navigate(`/editor/${currentUser.roomId}`, {
                state: {
                    username,
                },
            })
        } else if (status === USER_STATUS.JOINED && isRedirect) {
            sessionStorage.removeItem("redirect")
            setStatus(USER_STATUS.DISCONNECTED)
            socket.disconnect()
            socket.connect()
        }
    }, [currentUser, location.state?.redirect, navigate, setStatus, socket, status])

    return (
        <div className="w-full">
            
            <form onSubmit={joinRoom} className="flex w-full flex-col gap-6">
                <input
                    type="text"
                    name="roomId"
                    placeholder="Room Id"
                    className="w-full rounded-lg border border-gray-600 bg-darkHover/80 px-4 py-4 text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-200 focus:border-primary focus:bg-darkHover focus:outline-none focus:ring-2 focus:ring-primary/20"
                    onChange={handleInputChanges}
                    value={currentUser.roomId}
                />
                <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    className="w-full rounded-lg border border-gray-600 bg-darkHover/80 px-4 py-4 text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-200 focus:border-primary focus:bg-darkHover focus:outline-none focus:ring-2 focus:ring-primary/20"
                    onChange={handleInputChanges}
                    value={currentUser.username}
                    ref={usernameRef}
                />
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
        </div>
    )
}

export default FormComponent
