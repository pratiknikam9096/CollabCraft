import express, { Response, Request } from "express"
import dotenv from "dotenv"
import http from "http"
import cors from "cors"
import { SocketEvent, SocketId } from "./types/socket"
import { USER_CONNECTION_STATUS, User } from "./types/user"
import { Server } from "socket.io"
import path from "path"
import cookie from "cookie" // ✅ added for parsing/serializing cookies

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

let userSocketMap: User[] = []

// Helper functions
function getUsersInRoom(roomId: string): User[] {
  return userSocketMap.filter((user) => user.roomId == roomId)
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
    maxAge: 60 * 60,
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

    const existingUser = userSocketMap.find(
      (u) => u.username === username && u.roomId === roomId
    )

    if (existingUser && existingUser.socketId !== socket.id) {
      userSocketMap = userSocketMap.filter(u => u.socketId !== existingUser.socketId)
    }

    const activeUsersInRoom = getUsersInRoom(roomId).filter(
      (u) => u.status === USER_CONNECTION_STATUS.ONLINE && u.username === username
    )

    if (activeUsersInRoom.length > 0) {
      io.to(socket.id).emit(SocketEvent.USERNAME_EXISTS)
      return
    }

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
    socket.join(roomId)
    socket.broadcast.to(roomId).emit(SocketEvent.USER_JOINED, { user })
    const users = getUsersInRoom(roomId)
    io.to(socket.id).emit(SocketEvent.JOIN_ACCEPTED, { user, users })
  })

  socket.on("reconnect_attempt", ({ roomId, username }) => {
    if (!roomId || !username) {
      roomId = roomId || cookies.roomId
      username = username || cookies.username
    }
    const existingUser = userSocketMap.find(
      (u) => u.username === username && u.roomId === roomId && u.status === USER_CONNECTION_STATUS.OFFLINE
    )

    if (existingUser) {
      userSocketMap = userSocketMap.map(u =>
        u.username === username && u.roomId === roomId
          ? { ...u, socketId: socket.id, status: USER_CONNECTION_STATUS.ONLINE, lastSeen: Date.now() }
          : u
      )
      socket.join(roomId)
      socket.broadcast.to(roomId).emit(SocketEvent.USER_ONLINE, { socketId: socket.id })
      const users = getUsersInRoom(roomId)
      io.to(socket.id).emit(SocketEvent.JOIN_ACCEPTED, { user: existingUser, users })
    }
  })

  // ... ✅ all your other existing socket.on handlers remain UNCHANGED ...
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
