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
                        <button className="video-call-btn" onClick={() => startTeamVideoCall()}>
                            📞 Start Group Video Call
                        </button>
                        <button className="video-call-btn" onClick={joinTeamVideoCall}>
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

            {/* User Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {users.map((user) => (
                    <UserCard
                        key={user.socketId}
                        user={user}
                        startVideoCall={startTeamVideoCall}
                        isVideoCallActive={isVideoCallActive}
                    />
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
            className="flex flex-col items-center bg-white shadow-md rounded-xl p-4 relative hover:shadow-lg transition"
            title={`${username} - ${isOnline ? "online" : "offline"}`}
        >
            {/* Avatar */}
            <div className="relative">
                <Avatar name={username} size="60" round={"50%"} />
                <span
                    className={`absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-white ${
                        isOnline ? "bg-green-500" : "bg-gray-400"
                    }`}
                />
            </div>

            {/* Username */}
            <p className="mt-2 text-sm font-medium text-center truncate w-full">
                {username}
            </p>

            {/* Call Button */}
            {isOnline && !isVideoCallActive && (
                <button
                    className="video-call-btn mt-3 w-full text-sm"
                    onClick={() => startVideoCall()}
                >
                    🎥 Call
                </button>
            )}
        </div>
    );
};

export default Users;