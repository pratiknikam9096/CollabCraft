import express, { Response, Request } from "express"
import dotenv from "dotenv"
import http from "http"
import cors from "cors"
import { SocketEvent, SocketId } from "./types/socket"
import { USER_CONNECTION_STATUS, User } from "./types/user"
import { Server } from "socket.io"
import path from "path"
import cookie from "cookie"

dotenv.config()

const app = express()
app.use(express.json())
app.use(cors({
  origin: [
    'https://collabcraft-cbqu.onrender.com', 
    'http://localhost:5173'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));

app.use(express.static(path.join(__dirname, "public"), { fallthrough: true }))

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: [
      'https://collabcraft-cbqu.onrender.com', 
      'http://localhost:5173'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  },
  maxHttpBufferSize: 1e8,
  pingTimeout: 60000,
})

// Enhanced user management with video call state
let userSocketMap: User[] = []
let activeVideoCalls: Map<string, {
  roomId: string,
  participants: string[],
  startedBy: string,
  startTime: number
}> = new Map()

// Helper functions
function getUsersInRoom(roomId: string): User[] {
  return userSocketMap.filter((user) => user.roomId === roomId)
}

function getRoomId(socketId: SocketId): string | null {
  const roomId = userSocketMap.find(
    (user) => user.socketId === socketId
  )?.roomId
  if (!roomId) {
    console.error("Room ID is undefined for socket ID:", socketId)
    return null
  }
  return roomId
}

function getUserBySocketId(socketId: SocketId): User | null {
  const user = userSocketMap.find((user) => user.socketId === socketId)
  if (!user) {
    console.error("User not found for socket ID:", socketId)
    return null
  }
  return user
}

function getUserByUsername(username: string, roomId: string): User | null {
  return userSocketMap.find((user) => user.username === username && user.roomId === roomId) || null
}

function cleanupStaleUsers() {
  const now = Date.now()
  const beforeCount = userSocketMap.length
  userSocketMap = userSocketMap.filter((user) => {
    if (user.status === USER_CONNECTION_STATUS.ONLINE) return true
    if (user.lastSeen && (now - user.lastSeen) > 120000) {
      return false
    }
    return true
  })
  const afterCount = userSocketMap.length
  if (beforeCount !== afterCount) {
    console.log(`Cleaned up ${beforeCount - afterCount} stale offline users`)
  }
}

// Video call management functions
function getActiveVideoCall(roomId: string) {
  return activeVideoCalls.get(roomId)
}

function startVideoCall(roomId: string, username: string) {
  activeVideoCalls.set(roomId, {
    roomId,
    participants: [username],
    startedBy: username,
    startTime: Date.now()
  })
}

function joinVideoCall(roomId: string, username: string) {
  const call = activeVideoCalls.get(roomId)
  if (call && !call.participants.includes(username)) {
    call.participants.push(username)
  }
}

function leaveVideoCall(roomId: string, username: string) {
  const call = activeVideoCalls.get(roomId)
  if (call) {
    call.participants = call.participants.filter(p => p !== username)
    if (call.participants.length === 0) {
      activeVideoCalls.delete(roomId)
    }
  }
}

function endVideoCall(roomId: string) {
  activeVideoCalls.delete(roomId)
}

// ✅ Endpoint to set cookies for username/roomId (before Socket.IO connect)
const isProd = process.env.NODE_ENV === "production"

app.post("/api/session", (req: Request, res: Response) => {
  const { roomId, username } = req.body || {}
  if (!roomId || !username) {
    return res.status(400).json({ error: "roomId and username required" })
  }

  const cookieOptsBase = {
    httpOnly: true,
    path: "/",
  } as cookie.CookieSerializeOptions

  const cookieOpts = {
    ...cookieOptsBase,
    sameSite: isProd ? "none" : "lax",
    secure: isProd ? true : false,
    maxAge: 60 * 60 * 24, // 24 hours
  } as cookie.CookieSerializeOptions

  const cookiesToSet: string[] = []
  cookiesToSet.push(cookie.serialize("roomId", roomId, cookieOpts))
  cookiesToSet.push(cookie.serialize("username", username, cookieOpts))

  res.setHeader("Set-Cookie", cookiesToSet)
  return res.status(200).json({ ok: true })
})

// ✅ Logout/Clear cookies
app.post("/api/logout", (req: Request, res: Response) => {
  const base: cookie.CookieSerializeOptions = { httpOnly: true, path: "/" }
  const clear = {
    ...base,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    maxAge: 0,
  } as cookie.CookieSerializeOptions
  res.setHeader("Set-Cookie", [
    cookie.serialize("roomId", "", clear),
    cookie.serialize("username", "", clear),
  ])
  res.status(200).json({ ok: true })
})

