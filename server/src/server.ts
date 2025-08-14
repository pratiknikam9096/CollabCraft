import express, { Response, Request } from "express"
import dotenv from "dotenv"
import http from "http"
import cors from "cors"
import { SocketEvent, SocketId } from "./types/socket"
import { USER_CONNECTION_STATUS, User } from "./types/user"
import { Server } from "socket.io"
import path from "path"
import os from "os"
import { WebSocketServer, WebSocket } from "ws"
import { spawn, ChildProcess } from "child_process"

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
}))

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

// -----------------------
// Simple WebSocket Terminal API
// -----------------------
const TERMINAL_API_KEY = process.env.TERMINAL_API_KEY || "dev-terminal-key"

const wss = new WebSocketServer({ server, path: "/terminal" })

// Resolve project root as working directory
const resolveProjectCwd = () => {
	try {
		return path.resolve(__dirname, "..", "..")
	} catch {
		return process.cwd()
	}
}

wss.on("connection", (ws: WebSocket, req: any) => {
	try {
		// Simple token check via query param
		const url = new URL(req.url || "", `http://${req.headers.host}`)
		const token = url.searchParams.get("token")
		if (!token || token !== TERMINAL_API_KEY) {
			ws.close(1008, "Unauthorized")
			return
		}

		let currentProcess: ChildProcess | null = null
		const cwd = resolveProjectCwd()

		// Send welcome message
		ws.send(`\x1b[32mWelcome to CollabCraft Terminal!\x1b[0m\r\n`)
		ws.send(`\x1b[36mWorking directory: ${cwd}\x1b[0m\r\n`)
		ws.send(`\x1b[33mType your command and press Enter...\x1b[0m\r\n\r\n`)

		ws.on("message", (msg: any) => {
			try {
				const command = msg.toString().trim()
				
				if (!command) return

				// Kill any existing process
				if (currentProcess) {
					currentProcess.kill()
					currentProcess = null
				}

				// Determine shell by platform
				const platform = os.platform()
				let shell = "bash"
				let shellArgs: string[] = []
				
				if (platform === "win32") {
					shell = process.env.ComSpec || "cmd.exe"
					shellArgs = ["/c", command]
				} else {
					shellArgs = ["-c", command]
				}

				// Spawn new process
				currentProcess = spawn(shell, shellArgs, {
					cwd,
					env: process.env as Record<string, string>,
				})

				// Stream output
				currentProcess.stdout?.on("data", (data) => {
					if (ws.readyState === ws.OPEN) {
						ws.send(data.toString())
					}
				})

				currentProcess.stderr?.on("data", (data) => {
					if (ws.readyState === ws.OPEN) {
						ws.send(`\x1b[31m${data.toString()}\x1b[0m`)
					}
				})

				currentProcess.on("close", (code) => {
					if (ws.readyState === ws.OPEN) {
						ws.send(`\r\n\x1b[33m[Process exited with code ${code}]\x1b[0m\r\n`)
					}
					currentProcess = null
				})

				currentProcess.on("error", (error) => {
					if (ws.readyState === ws.OPEN) {
						ws.send(`\r\n\x1b[31m[Error: ${error.message}]\x1b[0m\r\n`)
					}
					currentProcess = null
				})

			} catch (e) {
				console.error("Terminal command error:", e)
				if (ws.readyState === ws.OPEN) {
					ws.send(`\r\n\x1b[31m[Error executing command]\x1b[0m\r\n`)
				}
			}
		})

		ws.on("close", () => {
			if (currentProcess) {
				currentProcess.kill()
			}
		})

	} catch (e) {
		console.error("Terminal WS error:", e)
		try {
			ws.close()
		} catch {}
	}
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
  const videoCall = activeVideoCalls.get(roomId)
  if (videoCall && !videoCall.participants.includes(username)) {
    videoCall.participants.push(username)
  }
}

function leaveVideoCall(roomId: string, username: string) {
  const videoCall = activeVideoCalls.get(roomId)
  if (videoCall) {
    videoCall.participants = videoCall.participants.filter(p => p !== username)
    if (videoCall.participants.length === 0) {
      activeVideoCalls.delete(roomId)
    }
  }
}

function endVideoCall(roomId: string) {
  activeVideoCalls.delete(roomId)
}

// Socket.IO event handlers
io.on("connection", (socket) => {
  // Handle user actions
  socket.on(SocketEvent.JOIN_REQUEST, ({ roomId, username }) => {
    console.log(`Join request from ${username} for room ${roomId}`)
    
    // Check if this user is already connected with a different socket
    const existingUser = userSocketMap.find(
      (u) => u.username === username && u.roomId === roomId
    )
    
    // If same user trying to reconnect, remove old entry first
    if (existingUser && existingUser.socketId !== socket.id) {
      console.log(`User ${username} reconnecting - removing old socket ${existingUser.socketId}`)
      userSocketMap = userSocketMap.filter(u => u.socketId !== existingUser.socketId)
    }
    
    // Check if username exists in the room (only active users)
    const activeUsersInRoom = getUsersInRoom(roomId).filter(
      (u) => u.status === USER_CONNECTION_STATUS.ONLINE && u.username === username
    )
    
    console.log(`Active users in room ${roomId}:`, getUsersInRoom(roomId).map(u => ({ username: u.username, status: u.status })))
    console.log(`Username ${username} exists check:`, activeUsersInRoom.length > 0)
    
    if (activeUsersInRoom.length > 0) {
      console.log(`Username ${username} already exists in room ${roomId}`)
      io.to(socket.id).emit(SocketEvent.USERNAME_EXISTS)
      return
    }

    const user: User = {
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
    console.log(`User ${username} successfully joined room ${roomId}`)
  })

  socket.on("disconnecting", () => {
    console.log(`User disconnecting: ${socket.id}`)
    const user = getUserBySocketId(socket.id)
    if (!user) {
      console.log(`No user found for socket ${socket.id}`)
      return
    }
    
    const roomId = user.roomId
    console.log(`User ${user.username} disconnecting from room ${roomId}`)
    
    // Mark user as offline but keep in map for potential reconnection
    userSocketMap = userSocketMap.map((u) => 
      u.socketId === socket.id 
        ? { ...u, status: USER_CONNECTION_STATUS.OFFLINE, lastSeen: Date.now() }
        : u
    )
    
    // Don't emit disconnect event yet - user might reconnect
    socket.leave(roomId)
  })
  
  // Handle explicit room leave (not just disconnection)
  socket.on("leave_room", () => {
    console.log(`User explicitly leaving room: ${socket.id}`)
    const user = getUserBySocketId(socket.id)
    if (!user) return
    
    const roomId = user.roomId
    console.log(`User ${user.username} explicitly leaving room ${roomId}`)
    
    // Emit disconnect event and remove user completely
    socket.broadcast.to(roomId).emit(SocketEvent.USER_DISCONNECTED, { user })
    userSocketMap = userSocketMap.filter((u) => u.socketId !== socket.id)
    socket.leave(roomId)
    
    console.log(`User ${user.username} completely removed from room ${roomId}`)
  })
  
  // Handle reconnection attempts
  socket.on("reconnect_attempt", ({ roomId, username }) => {
    console.log(`Reconnection attempt from ${username} for room ${roomId}`)
    
    // Find existing offline user
    const existingUser = userSocketMap.find(
      (u) => u.username === username && u.roomId === roomId && u.status === USER_CONNECTION_STATUS.OFFLINE
    )
    
    if (existingUser) {
      console.log(`Restoring offline user ${username} in room ${roomId}`)
      
      // Update the existing user with new socket ID and mark as online
      userSocketMap = userSocketMap.map(u => 
        u.username === username && u.roomId === roomId
          ? { ...u, socketId: socket.id, status: USER_CONNECTION_STATUS.ONLINE, lastSeen: Date.now() }
          : u
      )
      
      socket.join(roomId)
      
      // Notify other users that this user is back online
      socket.broadcast.to(roomId).emit(SocketEvent.USER_ONLINE, { socketId: socket.id })
      
      // Send current room state to reconnected user
      const users = getUsersInRoom(roomId)
      io.to(socket.id).emit(SocketEvent.JOIN_ACCEPTED, { user: existingUser, users })
      
      console.log(`User ${username} successfully reconnected to room ${roomId}`)
    } else {
      console.log(`No offline user ${username} found in room ${roomId}`)
    }
  })

  // Handle file actions
  socket.on(
    SocketEvent.SYNC_FILE_STRUCTURE,
    ({ fileStructure, openFiles, activeFile, socketId }) => {
      io.to(socketId).emit(SocketEvent.SYNC_FILE_STRUCTURE, {
        fileStructure,
        openFiles,
        activeFile,
      })
    }
  )

  socket.on(
    SocketEvent.DIRECTORY_CREATED,
    ({ parentDirId, newDirectory }) => {
      const roomId = getRoomId(socket.id)
      if (!roomId) return
      socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_CREATED, {
        parentDirId,
        newDirectory,
      })
    }
  )

  socket.on(SocketEvent.DIRECTORY_UPDATED, ({ dirId, children }) => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_UPDATED, {
      dirId,
      children,
    })
  })

  socket.on(SocketEvent.DIRECTORY_RENAMED, ({ dirId, newName }) => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_RENAMED, {
      dirId,
      newName,
    })
  })

  socket.on(SocketEvent.DIRECTORY_DELETED, ({ dirId }) => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    socket.broadcast
      .to(roomId)
      .emit(SocketEvent.DIRECTORY_DELETED, { dirId })
  })

  socket.on(SocketEvent.FILE_CREATED, ({ parentDirId, newFile }) => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    socket.broadcast
      .to(roomId)
      .emit(SocketEvent.FILE_CREATED, { parentDirId, newFile })
  })

  socket.on(SocketEvent.FILE_UPDATED, ({ fileId, newContent }) => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    socket.broadcast.to(roomId).emit(SocketEvent.FILE_UPDATED, {
      fileId,
      newContent,
    })
  })

  socket.on(SocketEvent.FILE_RENAMED, ({ fileId, newName }) => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    socket.broadcast.to(roomId).emit(SocketEvent.FILE_RENAMED, {
      fileId,
      newName,
    })
  })

  socket.on(SocketEvent.FILE_DELETED, ({ fileId }) => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    socket.broadcast.to(roomId).emit(SocketEvent.FILE_DELETED, { fileId })
  })

  // Handle user status
  socket.on(SocketEvent.USER_OFFLINE, ({ socketId }) => {
    userSocketMap = userSocketMap.map((user) => {
      if (user.socketId === socketId) {
        return { ...user, status: USER_CONNECTION_STATUS.OFFLINE }
      }
      return user
    })
    const roomId = getRoomId(socketId)
    if (!roomId) return
    socket.broadcast.to(roomId).emit(SocketEvent.USER_OFFLINE, { socketId })
  })

  socket.on(SocketEvent.USER_ONLINE, ({ socketId }) => {
    userSocketMap = userSocketMap.map((user) => {
      if (user.socketId === socketId) {
        return { ...user, status: USER_CONNECTION_STATUS.ONLINE }
      }
      return user
    })
    const roomId = getRoomId(socketId)
    if (!roomId) return
    socket.broadcast.to(roomId).emit(SocketEvent.USER_ONLINE, { socketId })
  })

  // Handle chat actions
  socket.on(SocketEvent.SEND_MESSAGE, ({ message }) => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    socket.broadcast
      .to(roomId)
      .emit(SocketEvent.RECEIVE_MESSAGE, { message })
  })

  // Handle cursor position
  socket.on(SocketEvent.TYPING_START, ({ cursorPosition }) => {
    userSocketMap = userSocketMap.map((user) => {
      if (user.socketId === socket.id) {
        return { ...user, typing: true, cursorPosition }
      }
      return user
    })
    const user = getUserBySocketId(socket.id)
    if (!user) return
    const roomId = user.roomId
    socket.broadcast.to(roomId).emit(SocketEvent.TYPING_START, { user })
  })

  socket.on(SocketEvent.TYPING_PAUSE, () => {
    userSocketMap = userSocketMap.map((user) => {
      if (user.socketId === socket.id) {
        return { ...user, typing: false }
      }
      return user
    })
    const user = getUserBySocketId(socket.id)
    if (!user) return
    const roomId = user.roomId
    socket.broadcast.to(roomId).emit(SocketEvent.TYPING_PAUSE, { user })
  })

  socket.on(SocketEvent.REQUEST_DRAWING, () => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    socket.broadcast
      .to(roomId)
      .emit(SocketEvent.REQUEST_DRAWING, { socketId: socket.id })
  })

  socket.on(SocketEvent.SYNC_DRAWING, ({ drawingData, socketId }) => {
    socket.broadcast
      .to(socketId)
      .emit(SocketEvent.SYNC_DRAWING, { drawingData })
  })

  socket.on(SocketEvent.DRAWING_UPDATE, ({ snapshot }) => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    socket.broadcast.to(roomId).emit(SocketEvent.DRAWING_UPDATE, {
      snapshot,
    })
  })

  // Handle video call signaling
  socket.on('video-call-signal', (data) => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    
    // Handle team video call events
    switch (data.type) {
      case 'team-video-call-start':
        startVideoCall(roomId, data.username)
        break
      case 'team-video-call-join':
        joinVideoCall(roomId, data.username)
        break
      case 'team-video-call-leave':
        leaveVideoCall(roomId, data.username)
        break
      case 'team-video-call-end':
        endVideoCall(roomId)
        break
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        // Handle WebRTC signaling - send to specific user
        const targetSocketId = data.socketId
        if (targetSocketId && targetSocketId !== socket.id) {
          io.to(targetSocketId).emit('video-call-signal', {
            ...data,
            socketId: socket.id
          })
        }
        break
      default:
        // Fallback: broadcast to room
        socket.broadcast.to(roomId).emit('video-call-signal', {
          ...data,
          socketId: socket.id
        })
    }
  })

  // Handle chat messages
  socket.on('chat-message', (data) => {
    const roomId = getRoomId(socket.id)
    if (!roomId) return
    
    // Broadcast chat message to all users in the room
    socket.broadcast.to(roomId).emit('chat-message', {
      username: data.username,
      message: data.message,
      timestamp: data.timestamp
    })
  })
})

const PORT = process.env.PORT || 3001

app.get("/", (req: Request, res: Response) => {
  // Send the index.html file
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
  
  // Cleanup stale users every 30 seconds
  setInterval(cleanupStaleUsers, 30000)
})
