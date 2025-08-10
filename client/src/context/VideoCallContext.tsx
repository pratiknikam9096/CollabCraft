import React, {
  createContext, useContext, useCallback,
  useRef, useState, useEffect, ReactNode
} from "react";
import { Rnd } from "react-rnd";
import toast from "react-hot-toast";
import "./VideoCall.css"

type VideoParticipant = {
  socketId: string;
  username: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
};
type RTCMessage = {
  type: string;
  socketId: string;
  data: any;
};
type VideoCallContextType = {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isVideoCallActive: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  participants: VideoParticipant[];
  startVideoCall: (targetSocketId?: string) => void;
  endVideoCall: () => void;
  toggleVideo: () => void;
  toggleAudio: () => void;
  toggleScreenShare: () => void;
  joinVideoCall: () => void;
  leaveVideoCall: () => void;
};

// MOCK CONTEXTS — Replace these with your actual implementations
const SocketContext = React.createContext<{ socket: any }>({ socket: { emit: () => {}, on: () => {}, off: () => {}, id: "self" } });
const useSocket = () => useContext(SocketContext);

const AppContext = React.createContext<{ currentUser: { username: string } }>({ currentUser: { username: "Me" } });
const useAppContext = () => useContext(AppContext);

const VideoCallContext = createContext<VideoCallContextType | null>(null);

export const useVideoCall = (): VideoCallContextType => {
  const context = useContext(VideoCallContext);
  if (!context) throw new Error("useVideoCall must be used within provider");
  return context;
};

type Props = { children: ReactNode };

const VideoCallContextProvider = ({ children }: Props) => {
  const { socket } = useSocket();
  const { currentUser } = useAppContext();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<VideoParticipant[]>([]);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  };

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
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      socket.emit("video-call-signal", {
        type: "video-call-start", socketId: socket.id, data: { username: currentUser.username }
      });
      toast.success("Video call started!");
    } catch {
      toast.error("Failed to start video call.");
    }
  }, [socket, currentUser.username]);

  const endVideoCall = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    setRemoteStreams(new Map());
    setIsVideoCallActive(false);
    setIsScreenSharing(false);
    setParticipants([]);
    socket.emit("video-call-signal", { type: "video-call-end", socketId: socket.id, data: {} });
    toast.success("Video call ended");
  }, [localStream, socket]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        socket.emit("video-call-signal", {
          type: "user-media-state", socketId: socket.id,
          data: { isVideoEnabled: videoTrack.enabled, isAudioEnabled }
        });
      }
    }
  }, [localStream, socket, isAudioEnabled]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        socket.emit("video-call-signal", {
          type: "user-media-state", socketId: socket.id,
          data: { isVideoEnabled, isAudioEnabled: audioTrack.enabled }
        });
      }
    }
  }, [localStream, socket, isVideoEnabled]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const videoTrack = screenStream.getVideoTracks()[0];
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === "video");
          if (sender) sender.replaceTrack(videoTrack);
        });
        if (localStream) {
          const oldVideoTrack = localStream.getVideoTracks()[0];
          localStream.removeTrack(oldVideoTrack);
          localStream.addTrack(videoTrack);
        }
        setIsScreenSharing(true);
        toast.success("Screen sharing started");
        videoTrack.onended = async () => {
          const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          const newVideoTrack = cameraStream.getVideoTracks()[0];
          peerConnections.current.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === "video");
            if (sender) sender.replaceTrack(newVideoTrack);
          });
          if (localStream) {
            localStream.removeTrack(videoTrack);
            localStream.addTrack(newVideoTrack);
          }
          setIsScreenSharing(false);
          toast.success("Screen sharing stopped");
        };
      }
    } catch {
      toast.error("Failed to share screen");
    }
  }, [isScreenSharing, localStream]);

  const joinVideoCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setIsVideoCallActive(true);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      toast.success("Joined video call!");
    } catch {
      toast.error("Failed to join video call");
    }
  }, []);

  const leaveVideoCall = useCallback(() => {
    endVideoCall();
  }, [endVideoCall]);

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
        case "user-media-state":
          setParticipants(prev => prev.map(p =>
            p.socketId === socketId ?
              { ...p, isVideoEnabled: data.isVideoEnabled, isAudioEnabled: data.isAudioEnabled } : p
          ));
          break;
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
      isVideoEnabled, isAudioEnabled, isScreenSharing,
      participants, startVideoCall, endVideoCall, toggleVideo,
      toggleAudio, toggleScreenShare, joinVideoCall, leaveVideoCall
    }}>
      {children}
      <video ref={localVideoRef} autoPlay muted playsInline style={{ display: "none" }} />
    </VideoCallContext.Provider>
  );
};

export default VideoCallContextProvider;

// ------------------
// Resizable Video UI component (You can export this and use wherever needed)

export const VideoCallFrame = () => {
  const {
    localStream,
    remoteStreams,
    isVideoCallActive,
    startVideoCall,
    endVideoCall,
    joinVideoCall,
    leaveVideoCall,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing
  } = useVideoCall();

  const makeVideoSrc = (videoRef: HTMLVideoElement | null, stream: MediaStream) => {
    if (videoRef && stream) videoRef.srcObject = stream;
  };

  if (!isVideoCallActive) {
  return (
    <div style={{ textAlign: "center", marginTop: 50 }}>
      <button onClick={() => startVideoCall()} style={{ marginRight: 10 }}>
        Start Video Call
      </button>
      <button onClick={() => joinVideoCall()}>
        Join Video Call
      </button>
    </div>
  );
}

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 12, minHeight: 400,
      alignItems: "center", justifyContent: "center", padding: 20, position: "relative"
    }}>
      {/* Local Video */}
      {localStream && (
        <Rnd default={{ x: 40, y: 30, width: 320, height: 220 }} bounds="parent">
          <video
            ref={ref => makeVideoSrc(ref, localStream)}
            autoPlay muted
            playsInline
            style={{ width: "100%", height: "100%", borderRadius: 12, background: "black" }}
          />
          <div style={{ position: "absolute", top: 8, left: 8, zIndex: 10 }}>
            <button onClick={toggleVideo} style={{ marginRight: 6 }}>
              {isVideoEnabled ? "Disable Video" : "Enable Video"}
            </button>
            <button onClick={toggleAudio} style={{ marginRight: 6 }}>
              {isAudioEnabled ? "Mute" : "Unmute"}
            </button>
            <button onClick={toggleScreenShare}>
              {isScreenSharing ? "Stop Sharing" : "Share Screen"}
            </button>
          </div>
        </Rnd>
      )}

      {/* Remote Videos */}
      {[...remoteStreams.entries()].map(([socketId, stream]) => (
        <Rnd key={socketId} default={{ x: 50, y: 40, width: 320, height: 220 }} bounds="parent">
          <video
            ref={ref => makeVideoSrc(ref, stream)}
            autoPlay
            playsInline
            style={{ width: "100%", height: "100%", borderRadius: 12, background: "black" }}
          />
        </Rnd>
      ))}

      {/* Bottom Controls */}
      <div style={{
        position: "absolute",
        bottom: 18,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#222",
        padding: 8,
        borderRadius: 12,
        color: "white",
        zIndex: 20,
      }}>
        <button onClick={endVideoCall} style={{ marginRight: 10 }}>End Call</button>
        <button onClick={leaveVideoCall}>Leave Call</button>
      </div>
    </div>
  );
};
