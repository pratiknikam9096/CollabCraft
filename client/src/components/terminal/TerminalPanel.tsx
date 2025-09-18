import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { io, Socket } from 'socket.io-client';

interface TerminalPanelProps {
  socketUrl: string;
  authToken: string; // For authentication, if needed
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({ socketUrl, authToken }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const socket = useRef<Socket | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    term.current = new Terminal({
      cursorBlink: true,
      scrollback: 1000,
      tabStopWidth: 8,
      fontFamily: 'monospace',
      fontSize: 14,
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff',
      },
    });

    fitAddon.current = new FitAddon();
    term.current.loadAddon(fitAddon.current);
    term.current.open(terminalRef.current);
    fitAddon.current.fit();

    // Connect to backend socket with auth token
    socket.current = io(socketUrl, {
      auth: {
        token: authToken,
      },
    });

    socket.current.on('connect', () => {
      console.log('Connected to terminal socket');
    });

    socket.current.on('terminal-output', (data: string) => {
      term.current?.write(data);
    });

    term.current.onData((data: string) => {
      socket.current?.emit('terminal-input', data);
    });

    // Handle terminal resize
    const handleResize = () => {
      fitAddon.current?.fit();
      const cols = term.current?.cols || 80;
      const rows = term.current?.rows || 24;
      socket.current?.emit('terminal-resize', { cols, rows });
    };

    window.addEventListener('resize', handleResize);

    // Initial resize emit
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.current?.disconnect();
      term.current?.dispose();
    };
  }, [socketUrl, authToken]);

  return <div ref={terminalRef} style={{ width: '100%', height: '100%', backgroundColor: '#1e1e1e' }} />;
};

export default TerminalPanel;
