import { VIEWS } from "@/types/view"
import { useViews } from "@/context/ViewContext"
import { useRunCode } from "@/context/RunCodeContext"

function GitHubCorner() {
  const { viewIcons } = useViews()
  const runCtx = useRunCode()

  return (
    <div className="fixed right-0 top-0 z-10 flex items-start gap-2">
      {/* Just icon, clickable */}
      <button
        onClick={runCtx.runCode}
        className="p-2 rounded-full hover:bg-gray-200 transition"
      >
        {viewIcons[VIEWS.RUN]}
      </button>
    </div>
  )
}

export default GitHubCorner
