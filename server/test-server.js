const io = require('socket.io-client');

// Test server functionality
async function testServer() {
  console.log('Testing server functionality...');
  
  const socket = io('http://localhost:3001', {
    auth: {
      roomId: 'test-room',
      username: 'test-user'
    }
  });

  socket.on('connect', () => {
    console.log('✅ Connected to server');
    
    // Test join request
    socket.emit('join-request', {
      roomId: 'test-room',
      username: 'test-user'
    });
  });

  socket.on('join-accepted', (data) => {
    console.log('✅ Join accepted:', data);
    
    // Test video call start
    socket.emit('video-call-signal', {
      type: 'team-video-call-start',
      socketId: socket.id,
      data: {
        username: 'test-user',
        roomId: 'test-room'
      }
    });
  });

  socket.on('video-call-status', (data) => {
    console.log('✅ Video call status received:', data);
  });

  socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
  });

  socket.on('connect_error', (error) => {
    console.log('❌ Connection error:', error.message);
  });

  // Cleanup after 5 seconds
  setTimeout(() => {
    socket.disconnect();
    process.exit(0);
  }, 5000);
}

// Run test if this file is executed directly
if (require.main === module) {
  testServer().catch(console.error);
}

module.exports = { testServer };

