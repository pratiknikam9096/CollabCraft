import { useAppContext } from "@/context/AppContext";
import { useSocket } from "@/context/SocketContext";
import { SocketEvent } from "@/types/socket";
import { USER_STATUS } from "@/types/user";
import { ChangeEvent, FormEvent, useEffect, useRef, useCallback, useState } from "react";
import { toast } from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

const FormComponent = () => {
  const location = useLocation();
  const { currentUser, setCurrentUser, status, setStatus, clearUserData } = useAppContext();
  const { socket } = useSocket();

  const usernameRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  /** Run once on mount to clear stale data */
  useEffect(() => {
    clearUserData();
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/check-auth', {
          credentials: 'include'
        });
        if (response.ok) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        // Not authenticated
      }
    };
    checkAuth();
  }, []); // empty dependency = runs only once

  /** Prefill Room ID from location state, without overwriting user typing later */
  useEffect(() => {
    if (location.state?.roomId) {
      setCurrentUser({
        ...currentUser,
        roomId: location.state.roomId
      });
      if (!currentUser.username) {
        toast.success("Enter your username");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.roomId]); // only run if navigation passed a roomId

  /** Create Unique Room ID */
  const createNewRoomId = useCallback(() => {
    setCurrentUser({
      ...currentUser,
      roomId: uuidv4()
    });
    toast.success("Created a new Room Id");
    usernameRef.current?.focus();
  }, [currentUser, setCurrentUser]);

  /** Handle Input Changes */
  const handleInputChanges = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentUser({
      ...currentUser,
      [name]: value
    });
  }, [currentUser, setCurrentUser]);

  /** Handle Auth Input Changes */
  const handleAuthInputChanges = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'email') setEmail(value);
    if (name === 'password') setPassword(value);
  }, []);

  /** Authenticate User */
  const authenticateUser = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email and password required");
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, username: currentUser.username || email.split('@')[0] })
      });

      const data = await response.json();
      if (response.ok) {
        setIsAuthenticated(true);
        toast.success(`${authMode === 'login' ? 'Logged in' : 'Signed up'} successfully`);
      } else {
        toast.error(data.error || 'Authentication failed');
      }
    } catch (error) {
      toast.error('Authentication failed');
    }
  }, [email, password, authMode, currentUser.username]);

  /** Validate form before join */
  const validateForm = useCallback(() => {
    const username = currentUser.username.trim();
    const roomId = currentUser.roomId.trim();

    if (!username) {
      toast.error("Enter your username");
      return false;
    }
    if (!roomId) {
      toast.error("Enter a room id");
      return false;
    }
    if (roomId.length < 5) {
      toast.error("Room ID must be at least 5 characters long");
      return false;
    }
    if (username.length < 3) {
      toast.error("Username must be at least 3 characters long");
      return false;
    }
    return true;
  }, [currentUser.username, currentUser.roomId]);

  /** Join Room Submission */
  const joinRoom = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAuthenticated) {
      authenticateUser(e);
      return;
    }
    if (status === USER_STATUS.ATTEMPTING_JOIN) return;
    if (!validateForm()) return;

    const username = currentUser.username.trim();
    const roomId = currentUser.roomId.trim();

    // if (!socket.connected) {
    //   socket.connect();
    //   toast.error("Socket not connected. Reconnecting...");
    //   return;
    // }

    toast.loading("Joining room...");
    setStatus(USER_STATUS.ATTEMPTING_JOIN);
    socket.emit(SocketEvent.JOIN_REQUEST, { username, roomId });
  }, [isAuthenticated, authenticateUser, status, validateForm, currentUser.username, currentUser.roomId, setStatus, socket]);

  /** Navigate after joining */
  useEffect(() => {
    if (status === USER_STATUS.JOINED && currentUser.username && currentUser.roomId) {
      navigate(`/editor/${currentUser.roomId}`, {
        state: { username: currentUser.username },
        replace: true
      });
    }
  }, [status, currentUser.username, currentUser.roomId, navigate]);

  /** Monitor socket connection */
  useEffect(() => {
    const handleConnect = () => console.log("Socket connected:", socket.id);
    const handleDisconnect = () => console.log("Socket disconnected");
    const handleError = (err: any) => console.error("Socket error:", err);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleError);
    };
  }, [socket]);

  return (
    <div className="w-full">
      {!isAuthenticated ? (
        <form onSubmit={authenticateUser} className="flex w-full flex-col gap-6">
          <div className="flex gap-2">
            <button
              type="button"
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium ${authMode === 'login' ? 'bg-primary text-black' : 'bg-gray-600 text-white'}`}
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium ${authMode === 'signup' ? 'bg-primary text-black' : 'bg-gray-600 text-white'}`}
              onClick={() => setAuthMode('signup')}
            >
              Sign Up
            </button>
          </div>
          <input
            type="email"
            name="email"
            placeholder="Email"
            autoComplete="email"
            className="w-full rounded-lg border border-gray-600 bg-darkHover/80 px-4 py-4 text-white placeholder-gray-400 backdrop-blur-sm focus:border-primary focus:bg-darkHover focus:outline-none focus:ring-2 focus:ring-primary/20"
            onChange={handleAuthInputChanges}
            value={email}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-gray-600 bg-darkHover/80 px-4 py-4 text-white placeholder-gray-400 backdrop-blur-sm focus:border-primary focus:bg-darkHover focus:outline-none focus:ring-2 focus:ring-primary/20"
            onChange={handleAuthInputChanges}
            value={password}
          />
          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-gradient-to-r from-primary to-green-400 px-8 py-4 text-lg font-bold text-black transition-all hover:from-green-400 hover:to-primary"
          >
            {authMode === 'login' ? 'Login' : 'Sign Up'}
          </button>
        </form>
      ) : (
        <form onSubmit={joinRoom} className="flex w-full flex-col gap-6">
          <input
            type="text"
            name="roomId"
            placeholder="Room Id"
            autoComplete="off"
            spellCheck="false"
            className="w-full rounded-lg border border-gray-600 bg-darkHover/80 px-4 py-4 text-white placeholder-gray-400 backdrop-blur-sm focus:border-primary focus:bg-darkHover focus:outline-none focus:ring-2 focus:ring-primary/20"
            onChange={handleInputChanges}
            value={currentUser.roomId}
          />
          <input
            type="text"
            name="username"
            placeholder="Username"
            autoComplete="off"
            spellCheck="false"
            className="w-full rounded-lg border border-gray-600 bg-darkHover/80 px-4 py-4 text-white placeholder-gray-400 backdrop-blur-sm focus:border-primary focus:bg-darkHover focus:outline-none focus:ring-2 focus:ring-primary/20"
            onChange={handleInputChanges}
            value={currentUser.username}
            ref={usernameRef}
          />
          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-gradient-to-r from-primary to-green-400 px-8 py-4 text-lg font-bold text-black transition-all hover:from-green-400 hover:to-primary"
            disabled={status === USER_STATUS.ATTEMPTING_JOIN}
          >
            {status === USER_STATUS.ATTEMPTING_JOIN ? "Joining..." : "Join Room"}
          </button>
        </form>
      )}

      {isAuthenticated && (
        <button
          className="mt-6 w-full text-sm text-gray-400 underline hover:text-primary"
          onClick={createNewRoomId}
        >
          Generate Unique Room Id
        </button>
      )}
    </div>
  );
};

export default FormComponent;
