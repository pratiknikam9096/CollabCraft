import { createContext, useContext, useCallback, useRef, useState, useEffect, ReactNode } from "react";
import { useSocket } from "./SocketContext";
import { useAppContext } from "./AppContext";
import toast from "react-hot-toast";

type ChatMessage = {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  isLocal: boolean;
};

type ChatContextType = {
  messages: ChatMessage[];
  sendMessage: (message: string) => void;
  clearMessages: () => void;
  isChatOpen: boolean;
  toggleChat: () => void;
};

const ChatContext = createContext<ChatContextType | null>(null);

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within provider");
  return context;
};

type Props = { children: ReactNode };

const ChatContextProvider = ({ children }: Props) => {
  const { socket } = useSocket();
  const { currentUser } = useAppContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const sendMessage = useCallback((message: string) => {
    if (!message.trim()) return;

    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      username: currentUser.username,
      message: message.trim(),
      timestamp: new Date(),
      isLocal: true
    };

    // Add local message immediately
    setMessages(prev => [...prev, chatMessage]);

    // Send to server
    socket.emit("chat-message", {
      username: currentUser.username,
      message: message.trim(),
      roomId: currentUser.roomId,
      timestamp: chatMessage.timestamp
    });
  }, [socket, currentUser.username, currentUser.roomId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const toggleChat = useCallback(() => {
    setIsChatOpen(prev => !prev);
  }, []);

  useEffect(() => {
    const handleChatMessage = (data: { username: string; message: string; timestamp: string }) => {
      // Don't add our own messages twice
      if (data.username === currentUser.username) return;

      const chatMessage: ChatMessage = {
        id: Date.now().toString(),
        username: data.username,
        message: data.message,
        timestamp: new Date(data.timestamp),
        isLocal: false
      };

      setMessages(prev => [...prev, chatMessage]);
      
      // Show toast for new messages if chat is closed
      if (!isChatOpen) {
        toast.success(`New message from ${data.username}`);
      }
    };

    socket.on("chat-message", handleChatMessage);
    return () => {
      socket.off("chat-message", handleChatMessage);
    };
  }, [socket, currentUser.username, isChatOpen]);

  return (
    <ChatContext.Provider value={{
      messages,
      sendMessage,
      clearMessages,
      isChatOpen,
      toggleChat
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContextProvider;
