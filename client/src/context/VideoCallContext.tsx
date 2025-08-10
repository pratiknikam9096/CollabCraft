import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react"
import { VideoCallContext as VideoCallContextType, VideoParticipant, RTCMessage } from "@/types/video"
import { SocketEvent } from "@/types/socket"
import { useSocket } from "./SocketContext"
import { useAppContext } from "./AppContext"
import { SocketEvent } from "@/types/socket"
import toast from "react-hot-toast"

const VideoCallContext = createContext<VideoCallContextType | null>(null)

export const useVideoCall = (): VideoCallContextType => {
    const context = useContext(VideoCallContext)
    if (!context) {
        throw new Error("useVideoCall must be used within a VideoCallContextProvider")
    }
    return context
}

const VideoCallContextProvider = ({ children }: { children: ReactNode }) => {
    const { socket } = useSocket()
    const { currentUser } = useAppContext()
    
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
    const [isVideoCallActive, setIsVideoCallActive] = useState(false)
    const [isVideoEnabled, setIsVideoEnabled] = useState(true)
    const [isAudioEnabled, setIsAudioEnabled] = useState(true)
    const [isScreenSharing, setIsScreenSharing] = useState(false)
    const [participants, setParticipants] = useState<VideoParticipant[]>([])
    
    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
    const localVideoRef = useRef<HTMLVideoElement>(null)

    // WebRTC configuration
    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    }

    // Initialize peer connection for a user
    const createPeerConnection = useCallback((socketId: string) => {
        const peerConnection = new RTCPeerConnection(rtcConfig)
        
        // Add local stream tracks
        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream)
            })
        }

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            const [remoteStream] = event.streams
            setRemoteStreams(prev => new Map(prev.set(socketId, remoteStream)))
        }

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('video-call-signal', {
                    type: 'ice-candidate',
                    socketId,
                    data: event.candidate
                })
            }
        }

        peerConnections.current.set(socketId, peerConnection)
        return peerConnection
    }, [localStream, socket])

    // Start video call
    const startVideoCall = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            })
            
            setLocalStream(stream)
            setIsVideoCallActive(true)
            
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream
            }

            // Notify other users about video call start
            socket.emit('video-call-signal', {
                type: 'video-call-start',
                socketId: socket.id,
                data: { username: currentUser.username }
            })

            toast.success("Video call started!")
        } catch (error) {
            console.error("Error starting video call:", error)
            toast.error("Failed to start video call. Please check camera/microphone permissions.")
        }
    }, [socket, currentUser.username])

    // End video call
    const endVideoCall = useCallback(() => {
        // Stop local stream
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop())
            setLocalStream(null)
        }

        // Close all peer connections
        peerConnections.current.forEach(pc => pc.close())
        peerConnections.current.clear()

        // Clear remote streams
        setRemoteStreams(new Map())
        setIsVideoCallActive(false)
        setIsScreenSharing(false)
        setParticipants([])

        // Notify other users
        socket.emit('video-call-signal', {
            type: 'video-call-end',
            socketId: socket.id,
            data: {}
        })

        toast.success("Video call ended")
    }, [localStream, socket])

    // Toggle video
    const toggleVideo = useCallback(() => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0]
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled
                setIsVideoEnabled(videoTrack.enabled)
                
                // Notify other users about video state change
                socket.emit('video-call-signal', {
                    type: 'user-media-state',
                    socketId: socket.id,
                    data: { isVideoEnabled: videoTrack.enabled, isAudioEnabled }
                })
            }
        }
    }, [localStream, socket, isAudioEnabled])

    // Toggle audio
    const toggleAudio = useCallback(() => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0]
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled
                setIsAudioEnabled(audioTrack.enabled)
                
                // Notify other users about audio state change
                socket.emit('video-call-signal', {
                    type: 'user-media-state',
                    socketId: socket.id,
                    data: { isVideoEnabled, isAudioEnabled: audioTrack.enabled }
                })
            }
        }
    }, [localStream, socket, isVideoEnabled])

    // Toggle screen share
    const toggleScreenShare = useCallback(async () => {
        try {
            if (!isScreenSharing) {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true
                })
                
                // Replace video track in all peer connections
                const videoTrack = screenStream.getVideoTracks()[0]
                peerConnections.current.forEach(pc => {
                    const sender = pc.getSenders().find(s => 
                        s.track && s.track.kind === 'video'
                    )
                    if (sender) {
                        sender.replaceTrack(videoTrack)
                    }
                })

                // Update local stream
                if (localStream) {
                    const oldVideoTrack = localStream.getVideoTracks()[0]
                    localStream.removeTrack(oldVideoTrack)
                    localStream.addTrack(videoTrack)
                }

                setIsScreenSharing(true)
                toast.success("Screen sharing started")

                // Handle screen share end
                videoTrack.onended = async () => {
                    const cameraStream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: false
                    })
                    const newVideoTrack = cameraStream.getVideoTracks()[0]
                    
                    peerConnections.current.forEach(pc => {
                        const sender = pc.getSenders().find(s => 
                            s.track && s.track.kind === 'video'
                        )
                        if (sender) {
                            sender.replaceTrack(newVideoTrack)
                        }
                    })

                    if (localStream) {
                        localStream.removeTrack(videoTrack)
                        localStream.addTrack(newVideoTrack)
                    }

                    setIsScreenSharing(false)
                    toast.success("Screen sharing stopped")
                }
            }
        } catch (error) {
            console.error("Error toggling screen share:", error)
            toast.error("Failed to share screen")
        }
    }, [isScreenSharing, localStream])

    // Join existing video call
    const joinVideoCall = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            })
            
            setLocalStream(stream)
            setIsVideoCallActive(true)
            
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream
            }

            toast.success("Joined video call!")
        } catch (error) {
            console.error("Error joining video call:", error)
            toast.error("Failed to join video call")
        }
    }, [])

    // Leave video call
    const leaveVideoCall = useCallback(() => {
        endVideoCall()
    }, [endVideoCall])

    // Handle WebRTC signaling
    useEffect(() => {
        const handleVideoCallSignal = async ({ type, socketId, data }: RTCMessage) => {
            switch (type) {
                case 'video-call-start':
                    // Someone started a video call
                    toast.success(`${data.username} started a video call`)
                    break

                case 'video-call-end':
                    // Someone ended the video call
                    const pc = peerConnections.current.get(socketId)
                    if (pc) {
                        pc.close()
                        peerConnections.current.delete(socketId)
                    }
                    setRemoteStreams(prev => {
                        const newMap = new Map(prev)
                        newMap.delete(socketId)
                        return newMap
                    })
                    break

                case 'offer':
                    const peerConnection = createPeerConnection(socketId)
                    await peerConnection.setRemoteDescription(data)
                    const answer = await peerConnection.createAnswer()
                    await peerConnection.setLocalDescription(answer)
                    
                    socket.emit('video-call-signal', {
                        type: 'answer',
                        socketId,
                        data: answer
                    })
                    break

                case 'answer':
                    const pc2 = peerConnections.current.get(socketId)
                    if (pc2) {
                        await pc2.setRemoteDescription(data)
                    }
                    break

                case 'ice-candidate':
                    const pc3 = peerConnections.current.get(socketId)
                    if (pc3) {
                        await pc3.addIceCandidate(data)
                    }
                    break

                case 'user-media-state':
                    // Update participant media state
                    setParticipants(prev => prev.map(p => 
                        p.socketId === socketId 
                            ? { ...p, isVideoEnabled: data.isVideoEnabled, isAudioEnabled: data.isAudioEnabled }
                            : p
                    ))
                    break
            }
        }

        socket.on('video-call-signal', handleVideoCallSignal)

        return () => {
            socket.off('video-call-signal', handleVideoCallSignal)
        }
    }, [socket, createPeerConnection])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop())
            }
            peerConnections.current.forEach(pc => pc.close())
        }
    }, [localStream])

    return (
        <VideoCallContext.Provider
            value={{
                localStream,
                remoteStreams,
                isVideoCallActive,
                isVideoEnabled,
                isAudioEnabled,
                isScreenSharing,
                participants,
                startVideoCall,
                endVideoCall,
                toggleVideo,
                toggleAudio,
                toggleScreenShare,
                joinVideoCall,
                leaveVideoCall
            }}
        >
            {children}
            <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{ display: 'none' }}
            />
        </VideoCallContext.Provider>
    )
}

export { VideoCallContextProvider }
export default VideoCallContext
