import { VIEWS } from "@/types/view"
import SidebarButton from "@/components/sidebar/sidebar-views/SidebarButton"
import { useViews } from "@/context/ViewContext"
import { useRunCode } from "@/context/RunCodeContext"
import React from "react"

function GitHubCorner() {
  const { viewIcons } = useViews()
  const runCtx = useRunCode() // returns RunContext object

  return (
    <div className="fixed right-0 top-0 z-10 flex items-start gap-2">
      {/* GitHub Corner */}
      <SidebarButton viewName={VIEWS.RUN} icon={viewIcons[VIEWS.RUN]} />
      <button onClick={runCtx.runCode}>Run</button>
      {/* or: <button onClick={() => runCtx.run()}>Run</button> */}
    </div>
  )
}

export default GitHubCorner
