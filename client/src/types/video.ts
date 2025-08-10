interface VideoCallContext {
    localStream: MediaStream | null
    remoteStreams: Map<string, MediaStream>
    isVideoCallActive: boolean
    isVideoEnabled: boolean
    isAudioEnabled: boolean
    isScreenSharing: boolean
    participants: VideoParticipant[]
    startVideoCall: () => Promise<void>
    endVideoCall: () => void
    toggleVideo: () => void
    toggleAudio: () => void
    toggleScreenShare: () => Promise<void>
    joinVideoCall: () => Promise<void>
    leaveVideoCall: () => void
}

interface VideoParticipant {
    socketId: string
    username: string
    stream: MediaStream | null
    isVideoEnabled: boolean
    isAudioEnabled: boolean
    isScreenSharing: boolean
}

interface RTCMessage {
    type: 'offer' | 'answer' | 'ice-candidate' | 'video-call-start' | 'video-call-end' | 'user-media-state'
    socketId: string
    data: any
}

export { VideoCallContext, VideoParticipant, RTCMessage }