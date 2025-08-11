import  { createContext, useContext, useCallback, useRef, useState, useEffect, ReactNode } from "react";
import toast from "react-hot-toast";
import { useSocket } from "./SocketContext";

// type VideoParticipant = {
//   socketId: string;
//   username: string;
//   isVideoEnabled: boolean;
//   isAudioEnabled: boolean;
// };
type RTCMessage = {
  type: string;
  socketId: string;
  data: any;
};
type VideoCallContextType = {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isVideoCallActive: boolean;
  startVideoCall: (targetSocketId?: string) => void;
  joinVideoCall: () => void;
  endVideoCall: () => void;
};

const VideoCallContext = createContext<VideoCallContextType | null>(null);

export const useVideoCall = (): VideoCallContextType => {
  const context = useContext(VideoCallContext);
  if (!context) throw new Error("useVideoCall must be used within provider");
  return context;
};

type Props = { children: ReactNode };

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

const VideoCallContextProvider = ({ children }: Props) => {
  const { socket } = useSocket(); // ✅ Use your socket context
  const currentUser = { username: "Me" }; // Replace with your AppContext if needed

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

  const createPeerConnection = useCallback((socketId: string) => {
    const peerConnection = new RTCPeerConnection(rtcConfig);
    if (localStream) {
      localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => new Map(prev.set(socketId, remoteStream)));
    };
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("video-call-signal", {
          type: "ice-candidate", socketId, data: event.candidate
        });
      }
    };
    peerConnections.current.set(socketId, peerConnection);
    return peerConnection;
  }, [localStream, socket]);

  const startVideoCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setIsVideoCallActive(true);
      socket.emit("video-call-signal", {
        type: "video-call-start", socketId: socket.id, data: { username: currentUser.username }
      });
      toast.success("Video call started!");
    } catch {
      toast.error("Failed to start video call.");
    }
  }, [socket, currentUser.username]);

  const joinVideoCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setIsVideoCallActive(true);
      toast.success("Joined video call!");
    } catch {
      toast.error("Failed to join video call");
    }
  }, []);

  const endVideoCall = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    setRemoteStreams(new Map());
    setIsVideoCallActive(false);
    socket.emit("video-call-signal", { type: "video-call-end", socketId: socket.id, data: {} });
    toast.success("Video call ended");
  }, [localStream, socket]);

  useEffect(() => {
    const handleVideoCallSignal = async ({ type, socketId, data }: RTCMessage) => {
      switch (type) {
        case "video-call-start":
          toast.success(`${data.username} started a video call`);
          break;
        case "video-call-end": {
          const pc = peerConnections.current.get(socketId);
          if (pc) {
            pc.close();
            peerConnections.current.delete(socketId);
          }
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.delete(socketId);
            return newMap;
          });
          break;
        }
        case "offer": {
          const peerConnection = createPeerConnection(socketId);
          await peerConnection.setRemoteDescription(data);
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socket.emit("video-call-signal", { type: "answer", socketId, data: answer });
          break;
        }
        case "answer": {
          const pc2 = peerConnections.current.get(socketId);
          if (pc2) await pc2.setRemoteDescription(data);
          break;
        }
        case "ice-candidate": {
          const pc3 = peerConnections.current.get(socketId);
          if (pc3) await pc3.addIceCandidate(data);
          break;
        }
      }
    };

    socket.on("video-call-signal", handleVideoCallSignal);
    return () => {
      socket.off("video-call-signal", handleVideoCallSignal);
    };
  }, [socket, createPeerConnection]);

  useEffect(() => {
    return () => {
      if (localStream) localStream.getTracks().forEach(track => track.stop());
      peerConnections.current.forEach(pc => pc.close());
    };
  }, [localStream]);

  return (
    <VideoCallContext.Provider value={{
      localStream, remoteStreams, isVideoCallActive,
      startVideoCall, joinVideoCall, endVideoCall
    }}>
      {children}
    </VideoCallContext.Provider>
  );
};

export default VideoCallContextProvider;

// Video grid for users
export const VideoCallFrame = () => {
  const { localStream, remoteStreams, isVideoCallActive } = useVideoCall();

  // Combine local and remote streams for display
  const videoParticipants = [
    { socketId: "local", username: "You", stream: localStream },
    ...[...remoteStreams.entries()].map(([socketId, stream]) => ({
      socketId,
      username: socketId, // You can map socketId to username if available
      stream
    }))
  ];

  if (!isVideoCallActive) return null;

  return (
    <div className="video-call-grid">
      {videoParticipants.map(({ socketId, username, stream }) => (
        <div key={socketId} className="video-call-user-card">
          <div className="video-call-video-container">
            {stream ? (
              <video
                ref={ref => {
                  if (ref && stream) ref.srcObject = stream;
                }}
                autoPlay
                playsInline
                muted={socketId === "local"}
                className="video-call-video"
              />
            ) : (
              <div className="video-call-avatar-fallback">
                {username}
              </div>
            )}
          </div>
          <div className="video-call-username">{username}</div>
        </div>
      ))}
    </div>
  );
};