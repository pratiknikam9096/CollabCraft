import { useAppContext } from "@/context/AppContext"
import { RemoteUser, USER_CONNECTION_STATUS } from "@/types/user"
import Avatar from "react-avatar"
import { useVideoCall } from "../../context/VideoCallContext";

function Users() {
    const { users } = useAppContext()
    const { startVideoCall, joinVideoCall, isVideoCallActive } = useVideoCall();

    return (
        <div className="flex min-h-[200px] flex-grow justify-center overflow-y-auto py-2">
            <div className="flex h-full w-full flex-wrap items-start gap-x-2 gap-y-6">
                {users.map((user) => {
                    return <User key={user.socketId} user={user} />
                })}
            </div>
            <div style={{ marginTop: 16 }}>
        {!isVideoCallActive ? (
          <>
            <button className="video-call-btn" onClick={startVideoCall}>
              Start Video Call
            </button>
            <button className="video-call-btn" onClick={joinVideoCall} style={{ marginLeft: 8 }}>
              Join Video Call
            </button>
          </>
        ) : (
          <span>Video call in progress</span>
        )}
      </div>
        </div>
    )
}

const User = ({ user }: { user: RemoteUser }) => {
    const { username, status } = user
    const title = `${username} - ${status === USER_CONNECTION_STATUS.ONLINE ? "online" : "offline"}`

    return (
        <div
            className="relative flex w-[100px] flex-col items-center gap-2"
            title={title}
        >
            <Avatar name={username} size="50" round={"12px"} title={title} />
            <p className="line-clamp-2 max-w-full text-ellipsis break-words">
                {username}
            </p>
            <div
                className={`absolute right-5 top-0 h-3 w-3 rounded-full ${
                    status === USER_CONNECTION_STATUS.ONLINE
                        ? "bg-green-500"
                        : "bg-danger"
                }`}
            ></div>
        </div>
    )
}

export default Users
