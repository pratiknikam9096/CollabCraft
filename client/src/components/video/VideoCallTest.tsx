import { useState } from "react";
import { videoCallTester, quickVideoCallTest } from "@/utils/videoCallTest";
import { BsCheckCircle, BsExclamationTriangle, BsXCircle, BsGear, BsPlay } from "react-icons/bs";
import cn from "classnames";

interface VideoCallTestProps {
  onClose?: () => void;
}

function VideoCallTest({ onClose }: VideoCallTestProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "details" | "recommendations">("summary");

  const runComprehensiveTest = async () => {
    setIsTesting(true);
    try {
      const results = await videoCallTester.runComprehensiveTest();
      setTestResults(results);
    } catch (error) {
      console.error("Test failed:", error);
      setTestResults({
        overallStatus: "failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const runQuickTest = async () => {
    setIsTesting(true);
    try {
      const results = await quickVideoCallTest();
      setTestResults({
        overallStatus: "good",
        mediaDevices: results.mediaDevices,
        webrtcConnectivity: results.connectivity,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Quick test failed:", error);
      setTestResults({
        overallStatus: "failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "excellent":
        return <BsCheckCircle className="text-green-500" size={20} />;
      case "good":
        return <BsCheckCircle className="text-blue-500" size={20} />;
      case "fair":
        return <BsExclamationTriangle className="text-yellow-500" size={20} />;
      case "poor":
        return <BsExclamationTriangle className="text-orange-500" size={20} />;
      case "failed":
        return <BsXCircle className="text-red-500" size={20} />;
      default:
        return <BsGear className="text-gray-500" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent": return "text-green-400 bg-green-400/20";
      case "good": return "text-blue-400 bg-blue-400/20";
      case "fair": return "text-yellow-400 bg-yellow-400/20";
      case "poor": return "text-orange-400 bg-orange-400/20";
      case "failed": return "text-red-400 bg-red-400/20";
      default: return "text-gray-400 bg-gray-400/20";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-dark border border-gray-600 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 border-b border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BsGear className="text-primary" size={24} />
              <h2 className="text-white text-xl font-semibold">Video Call Diagnostics</h2>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <BsXCircle size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {!testResults ? (
            <div className="text-center py-8">
              <BsGear className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-white text-lg font-medium mb-2">Run Video Call Tests</h3>
              <p className="text-gray-400 mb-6">
                Run diagnostic tests to identify issues with video call functionality
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={runQuickTest}
                  disabled={isTesting}
                  className={cn(
                    "px-6 py-3 rounded-lg font-medium transition-all duration-200",
                    isTesting 
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed" 
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  )}
                >
                  {isTesting ? "Testing..." : "Quick Test"}
                </button>
                <button
                  onClick={runComprehensiveTest}
                  disabled={isTesting}
                  className={cn(
                    "px-6 py-3 rounded-lg font-medium transition-all duration-200",
                    isTesting 
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed" 
                      : "bg-primary hover:bg-green-400 text-black"
                  )}
                >
                  {isTesting ? "Testing..." : "Comprehensive Test"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Test Results Header */}
              <div className="flex items-center gap-3 mb-6">
                {getStatusIcon(testResults.overallStatus)}
                <div>
                  <h3 className="text-white font-semibold">Test Results</h3>
                  <p className="text-gray-400 text-sm">
                    Completed at {new Date(testResults.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className={cn("ml-auto px-3 py-1 rounded-full text-sm font-medium", getStatusColor(testResults.overallStatus))}>
                  {testResults.overallStatus.toUpperCase()}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b border-gray-600">
                <button
                  onClick={() => setActiveTab("summary")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                    activeTab === "summary" 
                      ? "border-primary text-primary" 
                      : "border-transparent text-gray-400 hover:text-white"
                  )}
                >
                  Summary
                </button>
                <button
                  onClick={() => setActiveTab("details")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                    activeTab === "details" 
                      ? "border-primary text-primary" 
                      : "border-transparent text-gray-400 hover:text-white"
                  )}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab("recommendations")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                    activeTab === "recommendations" 
                      ? "border-primary text-primary" 
                      : "border-transparent text-gray-400 hover:text-white"
                  )}
                >
                  Recommendations
                </button>
              </div>

              {/* Summary Tab */}
              {activeTab === "summary" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Media Devices */}
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h4 className="text-white font-medium mb-2">Media Devices</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Cameras:</span>
                          <span className={testResults.mediaDevices?.videoInputs?.length > 0 ? "text-green-400" : "text-red-400"}>
                            {testResults.mediaDevices?.videoInputs?.length || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Microphones:</span>
                          <span className={testResults.mediaDevices?.audioInputs?.length > 0 ? "text-green-400" : "text-red-400"}>
                            {testResults.mediaDevices?.audioInputs?.length || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Permissions:</span>
                          <span className={testResults.mediaDevices?.hasPermissions ? "text-green-400" : "text-red-400"}>
                            {testResults.mediaDevices?.hasPermissions ? "Granted" : "Denied"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* WebRTC Connectivity */}
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h4 className="text-white font-medium mb-2">WebRTC Connectivity</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className={testResults.webrtcConnectivity?.success ? "text-green-400" : "text-red-400"}>
                            {testResults.webrtcConnectivity?.success ? "Connected" : "Failed"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">STUN Servers:</span>
                          <span className={
                            testResults.webrtcConnectivity?.stunServers?.filter((s: any) => s.reachable).length > 0 
                              ? "text-green-400" 
                              : "text-red-400"
                          }>
                            {testResults.webrtcConnectivity?.stunServers?.filter((s: any) => s.reachable).length || 0} / {testResults.webrtcConnectivity?.stunServers?.length || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stream Quality (if available) */}
                  {testResults.streamQuality && (
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h4 className="text-white font-medium mb-2">Stream Quality</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Video Bitrate:</span>
                          <span className="text-white ml-2">{testResults.streamQuality.videoBitrate.toFixed(0)} kbps</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Frame Rate:</span>
                          <span className="text-white ml-2">{testResults.streamQuality.frameRate.toFixed(0)} fps</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Resolution:</span>
                          <span className="text-white ml-2">
                            {testResults.streamQuality.resolution.width}x{testResults.streamQuality.resolution.height}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Audio Bitrate:</span>
                          <span className="text-white ml-2">{testResults.streamQuality.audioBitrate.toFixed(0)} kbps</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Details Tab */}
              {activeTab === "details" && (
                <div className="space-y-4">
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="text-white font-medium mb-3">Raw Test Data</h4>
                    <pre className="text-xs text-gray-300 bg-gray-900 p-3 rounded overflow-x-auto">
                      {JSON.stringify(testResults, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Recommendations Tab */}
              {activeTab === "recommendations" && (
                <div className="space-y-3">
                  {testResults.recommendations && testResults.recommendations.length > 0 ? (
                    testResults.recommendations.map((rec: string, index: number) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <BsExclamationTriangle className="text-yellow-500 mt-1 flex-shrink-0" size={16} />
                        <p className="text-yellow-400 text-sm">{rec}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <BsCheckCircle className="mx-auto mb-2 text-green-500" size={24} />
                      <p className="text-green-400">No recommendations. Your setup looks good!</p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-600">
                <button
                  onClick={runComprehensiveTest}
                  className="px-4 py-2 bg-primary hover:bg-green-400 text-black rounded-lg transition-colors"
                >
                  <BsPlay className="inline mr-2" />
                  Run Again
                </button>
                <button
                  onClick={() => setTestResults(null)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                >
                  Back to Tests
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoCallTest;
