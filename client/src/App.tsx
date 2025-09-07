import { Route, BrowserRouter as Router, Routes, useLocation } from "react-router-dom";
import Toast from "./components/toast/Toast";
import EditorPage from "./pages/EditorPage";
import HomePage from "./pages/HomePage";
import NotFound from "./pages/NotFound";
import VideoCallOverlay from "./components/video/VideoCallOverlay";

const AppContent = () => {
    const location = useLocation();
    // Show overlay only on /editor/:roomId
    const isEditorRoom = location.pathname.startsWith("/editor/");

    return (
        <>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/editor/:roomId" element={<EditorPage />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
            {isEditorRoom && <VideoCallOverlay onClose={() => {}} />}
            <Toast />
        </>
    );
};

const App = () => (
    <Router basename="/">
        <AppContent />
    </Router>
);

export default App;