import { Route, BrowserRouter as Router, Routes } from "react-router-dom"
// import GitHubCorner from "./components/GitHubCorner"
import Toast from "./components/toast/Toast"
import EditorPage from "./pages/EditorPage"
import HomePage from "./pages/HomePage"
import NotFound from "./pages/NotFound"

const App = () => {
    return (
        <>
            <Router basename="/">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/editor/:roomId" element={<EditorPage />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Router>
            <Toast /> {/* Toast component from react-hot-toast */}
        </>
    )
}
export default App
