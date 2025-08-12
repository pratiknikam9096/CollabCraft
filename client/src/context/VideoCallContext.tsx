import  { createContext, useContext, useCallback, useRef, useState, useEffect, ReactNode, useMemo } from "react";
import toast from "react-hot-toast";
import { useSocket } from "./SocketContext";
import { useAppContext } from "./AppContext";

type VideoParticipant = {
  socketId: string;
  username: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  stream: MediaStream | null;
  isLocal: boolean;
};

type RTCMessage = {
  type: string;
  socketId: string;
  data: any;
};

type VideoCallContextType = {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  participants: VideoParticipant[];
  isVideoCallActive: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  startTeamVideoCall: () => void;
  joinTeamVideoCall: () => void;
  endVideoCall: () => void;
  toggleVideo: () => void;
  toggleAudio: () => void;
  toggleScreenShare: () => void;
  leaveVideoCall: () => void;
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
  const { socket } = useSocket();
  const { users, currentUser } = useAppContext();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  // Get all team members in the current room
  const getTeamMembers = useCallback(() => {
    return users.filter(user => user.roomId === currentUser.roomId);
  }, [users, currentUser.roomId]);

  const createPeerConnection = useCallback((socketId: string) => {
    const peerConnection = new RTCPeerConnection(rtcConfig);
    
    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => new Map(prev.set(socketId, remoteStream)));
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("video-call-signal", {
          type: "ice-candidate", 
          socketId, 
          data: event.candidate
        });
      }
    };

    peerConnections.current.set(socketId, peerConnection);
    return peerConnection;
  }, [socket]);

  const startTeamVideoCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsVideoCallActive(true);
      
      // Notify all team members about the video call
      socket.emit("video-call-signal", {
        type: "team-video-call-start", 
        socketId: socket.id, 
        data: { 
          username: currentUser.username,
          roomId: currentUser.roomId,
          participants: getTeamMembers().map(u => u.socketId)
        }
      });
      
      toast.success("Team video call started!");
    } catch (error) {
      console.error("Failed to start video call:", error);
      toast.error("Failed to start video call. Please check camera and microphone permissions.");
    }
  }, [socket, currentUser.username, currentUser.roomId, getTeamMembers]);

  const joinTeamVideoCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsVideoCallActive(true);
      
      // Notify others that you've joined
      socket.emit("video-call-signal", {
        type: "team-video-call-join", 
        socketId: socket.id, 
        data: { 
          username: currentUser.username,
          roomId: currentUser.roomId
        }
      });
      
      toast.success("Joined team video call!");
    } catch (error) {
      console.error("Failed to join video call:", error);
      toast.error("Failed to join video call. Please check camera and microphone permissions.");
    }
  }, [socket, currentUser.username, currentUser.roomId]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        
        // Update all peer connections
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
      }
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        
        // Update all peer connections
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
          if (sender) {
            sender.replaceTrack(audioTrack);
          }
        });
      }
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true, 
          audio: true 
        });
        
        setScreenShareStream(screenStream);
        setIsScreenSharing(true);
        
        // Replace video track with screen share track
        const videoTrack = screenStream.getVideoTracks()[0];
        if (videoTrack && localStreamRef.current) {
          const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
          if (oldVideoTrack) {
            localStreamRef.current.removeTrack(oldVideoTrack);
          }
          localStreamRef.current.addTrack(videoTrack);
          
          // Update all peer connections
          peerConnections.current.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(videoTrack);
            }
          });
        }
        
        toast.success("Screen sharing started");
      } else {
        // Stop screen sharing and restore camera
        if (screenShareStream) {
          screenShareStream.getTracks().forEach(track => track.stop());
          setScreenShareStream(null);
        }
        
        // Restore camera video
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = cameraStream.getVideoTracks()[0];
        
        if (localStreamRef.current) {
          const oldVideoTrack = localStreamRef.current.getVideoTracks().find(t => t.kind === 'video');
          if (oldVideoTrack) {
            localStreamRef.current.removeTrack(oldVideoTrack);
          }
          localStreamRef.current.addTrack(videoTrack);
          
          // Update all peer connections
          peerConnections.current.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(videoTrack);
            }
          });
        }
        
        setIsScreenSharing(false);
        toast.success("Screen sharing stopped");
      }
    } catch (error) {
      console.error("Screen share error:", error);
      toast.error("Failed to toggle screen sharing");
    }
  }, [isScreenSharing, screenShareStream]);

  const leaveVideoCall = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      localStreamRef.current = null;
    }
    
    if (screenShareStream) {
      screenShareStream.getTracks().forEach(track => track.stop());
      setScreenShareStream(null);
    }
    
    setIsVideoCallActive(false);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    setIsScreenSharing(false);
    
    socket.emit("video-call-signal", { 
      type: "team-video-call-leave", 
      socketId: socket.id, 
      data: { username: currentUser.username } 
    });
    
    toast.success("Left video call");
  }, [localStream, screenShareStream, socket, currentUser.username]);

  const endVideoCall = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      localStreamRef.current = null;
    }
    
    if (screenShareStream) {
      screenShareStream.getTracks().forEach(track => track.stop());
      setScreenShareStream(null);
    }
    
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    setRemoteStreams(new Map());
    setIsVideoCallActive(false);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    setIsScreenSharing(false);
    
    socket.emit("video-call-signal", { 
      type: "team-video-call-end", 
      socketId: socket.id, 
      data: { username: currentUser.username } 
    });
    
    toast.success("Video call ended");
  }, [localStream, screenShareStream, socket, currentUser.username]);

  // Compute participants list
  const participants = useMemo(() => {
    const teamMembers = getTeamMembers();
    const participantsList: VideoParticipant[] = [];
    
    // Add local user
    participantsList.push({
      socketId: "local",
      username: currentUser.username,
      isVideoEnabled,
      isAudioEnabled,
      isScreenSharing,
      stream: localStream,
      isLocal: true
    });
    
    // Add remote participants
    teamMembers.forEach(member => {
      if (member.socketId !== socket.id) {
        const stream = remoteStreams.get(member.socketId);
        participantsList.push({
          socketId: member.socketId,
          username: member.username,
          isVideoEnabled: stream ? stream.getVideoTracks().some(t => t.enabled) : false,
          isAudioEnabled: stream ? stream.getAudioTracks().some(t => t.enabled) : false,
          isScreenSharing: false, // Remote screen sharing not implemented yet
          stream: stream || null,
          isLocal: false
        });
      }
    });
    
    return participantsList;
  }, [getTeamMembers, currentUser.username, socket.id, isVideoEnabled, isAudioEnabled, isScreenSharing, localStream, remoteStreams]);

  useEffect(() => {
    const handleVideoCallSignal = async ({ type, socketId, data }: RTCMessage) => {
      switch (type) {
        case "team-video-call-start":
          toast.success(`${data.username} started a team video call`);
          break;
          
        case "team-video-call-join":
          toast.success(`${data.username} joined the video call`);
          break;
          
        case "team-video-call-leave":
          toast.success(`${data.username} left the video call`);
          break;
          
        case "team-video-call-end":
          toast.success(`${data.username} ended the video call`);
          break;
          
        case "offer": {
          const peerConnection = createPeerConnection(socketId);
          await peerConnection.setRemoteDescription(data);
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socket.emit("video-call-signal", { type: "answer", socketId, data: answer });
          break;
        }
        
        case "answer": {
          const pc = peerConnections.current.get(socketId);
          if (pc) await pc.setRemoteDescription(data);
          break;
        }
        
        case "ice-candidate": {
          const pc = peerConnections.current.get(socketId);
          if (pc) await pc.addIceCandidate(data);
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
      if (screenShareStream) screenShareStream.getTracks().forEach(track => track.stop());
      peerConnections.current.forEach(pc => pc.close());
    };
  }, [localStream, screenShareStream]);

  return (
    <VideoCallContext.Provider value={{
      localStream,
      remoteStreams,
      participants,
      isVideoCallActive,
      isVideoEnabled,
      isAudioEnabled,
      isScreenSharing,
      startTeamVideoCall,
      joinTeamVideoCall,
      endVideoCall,
      toggleVideo,
      toggleAudio,
      toggleScreenShare,
      leaveVideoCall
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