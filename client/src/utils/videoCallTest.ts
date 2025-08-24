/**
 * Video Call Test Utility
 * This utility helps diagnose and test WebRTC video call functionality
 */

export class VideoCallTester {
  private static instance: VideoCallTester;
  private testResults: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): VideoCallTester {
    if (!VideoCallTester.instance) {
      VideoCallTester.instance = new VideoCallTester();
    }
    return VideoCallTester.instance;
  }

  /**
   * Test WebRTC connectivity and STUN servers
   */
  async testWebRTCConnectivity(): Promise<{
    success: boolean;
    stunServers: Array<{ server: string; reachable: boolean }>;
    iceGatheringState: string;
    connectionState: string;
    error?: string;
  }> {
    const stunServers = [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
      "stun:stun2.l.google.com:19302",
      "stun:stun3.l.google.com:19302",
      "stun:stun4.l.google.com:19302"
    ];

    const results: Array<{ server: string; reachable: boolean }> = [];
    
    try {
      // Test each STUN server
      for (const server of stunServers) {
        try {
          const pc = new RTCPeerConnection({ iceServers: [{ urls: server }] });
          
          // Create a data channel to trigger ICE gathering
          pc.createDataChannel("test");
          
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          // Wait for ICE gathering to complete
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              pc.close();
              resolve();
            }, 5000);
            
            pc.onicegatheringstatechange = () => {
              if (pc.iceGatheringState === "complete") {
                clearTimeout(timeout);
                pc.close();
                resolve();
              }
            };
            
            pc.onicecandidateerror = (error) => {
              console.error(`STUN server ${server} error:`, error);
              clearTimeout(timeout);
              pc.close();
              reject(error);
            };
          });
          
          results.push({ server, reachable: true });
        } catch (error) {
          console.error(`STUN server ${server} test failed:`, error);
          results.push({ server, reachable: false });
        }
      }

      // Test full WebRTC connection
      const pc1 = new RTCPeerConnection({ iceServers: [{ urls: stunServers }] });
      const pc2 = new RTCPeerConnection({ iceServers: [{ urls: stunServers }] });

      pc1.onicecandidate = (event) => {
        if (event.candidate) {
          pc2.addIceCandidate(event.candidate);
        }
      };

      pc2.onicecandidate = (event) => {
        if (event.candidate) {
          pc1.addIceCandidate(event.candidate);
        }
      };

      // Create a data channel for testing
      const dc = pc1.createDataChannel("test");
      dc.onopen = () => {
        dc.send("test message");
      };

      pc2.ondatachannel = (event) => {
        event.channel.onmessage = (e) => {
          console.log("Received message:", e.data);
        };
      };

      const offer = await pc1.createOffer();
      await pc1.setLocalDescription(offer);
      await pc2.setRemoteDescription(offer);

      const answer = await pc2.createAnswer();
      await pc2.setLocalDescription(answer);
      await pc1.setRemoteDescription(answer);

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          pc1.close();
          pc2.close();
          reject(new Error("Connection timeout"));
        }, 10000);

        pc1.onconnectionstatechange = () => {
          if (pc1.connectionState === "connected") {
            clearTimeout(timeout);
            pc1.close();
            pc2.close();
            resolve();
          }
        };
      });

      return {
        success: true,
        stunServers: results,
        iceGatheringState: pc1.iceGatheringState,
        connectionState: pc1.connectionState
      };

    } catch (error) {
      return {
        success: false,
        stunServers: results,
        iceGatheringState: "failed",
        connectionState: "failed",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Test media devices availability
   */
  async testMediaDevices(): Promise<{
    videoInputs: MediaDeviceInfo[];
    audioInputs: MediaDeviceInfo[];
    audioOutputs: MediaDeviceInfo[];
    hasPermissions: boolean;
  }> {
    try {
      // Check if we can enumerate devices (indicates permission status)
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const videoInputs = devices.filter(d => d.kind === "videoinput");
      const audioInputs = devices.filter(d => d.kind === "audioinput");
      const audioOutputs = devices.filter(d => d.kind === "audiooutput");
      
      // Try to access media to check permissions
      let hasPermissions = false;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        stream.getTracks().forEach(track => track.stop());
        hasPermissions = true;
      } catch (error) {
        hasPermissions = false;
      }

      return {
        videoInputs,
        audioInputs,
        audioOutputs,
        hasPermissions
      };
    } catch (error) {
      console.error("Media devices test failed:", error);
      return {
        videoInputs: [],
        audioInputs: [],
        audioOutputs: [],
        hasPermissions: false
      };
    }
  }

  /**
   * Test WebRTC stream quality
   */
  async testStreamQuality(): Promise<{
    videoBitrate: number;
    audioBitrate: number;
    frameRate: number;
    resolution: { width: number; height: number };
    latency: number;
  }> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      // Create a peer connection to test stream transmission
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });

      if (videoTrack) pc.addTrack(videoTrack, stream);
      if (audioTrack) pc.addTrack(audioTrack, stream);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE candidates
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 2000);
      });

      const stats = await pc.getStats();
      let videoBitrate = 0;
      let audioBitrate = 0;
      let frameRate = 0;
      let resolution = { width: 0, height: 0 };

      stats.forEach(report => {
        if (report.type === "outbound-rtp") {
          if (report.mediaType === "video") {
            videoBitrate = report.bytesSent * 8 / 1000; // kbps
            frameRate = report.framesPerSecond || 0;
          } else if (report.mediaType === "audio") {
            audioBitrate = report.bytesSent * 8 / 1000; // kbps
          }
        }
      });

      // Get video constraints
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        resolution = {
          width: settings.width || 0,
          height: settings.height || 0
        };
      }

      pc.close();
      stream.getTracks().forEach(track => track.stop());

      return {
        videoBitrate,
        audioBitrate,
        frameRate,
        resolution,
        latency: 0 // Latency measurement would require more complex setup
      };

    } catch (error) {
      console.error("Stream quality test failed:", error);
      return {
        videoBitrate: 0,
        audioBitrate: 0,
        frameRate: 0,
        resolution: { width: 0, height: 0 },
        latency: 0
      };
    }
  }

  /**
   * Run comprehensive video call test
   */
  async runComprehensiveTest(): Promise<{
    timestamp: string;
    mediaDevices: any;
    webrtcConnectivity: any;
    streamQuality: any;
    overallStatus: "excellent" | "good" | "fair" | "poor" | "failed";
    recommendations: string[];
  }> {
    const timestamp = new Date().toISOString();
    const recommendations: string[] = [];

    console.log("🧪 Starting comprehensive video call test...");

    // Test 1: Media Devices
    console.log("1. Testing media devices...");
    const mediaDevices = await this.testMediaDevices();
    this.testResults.set("mediaDevices", mediaDevices);

    if (!mediaDevices.hasPermissions) {
      recommendations.push("Grant camera and microphone permissions to your browser");
    }
    if (mediaDevices.videoInputs.length === 0) {
      recommendations.push("No video input devices found. Check your camera connection");
    }
    if (mediaDevices.audioInputs.length === 0) {
      recommendations.push("No audio input devices found. Check your microphone connection");
    }

    // Test 2: WebRTC Connectivity
    console.log("2. Testing WebRTC connectivity...");
    const webrtcConnectivity = await this.testWebRTCConnectivity();
    this.testResults.set("webrtcConnectivity", webrtcConnectivity);

    if (!webrtcConnectivity.success) {
      recommendations.push("WebRTC connectivity test failed. Check your network connection");
    }

    const unreachableStunServers = webrtcConnectivity.stunServers.filter(s => !s.reachable);
    if (unreachableStunServers.length > 0) {
      recommendations.push(`Some STUN servers are unreachable: ${unreachableStunServers.map(s => s.server).join(", ")}`);
    }

    // Test 3: Stream Quality
    console.log("3. Testing stream quality...");
    const streamQuality = await this.testStreamQuality();
    this.testResults.set("streamQuality", streamQuality);

    if (streamQuality.videoBitrate < 500) {
      recommendations.push("Video bitrate is low. Check your network bandwidth");
    }
    if (streamQuality.frameRate < 15) {
      recommendations.push("Frame rate is low. Try reducing video resolution");
    }

    // Determine overall status
    let overallStatus: "excellent" | "good" | "fair" | "poor" | "failed" = "excellent";

    if (!mediaDevices.hasPermissions || !webrtcConnectivity.success) {
      overallStatus = "failed";
    } else if (recommendations.length > 0) {
      overallStatus = "fair";
    } else if (streamQuality.videoBitrate < 1000 || streamQuality.frameRate < 20) {
      overallStatus = "good";
    }

    console.log("✅ Comprehensive test completed");
    console.log("Overall status:", overallStatus);
    console.log("Recommendations:", recommendations);

    return {
      timestamp,
      mediaDevices,
      webrtcConnectivity,
      streamQuality,
      overallStatus,
      recommendations
    };
  }

  /**
   * Get test results
   */
  getResults(): Map<string, any> {
    return this.testResults;
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.testResults.clear();
  }

  /**
   * Generate test report
   */
  generateReport(): string {
    const results = Array.from(this.testResults.entries());
    let report = "Video Call Test Report\n";
    report += "=====================\n\n";

    results.forEach(([testName, result]) => {
      report += `${testName}:\n`;
      report += JSON.stringify(result, null, 2) + "\n\n";
    });

    return report;
  }
}

// Export singleton instance
export const videoCallTester = VideoCallTester.getInstance();

// Utility function to quickly run basic tests
export async function quickVideoCallTest() {
  const tester = VideoCallTester.getInstance();
  
  console.log("🚀 Running quick video call test...");
  
  const mediaDevices = await tester.testMediaDevices();
  console.log("Media Devices:", mediaDevices);
  
  const connectivity = await tester.testWebRTCConnectivity();
  console.log("WebRTC Connectivity:", connectivity);
  
  return { mediaDevices, connectivity };
}
