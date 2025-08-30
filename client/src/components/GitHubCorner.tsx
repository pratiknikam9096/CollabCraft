import { VIEWS } from "@/types/view"
import { useViews } from "@/context/ViewContext"
import { useRunCode } from "@/context/RunCodeContext"

function GitHubCorner() {
  const { viewIcons, setCurrentView } = useViews() // get setter for sidebar view
  const runCtx = useRunCode()

  const handleRunClick = () => {
    setCurrentView(VIEWS.RUN)  // open sidebar to RUN tab
    runCtx.runCode()           // then run code
  }

  return (
    <div className="fixed right-0 top-0 z-10 flex items-start gap-2">
      <button
        onClick={handleRunClick}
        className="p-2 rounded-full hover:bg-gray-200 transition"
      >
        {viewIcons[VIEWS.RUN]}
      </button>
    </div>
  )
}

export default GitHubCorner