// SOCKET.IO
io.on("connection", (socket) => {
  // ✅ Parse cookies from handshake
  const rawCookie = socket.handshake.headers?.cookie || ""
  const cookies = cookie.parse(rawCookie)

  socket.on(SocketEvent.JOIN_REQUEST, ({ roomId, username }) => {
    // ✅ Fallback from cookies if missing
    if (!roomId || !username) {
      roomId = roomId || cookies.roomId
      username = username || cookies.username
    }
    if (!roomId || !username) {
      io.to(socket.id).emit(SocketEvent.USERNAME_EXISTS)
      return
    }

    // Check if user already exists and is online
    const existingUser = getUserByUsername(username, roomId)
    
    if (existingUser) {
      // If user exists but with different socket, update it
      if (existingUser.socketId !== socket.id) {
        userSocketMap = userSocketMap.map(u => 
          u.username === username && u.roomId === roomId
            ? { ...u, socketId: socket.id, status: USER_CONNECTION_STATUS.ONLINE, lastSeen: Date.now() }
            : u
        )
      }
      
      // Check if there's an active video call and inform the user
      const activeCall = getActiveVideoCall(roomId)
      if (activeCall) {
        socket.emit("video-call-status", { 
          isActive: true, 
          participants: activeCall.participants,
          startedBy: activeCall.startedBy
        })
      }
    } else {
      // Create new user
      const user = {
        username,
        roomId,
        status: USER_CONNECTION_STATUS.ONLINE,
        cursorPosition: 0,
        typing: false,
        socketId: socket.id,
        currentFile: null,
        lastSeen: Date.now(),
      }
      userSocketMap.push(user)
    }

    socket.join(roomId)
    
    // Get updated user list
    const user = getUserByUsername(username, roomId)!
    const users = getUsersInRoom(roomId)
    
    // Notify others about user joining
    socket.broadcast.to(roomId).emit(SocketEvent.USER_JOINED, { user })
    
    // Send acceptance to the joining user
    io.to(socket.id).emit(SocketEvent.JOIN_ACCEPTED, { user, users })
    
    // Check if there are other users and show syncing message
    if (users.length > 1) {
      // Send syncing complete after a short delay
      setTimeout(() => {
        io.to(socket.id).emit("syncing-complete")
      }, 1000)
    }
  })

  socket.on("reconnect_attempt", ({ roomId, username }) => {
    if (!roomId || !username) {
      roomId = roomId || cookies.roomId
      username = username || cookies.username
    }
    
    if (!roomId || !username) {
      return
    }

    const existingUser = getUserByUsername(username, roomId)
    
    if (existingUser) {
      // Update socket ID and status
      userSocketMap = userSocketMap.map(u =>
        u.username === username && u.roomId === roomId
          ? { ...u, socketId: socket.id, status: USER_CONNECTION_STATUS.ONLINE, lastSeen: Date.now() }
          : u
      )
      
      socket.join(roomId)
      
      // Notify others that user is back online
      socket.broadcast.to(roomId).emit(SocketEvent.USER_ONLINE, { 
        socketId: socket.id,
        username: existingUser.username 
      })
      
      // Send current room state
      const users = getUsersInRoom(roomId)
      const user = getUserByUsername(username, roomId)!
      io.to(socket.id).emit(SocketEvent.JOIN_ACCEPTED, { user, users })
      
      // Check for active video call
      const activeCall = getActiveVideoCall(roomId)
      if (activeCall) {
        socket.emit("video-call-status", { 
          isActive: true, 
          participants: activeCall.participants,
          startedBy: activeCall.startedBy
        })
      }

      // Send syncing complete similar to initial join if there are multiple users
      if (users.length > 1) {
        setTimeout(() => {
          io.to(socket.id).emit("syncing-complete")
        }, 1000)
      }
    }
  })

  // Handle video call signals
  socket.on("video-call-signal", ({ type, socketId, data }) => {
    const user = getUserBySocketId(socket.id)
    if (!user) return

    switch (type) {
      case "team-video-call-start":
        startVideoCall(user.roomId, user.username)
        socket.broadcast.to(user.roomId).emit("video-call-signal", {
          type: "team-video-call-start",
          socketId: socket.id,
          data: { username: user.username, roomId: user.roomId }
        })
        break
        
      case "team-video-call-join":
        joinVideoCall(user.roomId, user.username)
        socket.broadcast.to(user.roomId).emit("video-call-signal", {
          type: "team-video-call-join",
          socketId: socket.id,
          data: { username: user.username, roomId: user.roomId }
        })
        break
        
      case "team-video-call-leave":
        leaveVideoCall(user.roomId, user.username)
        socket.broadcast.to(user.roomId).emit("video-call-signal", {
          type: "team-video-call-leave",
          socketId: socket.id,
          data: { username: user.username }
        })
        break
        
      case "team-video-call-end":
        endVideoCall(user.roomId)
        socket.broadcast.to(user.roomId).emit("video-call-signal", {
          type: "team-video-call-end",
          socketId: socket.id,
          data: { username: user.username }
        })
        break
        
      case "offer":
      case "answer":
      case "ice-candidate":
        // Forward WebRTC signaling to specific user
        const targetSocket = io.sockets.sockets.get(socketId)
        if (targetSocket) {
          targetSocket.emit("video-call-signal", { type, socketId: socket.id, data })
        }
        break
    }
  })

  // Handle disconnection
  socket.on("disconnect", () => {
    const user = getUserBySocketId(socket.id)
    if (user) {
      // Mark user as offline but keep them in the list
      userSocketMap = userSocketMap.map(u =>
        u.socketId === socket.id
          ? { ...u, status: USER_CONNECTION_STATUS.OFFLINE, lastSeen: Date.now() }
          : u
      )
      
      // Notify others about disconnection
      socket.broadcast.to(user.roomId).emit(SocketEvent.USER_DISCONNECTED, { user })
      
      // Handle video call cleanup
      const activeCall = getActiveVideoCall(user.roomId)
      if (activeCall && activeCall.participants.includes(user.username)) {
        leaveVideoCall(user.roomId, user.username)
        socket.broadcast.to(user.roomId).emit("video-call-signal", {
          type: "team-video-call-leave",
          socketId: socket.id,
          data: { username: user.username }
        })
      }
    }
  })

  // Handle user activity (typing, cursor position, etc.)
  socket.on(SocketEvent.TYPING_START, ({ roomId, username }) => {
    socket.broadcast.to(roomId).emit(SocketEvent.TYPING_START, { username })
  })

  socket.on(SocketEvent.TYPING_PAUSE, ({ roomId, username }) => {
    socket.broadcast.to(roomId).emit(SocketEvent.TYPING_PAUSE, { username })
  })

  socket.on(SocketEvent.SEND_MESSAGE, ({ roomId, message, username }) => {
    socket.broadcast.to(roomId).emit(SocketEvent.RECEIVE_MESSAGE, { message, username })
  })

  // Handle drawing sync
  socket.on(SocketEvent.REQUEST_DRAWING, ({ socketId }) => {
    const user = getUserBySocketId(socket.id)
    if (user) {
      // This would typically request drawing data from the requesting user
      // For now, we'll just acknowledge the request
      socket.emit(SocketEvent.SYNC_DRAWING, { socketId: socket.id, drawingData: {} })
    }
  })

  socket.on(SocketEvent.SYNC_DRAWING, ({ socketId, drawingData }) => {
    const targetSocket = io.sockets.sockets.get(socketId)
    if (targetSocket) {
      targetSocket.emit(SocketEvent.SYNC_DRAWING, { socketId: socket.id, drawingData })
    }
  })

  socket.on(SocketEvent.DRAWING_UPDATE, ({ roomId, drawingData }) => {
    socket.broadcast.to(roomId).emit(SocketEvent.DRAWING_UPDATE, { drawingData })
  })

  // Handle file operations
  socket.on(SocketEvent.SYNC_FILE_STRUCTURE, ({ roomId, fileStructure }) => {
    socket.broadcast.to(roomId).emit(SocketEvent.SYNC_FILE_STRUCTURE, { fileStructure })
  })

  socket.on(SocketEvent.FILE_CREATED, ({ roomId, file }) => {
    socket.broadcast.to(roomId).emit(SocketEvent.FILE_CREATED, { file })
  })

  socket.on(SocketEvent.FILE_UPDATED, ({ roomId, file }) => {
    socket.broadcast.to(roomId).emit(SocketEvent.FILE_UPDATED, { file })
  })

  socket.on(SocketEvent.FILE_DELETED, ({ roomId, filePath }) => {
    socket.broadcast.to(roomId).emit(SocketEvent.FILE_DELETED, { filePath })
  })

  socket.on(SocketEvent.DIRECTORY_CREATED, ({ roomId, directory }) => {
    socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_CREATED, { directory })
  })

  socket.on(SocketEvent.DIRECTORY_UPDATED, ({ roomId, directory }) => {
    socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_UPDATED, { directory })
  })

  socket.on(SocketEvent.DIRECTORY_DELETED, ({ roomId, directoryPath }) => {
    socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_DELETED, { directoryPath })
  })
})

const PORT = process.env.PORT || 3001
app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"))
})

app.use((err: any, req: Request, res: Response, next: Function) => {
  if (err.status === 404) {
    res.status(404).sendFile(path.join(__dirname, "..", "public", "404.html"))
  } else {
    next(err)
  }
})

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
  setInterval(cleanupStaleUsers, 30000)
})
