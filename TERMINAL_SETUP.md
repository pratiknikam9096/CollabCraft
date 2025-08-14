# Terminal Setup Guide

## Overview
This project now includes a secure web-based terminal that allows you to run real OS commands directly in your browser. The terminal is integrated into the Run view with tabs for both "Run Code" and "Terminal".

## Features
- **Real OS Commands**: Run `npm install`, `cd`, `ls`, `node app.js`, etc.
- **Secure Access**: Protected by API key authentication
- **Real-time Streaming**: Live output from your commands
- **Responsive Design**: Automatically adjusts to browser window size
- **Project Directory**: Terminal starts in your project folder

## Setup Instructions

### 1. Install Dependencies

#### Server Dependencies
```bash
cd CollabCraft/server
npm install ws node-pty @types/ws
```

#### Client Dependencies
```bash
cd CollabCraft/client
npm install xterm xterm-addon-fit
```

### 2. Environment Configuration

#### Server (.env file)
Create a `.env` file in the `server` directory:
```env
PORT=3001
TERMINAL_API_KEY=your-secure-terminal-key-here
```

#### Client (.env file)
Create a `.env` file in the `client` directory:
```env
VITE_BACKEND_URL=http://localhost:3001
VITE_TERMINAL_API_KEY=your-secure-terminal-key-here
```

**Important**: Use the same `TERMINAL_API_KEY` value in both files.

### 3. Security Notes
- The terminal API key should be a strong, random string
- Never commit your `.env` files to version control
- In production, use environment variables or secure secret management

### 4. Usage

1. **Access Terminal**: Go to the Run view in the sidebar
2. **Switch Tabs**: Click between "Run Code" and "Terminal" tabs
3. **Run Commands**: Type commands like:
   - `npm install` - Install dependencies
   - `ls` - List files
   - `cd src` - Change directory
   - `node app.js` - Run Node.js applications
   - `git status` - Check git status

### 5. Technical Details

#### Backend (Server)
- Uses `node-pty` to spawn real shell sessions
- WebSocket communication for real-time data
- Platform-specific shell detection (bash on Linux/Mac, PowerShell/CMD on Windows)
- Automatic working directory resolution to project root

#### Frontend (Client)
- `xterm.js` for terminal emulation
- WebSocket connection to backend PTY
- Automatic resize handling
- Lazy loading for optimal bundle size

### 6. Troubleshooting

#### Common Issues
1. **"Module not found" errors**: Ensure all dependencies are installed
2. **Connection refused**: Check if server is running and port is correct
3. **Permission denied**: Ensure the server has permission to spawn processes
4. **Terminal not responsive**: Check browser console for WebSocket errors

#### Platform-Specific Notes
- **Windows**: May require running as administrator for some commands
- **Linux/Mac**: Ensure bash is available in PATH
- **Docker**: May need additional configuration for PTY support

### 7. Production Deployment

When deploying to production:
1. Use strong, unique API keys
2. Consider rate limiting for terminal access
3. Monitor terminal usage for security
4. Use HTTPS/WSS for secure connections
5. Consider IP whitelisting for terminal access

## Architecture

```
Browser (xterm.js) ←→ WebSocket ←→ Node.js Server (node-pty) ←→ OS Shell
```

The terminal provides a secure bridge between your web application and the underlying operating system, allowing you to perform development tasks directly from the browser interface.
