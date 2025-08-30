import { useAppContext } from "@/context/AppContext";
import { RemoteUser, USER_CONNECTION_STATUS } from "@/types/user";
import Avatar from "react-avatar";
import { useVideoCall, VideoCallFrame } from "../../context/VideoCallContext";
import "./../../context/VideoCall.css";

function Users() {
    const { users } = useAppContext();
    const { startTeamVideoCall, joinTeamVideoCall, isVideoCallActive } = useVideoCall();

    return (
        <div className="flex flex-col gap-4 p-4 w-full">
            {/* Group Call Controls */}
            <div className="flex justify-center gap-4">
                {!isVideoCallActive ? (
                    <>
                        <button type="button" className="video-call-btn" onClick={() => startTeamVideoCall()}>
                            📞 Start Group Video Call
                        </button>
                        <button type="button" className="video-call-btn" onClick={joinTeamVideoCall}>
                            ➕ Join Video Call
                        </button>
                    </>
                ) : (
                    <span className="text-green-600 font-semibold">
                        📡 Video call in progress...
                    </span>
                )}
            </div>

            {/* Video Grid */}
            {isVideoCallActive && (
                <div className="mt-6">
                    <VideoCallFrame />
                </div>
            )}

            {/* User List - one user per row */}
            <div className="flex flex-col divide-y">
                {users.map((user) => (
                    <div key={user.socketId} className="py-3">
                        <UserCard
                            user={user}
                            startVideoCall={startTeamVideoCall}
                            isVideoCallActive={isVideoCallActive}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

type UserProps = {
    user: RemoteUser;
    startVideoCall: () => void;
    isVideoCallActive: boolean;
};

const UserCard = ({ user, startVideoCall, isVideoCallActive }: UserProps) => {
    const { username, status } = user;
    const isOnline = status === USER_CONNECTION_STATUS.ONLINE;

    return (
        <div
            className="flex items-center w-full gap-4 bg-white shadow-sm rounded-xl p-3 hover:shadow-md transition"
            title={`${username} - ${isOnline ? "online" : "offline"}`}
        >
            {/* Avatar */}
            <div className="flex-shrink-0">
                <Avatar name={username} size="48" round="50%" />
            </div>

            {/* Username & status */}
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 font-medium truncate" title={username}>
                    {username}
                </p>
                <div className="text-xs text-gray-500 mt-1">
                    {isOnline ? "Online" : "Offline"}
                </div>
            </div>

            {/* Call Button - only show when no group call is active */}
            {!isVideoCallActive && isOnline && (
                <div className="flex-shrink-0">
                    <button
                        type="button"
                        className="video-call-btn text-sm py-1 px-3"
                        onClick={() => startVideoCall()}
                    >
                        🎥 Call
                    </button>
                </div>
            )}
        </div>
    );
};

export default Users;