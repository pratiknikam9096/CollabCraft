import { useVideoCall } from "@/context/VideoCallContext"
import { useChat } from "@/context/ChatContext"
import { useEffect, useRef, useState } from "react"
import { BsCameraVideo, BsMic, BsMicMute, BsDisplay, BsTelephone, BsX, BsChat } from "react-icons/bs"
import cn from "classnames"

interface VideoCallOverlayProps {
    onClose: () => void
}

function VideoCallOverlay({ onClose }: VideoCallOverlayProps) {
    const { 
        isVideoCallActive, 
        isVideoEnabled, 
        isAudioEnabled, 
        isScreenSharing,
        toggleVideo, 
        toggleAudio, 
        toggleScreenShare,
        leaveVideoCall,
        endVideoCall,
        participants
    } = useVideoCall()
    

    const [isMinimized, setIsMinimized] = useState(false)
    const [showChat, setShowChat] = useState(false)

    // Draggable + resizable overlay
    const aspectRatio = 16 / 9
    const containerRef = useRef<HTMLDivElement | null>(null)
    const dragDataRef = useRef<{ offsetX: number; offsetY: number; dragging: boolean }>({ offsetX: 0, offsetY: 0, dragging: false })
    const resizeDataRef = useRef<{ startX: number; startY: number; startWidth: number; resizing: boolean }>({ startX: 0, startY: 0, startWidth: 320, resizing: false })
    const [position, setPosition] = useState<{ x: number; y: number }>(() => {
        try {
            const saved = localStorage.getItem("videoOverlayPos")
            if (saved) return JSON.parse(saved)
        } catch {}
        const defaultWidth = 360
        return { x: Math.max(16, window.innerWidth - defaultWidth - 16), y: 16 }
    })
    const [width, setWidth] = useState<number>(() => {
        try {
            const saved = localStorage.getItem("videoOverlayWidth")
            if (saved) return Number(saved) || 360
        } catch {}
        return 360
    })

    const baseVideoHeight = Math.round(width / aspectRatio)
    const headerHeight = 40
    const controlsHeight = 64
    const chatHeight = showChat ? 180 : 0
    const containerHeight = baseVideoHeight + headerHeight + controlsHeight + chatHeight

    useEffect(() => {
        localStorage.setItem("videoOverlayPos", JSON.stringify(position))
    }, [position])

    useEffect(() => {
        localStorage.setItem("videoOverlayWidth", String(width))
    }, [width])

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (dragDataRef.current.dragging) {
                const newX = e.clientX - dragDataRef.current.offsetX
                const newY = e.clientY - dragDataRef.current.offsetY
                const maxX = Math.max(0, window.innerWidth - width)
                const maxY = Math.max(0, window.innerHeight - containerHeight)
                setPosition({ x: Math.min(Math.max(0, newX), maxX), y: Math.min(Math.max(0, newY), maxY) })
            } else if (resizeDataRef.current.resizing) {
                const deltaX = e.clientX - resizeDataRef.current.startX
                const minW = 260
                const maxW = Math.min(900, window.innerWidth - position.x)
                const nextW = Math.min(Math.max(minW, resizeDataRef.current.startWidth + deltaX), maxW)
                setWidth(nextW)
            }
        }
        const handleMouseUp = () => {
            dragDataRef.current.dragging = false
            resizeDataRef.current.resizing = false
        }
        window.addEventListener("mousemove", handleMouseMove)
        window.addEventListener("mouseup", handleMouseUp)
        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            window.removeEventListener("mouseup", handleMouseUp)
        }
    }, [width, containerHeight, position.x])

    useEffect(() => {
        const handleResize = () => {
            const maxX = Math.max(0, window.innerWidth - width)
            const maxY = Math.max(0, window.innerHeight - containerHeight)
            setPosition(prev => ({ x: Math.min(prev.x, maxX), y: Math.min(prev.y, maxY) }))
        }
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [width, containerHeight])

    if (!isVideoCallActive) return null

    const handleLeaveCall = () => {
        leaveVideoCall()
        onClose()
    }

    const handleEndCall = () => {
        endVideoCall()
        onClose()
    }

    if (isMinimized) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <div className="bg-dark border border-primary rounded-lg p-3 shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-white text-sm font-medium">Video Call</span>
                            <span className="text-gray-400 text-xs">
                                {participants.length} participant{participants.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setIsMinimized(false)}
                                className="p-1 text-white hover:text-primary transition-colors"
                                title="Expand"
                            >
                                <BsCameraVideo size={16} />
                            </button>
                            <button
                                onClick={handleLeaveCall}
                                className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                title="Leave call"
                            >
                                <BsTelephone size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            className="fixed z-50 select-none"
            style={{ left: position.x, top: position.y, width, height: containerHeight }}
        >
            <div className="bg-dark border border-gray-600 rounded-lg shadow-lg overflow-hidden h-full w-full">
                {/* Header (drag handle) */}
                <div
                    className="bg-gray-800 px-3 py-2 flex items-center justify-between cursor-move"
                    onMouseDown={(e) => {
                        if (!containerRef.current) return
                        const rect = containerRef.current.getBoundingClientRect()
                        dragDataRef.current = {
                            offsetX: e.clientX - rect.left,
                            offsetY: e.clientY - rect.top,
                            dragging: true
                        }
                    }}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-white text-sm font-medium">Team Call</span>
                        <span className="text-gray-400 text-xs">
                            {participants.length} participant{participants.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        {/* Chat toggle */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowChat(prev => !prev) }}
                            className="p-1 text-gray-300 hover:text-white transition-colors"
                            title={showChat ? "Hide chat" : "Show chat"}
                        >
                            <BsChat size={16} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsMinimized(true) }}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                            title="Minimize"
                        >
                            <BsX size={16} />
                        </button>
                    </div>
                </div>

                {/* Video Preview */}
                <div className="relative bg-gray-700" style={{ width: "100%", height: baseVideoHeight }}>
                    {participants.find(p => p.isLocal)?.stream ? (
                        <video
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                            ref={(el) => {
                                if (el && participants.find(p => p.isLocal)?.stream) {
                                    el.srcObject = participants.find(p => p.isLocal)!.stream!
                                }
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <BsCameraVideo className="text-gray-400" size={32} />
                        </div>
                    )}
                    {/* Local indicator */}
                    <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded">
                        <span className="text-white text-xs">You</span>
                    </div>
                    {/* Resize handle */}
                    <div
                        className="absolute right-1 bottom-1 w-3 h-3 bg-white/70 rounded-sm cursor-nwse-resize"
                        onMouseDown={(e) => {
                            e.stopPropagation()
                            resizeDataRef.current = {
                                startX: e.clientX,
                                startY: e.clientY,
                                startWidth: width,
                                resizing: true
                            }
                        }}
                        title="Resize"
                    />
                </div>

                {/* Optional Chat Panel */}
                {showChat && <OverlayChatPanel />}

                {/* Controls */}
                <div className="p-3 bg-gray-800">
                    <div className="flex justify-center gap-2">
                        {/* Audio Toggle */}
                        <button
                            onClick={toggleAudio}
                            className={cn(
                                "p-2 rounded-full transition-colors",
                                isAudioEnabled 
                                    ? "bg-gray-600 hover:bg-gray-500 text-white" 
                                    : "bg-red-500 hover:bg-red-600 text-white"
                            )}
                            title={isAudioEnabled ? "Mute" : "Unmute"}
                        >
                            {isAudioEnabled ? <BsMic size={16} /> : <BsMicMute size={16} />}
                        </button>

                        {/* Video Toggle */}
                        <button
                            onClick={toggleVideo}
                            className={cn(
                                "p-2 rounded-full transition-colors",
                                isVideoEnabled 
                                    ? "bg-gray-600 hover:bg-gray-500 text-white" 
                                    : "bg-red-500 hover:bg-red-600 text-white"
                            )}
                            title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
                        >
                            <BsCameraVideo size={16} />
                        </button>

                        {/* Screen Share */}
                        <button
                            onClick={toggleScreenShare}
                            className={cn(
                                "p-2 rounded-full transition-colors",
                                isScreenSharing 
                                    ? "bg-primary hover:bg-green-400 text-black" 
                                    : "bg-gray-600 hover:bg-gray-500 text-white"
                            )}
                            title={isScreenSharing ? "Stop sharing" : "Share screen"}
                        >
                            <BsDisplay size={16} />
                        </button>

                        {/* Leave Call */}
                        <button
                            onClick={handleLeaveCall}
                            className="p-2 rounded-full bg-yellow-500 hover:bg-yellow-600 text-white transition-colors"
                            title="Leave call"
                        >
                            <BsTelephone size={16} />
                        </button>

                        {/* End Call */}
                        <button
                            onClick={handleEndCall}
                            className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                            title="End call for everyone"
                        >
                            <BsX size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default VideoCallOverlay

// Embedded chat panel for the overlay
function OverlayChatPanel() {
    const { messages, sendMessage } = useChat()
    const [draft, setDraft] = useState("")
    const endRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const handleSend = () => {
        if (!draft.trim()) return
        sendMessage(draft)
        setDraft("")
    }

    return (
        <div className="bg-gray-900 border-t border-gray-700" style={{ height: 180 }}>
            <div className="h-[130px] overflow-y-auto px-3 py-2 space-y-2">
                {messages.map((m) => (
                    <div key={m.id} className="text-xs text-white/90">
                        <span className="text-primary">{m.username}</span>
                        <span className="mx-1 text-white/60">•</span>
                        <span className="text-white/70">{m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className="text-white">{m.message}</div>
                    </div>
                ))}
                <div ref={endRef} />
            </div>
            <div className="px-3 pb-2 flex gap-2">
                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    className="flex-1 rounded-md bg-gray-800 text-white text-sm px-2 py-1 outline-none border border-gray-700"
                    placeholder="Type a message..."
                />
                <button
                    onClick={handleSend}
                    className="px-3 py-1 bg-primary text-black rounded-md text-sm"
                >
                    Send
                </button>
            </div>
        </div>
    )
}
