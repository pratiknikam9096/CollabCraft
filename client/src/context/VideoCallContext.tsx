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
  isSpeaking: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
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
  muteParticipant: (socketId: string) => void;
  spotlightParticipant: (socketId: string) => void;
  getParticipantStats: (socketId: string) => any;
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
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" }
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
  const [spotlightedParticipant, setSpotlightedParticipant] = useState<string | null>(null);
  
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const connectionStats = useRef<Map<string, any>>(new Map());
  const voiceActivityDetectors = useRef<Map<string, { analyser: AnalyserNode; dataArray: Uint8Array; interval: NodeJS.Timeout }>>(new Map());

  // Voice Activity Detection
  const setupVoiceActivityDetection = useCallback((stream: MediaStream, socketId: string) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      source.connect(analyser);
      
      const detectVoice = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        const isSpeaking = average > 30; // Threshold for voice detection
        
        // Update connection stats with voice activity
        connectionStats.current.set(socketId, {
          ...connectionStats.current.get(socketId),
          isSpeaking,
          voiceLevel: average
        });
      };
      
      const interval = setInterval(detectVoice, 100); // Check every 100ms
      
      voiceActivityDetectors.current.set(socketId, {
        analyser,
        dataArray,
        interval
      });
      
    } catch (error) {
      console.error('Failed to setup voice activity detection:', error);
    }
  }, []);

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

    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for ${socketId}:`, peerConnection.iceConnectionState);
      
      // Update connection quality based on ICE state
      let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
      switch (peerConnection.iceConnectionState) {
        case 'connected':
        case 'completed':
          quality = 'excellent';
          break;
        case 'checking':
          quality = 'good';
          break;
        case 'disconnected':
          quality = 'fair';
          break;
        case 'failed':
        case 'closed':
          quality = 'poor';
          break;
      }
      
      connectionStats.current.set(socketId, { 
        ...connectionStats.current.get(socketId),
        quality,
        iceState: peerConnection.iceConnectionState
      });
    };

    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state for ${socketId}:`, peerConnection.connectionState);
      
      // Monitor connection quality
      if (peerConnection.connectionState === 'connected') {
        // Start monitoring connection stats
        const monitorStats = async () => {
          try {
            const stats = await peerConnection.getStats();
            let totalBitrate = 0;
            let totalPackets = 0;
            
            stats.forEach(report => {
              if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
                totalBitrate += report.bytesReceived || 0;
                totalPackets += report.packetsReceived || 0;
              }
            });
            
            connectionStats.current.set(socketId, {
              ...connectionStats.current.get(socketId),
              bitrate: totalBitrate,
              packets: totalPackets,
              timestamp: Date.now()
            });
          } catch (error) {
            console.error('Error getting connection stats:', error);
          }
        };
        
        // Monitor every 2 seconds
        const interval = setInterval(monitorStats, 2000);
        
        // Store interval for cleanup
        connectionStats.current.set(socketId, {
          ...connectionStats.current.get(socketId),
          monitorInterval: interval
        });
      }
    };

    peerConnections.current.set(socketId, peerConnection);
    return peerConnection;
  }, [socket]);

  const startTeamVideoCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }, 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsVideoCallActive(true);
      
      // Setup voice activity detection for local stream
      setupVoiceActivityDetection(stream, 'local');
      
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
  }, [socket, currentUser.username, currentUser.roomId, getTeamMembers, setupVoiceActivityDetection]);

  const joinTeamVideoCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }, 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsVideoCallActive(true);
      
      // Setup voice activity detection for local stream
      setupVoiceActivityDetection(stream, 'local');
      
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
  }, [socket, currentUser.username, currentUser.roomId, setupVoiceActivityDetection]);

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
        
        // Show feedback
        toast.success(audioTrack.enabled ? "Microphone enabled" : "Microphone muted");
      }
    }
  }, []);

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
        
        // Show feedback
        toast.success(videoTrack.enabled ? "Camera enabled" : "Camera disabled");
      }
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: { 
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          }, 
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
        const cameraStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          } 
        });
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

  const muteParticipant = useCallback((socketId: string) => {
    // This would be implemented for admin controls
    toast.success(`Mute functionality for ${socketId} coming soon`);
  }, []);

  const spotlightParticipant = useCallback((socketId: string) => {
    setSpotlightedParticipant(spotlightedParticipant === socketId ? null : socketId);
  }, [spotlightedParticipant]);

  const getParticipantStats = useCallback((socketId: string) => {
    return connectionStats.current.get(socketId) || null;
  }, []);

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
    
    // Cleanup voice activity detection
    const localDetector = voiceActivityDetectors.current.get('local');
    if (localDetector) {
      clearInterval(localDetector.interval);
      voiceActivityDetectors.current.delete('local');
    }
    
    setIsVideoCallActive(false);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    setIsScreenSharing(false);
    setSpotlightedParticipant(null);
    
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
    
    // Cleanup all peer connections
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    
    // Cleanup all voice activity detectors
    voiceActivityDetectors.current.forEach(detector => {
      clearInterval(detector.interval);
    });
    voiceActivityDetectors.current.clear();
    
    // Cleanup all connection stats intervals
    connectionStats.current.forEach(stats => {
      if (stats.monitorInterval) {
        clearInterval(stats.monitorInterval);
      }
    });
    connectionStats.current.clear();
    
    setRemoteStreams(new Map());
    setIsVideoCallActive(false);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    setIsScreenSharing(false);
    setSpotlightedParticipant(null);
    
    socket.emit("video-call-signal", { 
      type: "team-video-call-end", 
      socketId: socket.id, 
      data: { username: currentUser.username } 
    });
    
    toast.success("Video call ended");
  }, [localStream, screenShareStream, socket, currentUser.username]);

  // Compute participants list with enhanced information
  const participants = useMemo(() => {
    const teamMembers = getTeamMembers();
    const participantsList: VideoParticipant[] = [];
    
    // Add local user
    const localStats = connectionStats.current.get('local');
    participantsList.push({
      socketId: "local",
      username: currentUser.username,
      isVideoEnabled,
      isAudioEnabled,
      isScreenSharing,
      stream: localStream,
      isLocal: true,
      isSpeaking: localStats?.isSpeaking || false,
      connectionQuality: localStats?.quality || 'excellent'
    });
    
    // Add remote participants
    teamMembers.forEach(member => {
      if (member.socketId !== socket.id) {
        const stream = remoteStreams.get(member.socketId);
        const remoteStats = connectionStats.current.get(member.socketId);
        
        participantsList.push({
          socketId: member.socketId,
          username: member.username,
          isVideoEnabled: stream ? stream.getVideoTracks().some(t => t.enabled) : false,
          isAudioEnabled: stream ? stream.getAudioTracks().some(t => t.enabled) : false,
          isScreenSharing: false, // Remote screen sharing not implemented yet
          stream: stream || null,
          isLocal: false,
          isSpeaking: remoteStats?.isSpeaking || false,
          connectionQuality: remoteStats?.quality || 'good'
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
          // If we're not the one who started the call, create peer connection and send offer
          if (socketId !== socket.id && localStreamRef.current) {
            const peerConnection = createPeerConnection(socketId);
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit("video-call-signal", { type: "offer", socketId, data: offer });
          }
          break;
          
        case "team-video-call-join":
          toast.success(`${data.username} joined the video call`);
          // If we're not the one who joined, create peer connection and send offer
          if (socketId !== socket.id && localStreamRef.current) {
            const peerConnection = createPeerConnection(socketId);
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit("video-call-signal", { type: "offer", socketId, data: offer });
          }
          break;
          
        case "team-video-call-leave":
          toast.success(`${data.username} left the video call`);
          // Clean up peer connection
          const pc = peerConnections.current.get(socketId);
          if (pc) {
            pc.close();
            peerConnections.current.delete(socketId);
            setRemoteStreams(prev => {
              const newMap = new Map(prev);
              newMap.delete(socketId);
              return newMap;
            });
          }
          break;
          
        case "team-video-call-end":
          toast.success(`${data.username} ended the video call`);
          // Clean up all connections
          peerConnections.current.forEach(pc => pc.close());
          peerConnections.current.clear();
          setRemoteStreams(new Map());
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
      leaveVideoCall,
      muteParticipant,
      spotlightParticipant,
      getParticipantStats
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