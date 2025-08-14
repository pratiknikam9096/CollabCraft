import {
    ACTIVITY_STATE,
    AppContext as AppContextType,
    DrawingData,
} from "@/types/app"
import { RemoteUser, USER_STATUS, User } from "@/types/user"
import { ReactNode, createContext, useContext, useState, useEffect } from "react"

const AppContext = createContext<AppContextType | null>(null)

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext)
    if (context === null) {
        throw new Error(
            "useAppContext must be used within a AppContextProvider",
        )
    }
    return context
}

function AppContextProvider({ children }: { children: ReactNode }) {
    // Load initial state from localStorage
    const getInitialUser = (): User => {
        try {
            const saved = localStorage.getItem("collabcraft_user")
            if (saved) {
                const parsed = JSON.parse(saved)
                if (parsed.username && parsed.roomId) {
                    return parsed
                }
            }
        } catch (error) {
            console.warn("Failed to load user from localStorage:", error)
        }
        return { username: "", roomId: "" }
    }

    const getInitialStatus = (): USER_STATUS => {
        try {
            const saved = localStorage.getItem("collabcraft_status")
            if (saved) {
                const parsed = JSON.parse(saved)
                if (parsed === USER_STATUS.JOINED) {
                    return USER_STATUS.DISCONNECTED // Reset to disconnected on reload
                }
            }
        } catch (error) {
            console.warn("Failed to load status from localStorage:", error)
        }
        return USER_STATUS.INITIAL
    }

    const [users, setUsers] = useState<RemoteUser[]>([])
    const [status, setStatus] = useState<USER_STATUS>(getInitialStatus)
    const [currentUser, setCurrentUser] = useState<User>(getInitialUser)
    const [activityState, setActivityState] = useState<ACTIVITY_STATE>(
        ACTIVITY_STATE.CODING,
    )
    const [drawingData, setDrawingData] = useState<DrawingData>(null)

    // Persist user state to localStorage
    useEffect(() => {
        if (currentUser.username && currentUser.roomId) {
            localStorage.setItem("collabcraft_user", JSON.stringify(currentUser))
        } else {
            localStorage.removeItem("collabcraft_user")
        }
    }, [currentUser])

    // Persist status to localStorage
    useEffect(() => {
        if (status !== USER_STATUS.INITIAL) {
            localStorage.setItem("collabcraft_status", JSON.stringify(status))
        } else {
            localStorage.removeItem("collabcraft_status")
        }
    }, [status])

    // Clear localStorage when user leaves
    const clearUserData = () => {
        localStorage.removeItem("collabcraft_user")
        localStorage.removeItem("collabcraft_status")
        setCurrentUser({ username: "", roomId: "" })
        setStatus(USER_STATUS.INITIAL)
        setUsers([])
    }

    return (
        <AppContext.Provider
            value={{
                users,
                setUsers,
                currentUser,
                setCurrentUser,
                status,
                setStatus,
                activityState,
                setActivityState,
                drawingData,
                setDrawingData,
                clearUserData,
            }}
        >
            {children}
        </AppContext.Provider>
    )
}

export { AppContextProvider }
export default AppContext
