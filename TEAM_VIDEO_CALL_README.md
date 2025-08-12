# Team Video Call Feature

## Overview

The Team Video Call feature allows all team members in a collaborative room to participate in video calls with adjustable, resizable video frames. This feature is designed for team collaboration and supports multiple participants with advanced controls.

## Features

### 🎥 Multi-Participant Support
- **Team-based calls**: All members in the same room can join the video call
- **Dynamic participant management**: Automatically detects and displays all team members
- **Real-time updates**: Shows when participants join, leave, or change status

### 🖼️ Adjustable Video Frames
- **Grid Layout**: Automatically adjusts grid size based on number of participants
- **Spotlight Layout**: Focus on one participant with others in sidebar
- **Responsive Design**: Adapts to different screen sizes and orientations
- **Hover Effects**: Interactive video frames with status indicators

### 🎛️ Advanced Controls
- **Video Toggle**: Enable/disable camera for privacy
- **Audio Toggle**: Mute/unmute microphone
- **Screen Sharing**: Share your screen with team members
- **Layout Switching**: Toggle between grid and spotlight views
- **Fullscreen Mode**: Immersive video call experience

### 📱 User Experience
- **Minimized State**: Collapse to compact view while keeping call active
- **Status Indicators**: Visual feedback for audio/video/screen sharing status
- **Participant Info**: Shows usernames and connection status
- **Responsive Controls**: Touch-friendly interface for mobile devices

## How to Use

### Starting a Team Video Call

1. **Join a Room**: Make sure you're in a collaborative room with other team members
2. **Click Video Call Button**: Located in the top-right corner of the interface
3. **Start Call**: Click "Start Team Call" to initiate the video call
4. **Grant Permissions**: Allow camera and microphone access when prompted

### Joining an Existing Call

1. **See Active Call**: If a team member has already started a call, you'll see the option to join
2. **Click Join**: Click "Join Existing Call" to participate
3. **Grant Permissions**: Allow camera and microphone access

### During the Call

#### Video Controls
- **Camera Toggle**: Click the camera icon to turn video on/off
- **Microphone Toggle**: Click the microphone icon to mute/unmute
- **Screen Share**: Click the display icon to share your screen
- **Layout Switch**: Toggle between grid and spotlight views

#### Video Frame Management
- **Spotlight Mode**: Click the expand icon on any video frame to spotlight that participant
- **Grid Mode**: Automatically adjusts layout based on participant count
- **Hover Effects**: Hover over video frames to see additional controls

#### Call Management
- **Leave Call**: Click the yellow phone icon to leave without ending the call for others
- **End Call**: Click the red X icon to end the call for everyone
- **Minimize**: Click the close icon to minimize the interface

### Ending the Call

- **Leave Call**: Only you leave, others continue
- **End Call**: Terminates the call for all participants

## Technical Implementation

### Architecture
- **WebRTC**: Peer-to-peer video/audio streaming
- **Socket.IO**: Real-time signaling and room management
- **React Context**: State management for video call data
- **Responsive CSS**: Adaptive layouts for different screen sizes

### Components
- `VideoCallContext`: Manages video call state and WebRTC connections
- `VideoCallInterface`: Main video call interface with controls
- `VideoCallButton`: Entry point for starting/joining calls
- `VideoCallManager`: Orchestrates the complete video call experience

### Data Flow
1. User initiates video call
2. Context requests media permissions
3. WebRTC peer connections established
4. Video streams shared between participants
5. Real-time updates via Socket.IO

## Browser Compatibility

### Supported Browsers
- **Chrome**: 60+ (Full support)
- **Firefox**: 55+ (Full support)
- **Safari**: 11+ (Full support)
- **Edge**: 79+ (Full support)

### Required Features
- **getUserMedia API**: Camera and microphone access
- **getDisplayMedia API**: Screen sharing (Chrome 72+, Firefox 66+)
- **WebRTC**: Peer-to-peer connections
- **ES6+**: Modern JavaScript features

## Security & Privacy

### Media Permissions
- Camera and microphone access requires explicit user consent
- Permissions are requested only when starting/joining calls
- Users can revoke permissions at any time through browser settings

### Data Privacy
- Video/audio streams are peer-to-peer (not stored on servers)
- Signaling data is encrypted in transit
- No recording or storage of video content

### Room Security
- Video calls are limited to members of the same room
- Room IDs are required for participation
- No cross-room video communication

## Troubleshooting

### Common Issues

#### Camera/Microphone Not Working
- **Check permissions**: Ensure browser has access to camera/microphone
- **Check device**: Verify camera and microphone are not in use by other applications
- **Browser restart**: Try refreshing the page or restarting the browser

#### Video Call Won't Start
- **Check team members**: Ensure you have at least one other team member in the room
- **Check connection**: Verify stable internet connection
- **Check browser**: Ensure using a supported browser version

#### Poor Video Quality
- **Check bandwidth**: Ensure stable internet connection
- **Check device**: Verify camera quality and settings
- **Reduce participants**: Large groups may affect quality

#### Screen Sharing Issues
- **Browser support**: Ensure using Chrome 72+ or Firefox 66+
- **Permissions**: Grant screen sharing permissions when prompted
- **Application focus**: Ensure the application is in focus when sharing

### Performance Tips
- **Close unnecessary tabs**: Free up system resources
- **Use wired connection**: Ethernet provides more stable connection than WiFi
- **Limit background apps**: Close resource-intensive applications
- **Update browser**: Use the latest browser version for best performance

## Future Enhancements

### Planned Features
- **Recording**: Option to record video calls (with consent)
- **Background Blur**: AI-powered background blur for privacy
- **Virtual Backgrounds**: Custom background images
- **Breakout Rooms**: Split large calls into smaller groups
- **Chat Integration**: In-call text messaging
- **File Sharing**: Share files during video calls

### Technical Improvements
- **Adaptive Bitrate**: Dynamic quality adjustment based on connection
- **Fallback Modes**: Audio-only mode for poor connections
- **Mobile Optimization**: Enhanced mobile experience
- **Accessibility**: Improved screen reader support

## Support

### Getting Help
- **Documentation**: Check this README for usage instructions
- **Issues**: Report bugs through the project's issue tracker
- **Community**: Join the project's community channels

### Contributing
- **Code**: Submit pull requests for improvements
- **Testing**: Help test on different devices and browsers
- **Documentation**: Improve documentation and user guides

---

**Note**: This feature requires modern browsers with WebRTC support. Ensure all team members have compatible browsers and stable internet connections for the best experience.
