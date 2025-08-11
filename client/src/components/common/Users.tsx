import { useAppContext } from "@/context/AppContext";
import { RemoteUser, USER_CONNECTION_STATUS } from "@/types/user";
import Avatar from "react-avatar";
import { useVideoCall, VideoCallFrame } from "../../context/VideoCallContext";
import "./../../context/VideoCall.css";

function Users() {
    const { users } = useAppContext();
    const { startVideoCall, joinVideoCall, isVideoCallActive } = useVideoCall();

    return (
        <div className="flex h-screen w-full bg-gray-900 text-white">
            
            {/* Left Sidebar - Users */}
            <div className="w-64 border-r border-gray-700 flex flex-col">
                <h2 className="p-4 font-bold text-lg border-b border-gray-700">
                    Users
                </h2>

                <div className="flex-1 overflow-y-auto p-2 space-y-3">
                    {users.map((user) => (
                        <UserCard
                            key={user.socketId}
                            user={user}
                            startVideoCall={startVideoCall}
                            isVideoCallActive={isVideoCallActive}
                        />
                    ))}
                </div>
            </div>

            {/* Main Video Section */}
            <div className="flex-1 flex flex-col">
                
                {/* Top Bar */}
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    {isVideoCallActive ? (
                        <span className="bg-blue-500 text-white px-3 py-1 rounded">
                            📡 Video call in progress...
                        </span>
                    ) : (
                        <span className="bg-gray-500 px-3 py-1 rounded">
                            No active call
                        </span>
                    )}

                    {/* Group Call Controls */}
                    {!isVideoCallActive && (
                        <div className="flex gap-2">
                            <button
                                className="video-call-btn"
                                onClick={() => startVideoCall()}
                            >
                                📞 Start Group Call
                            </button>
                            <button
                                className="video-call-btn"
                                onClick={joinVideoCall}
                            >
                                ➕ Join Call
                            </button>
                        </div>
                    )}
                </div>

                {/* Video Area */}
                <div className="flex-1 flex items-center justify-center bg-black relative">
                    {isVideoCallActive ? (
                        <VideoCallFrame />
                    ) : (
                        <p className="text-gray-400">
                            Start or join a call to see video
                        </p>
                    )}

                    {/* Video Controls */}
                    {isVideoCallActive && (
                        <div className="absolute bottom-4 flex gap-4 bg-gray-800 bg-opacity-70 p-3 rounded-lg">
                            <button className="px-3 py-1 bg-red-500 rounded hover:bg-red-600">
                                Disable Video
                            </button>
                            <button className="px-3 py-1 bg-yellow-500 rounded hover:bg-yellow-600">
                                Mute
                            </button>
                            <button className="px-3 py-1 bg-green-500 rounded hover:bg-green-600">
                                Share Screen
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

type UserProps = {
    user: RemoteUser;
    startVideoCall: (targetSocketId?: string) => void;
    isVideoCallActive: boolean;
};

const UserCard = ({ user, startVideoCall, isVideoCallActive }: UserProps) => {
    const { username, status, socketId } = user;
    const isOnline = status === USER_CONNECTION_STATUS.ONLINE;

    return (
        <div
            className="flex items-center gap-3 bg-gray-800 p-3 rounded-lg hover:bg-gray-700 transition"
            title={`${username} - ${isOnline ? "online" : "offline"}`}
        >
            {/* Avatar with Status */}
            <div className="relative">
                <Avatar name={username} size="40" round={"50%"} />
                <span
                    className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-gray-800 ${
                        isOnline ? "bg-green-500" : "bg-gray-400"
                    }`}
                />
            </div>

            {/* Name */}
            <div className="flex-1">
                <p className="text-sm font-medium truncate">{username}</p>
            </div>

            {/* Call Button */}
            {isOnline && !isVideoCallActive && (
                <button
                    className="text-sm px-2 py-1 bg-blue-500 rounded hover:bg-blue-600"
                    onClick={() => startVideoCall(socketId)}
                >
                    🎥
                </button>
            )}
        </div>
    );
};

export default Users;
