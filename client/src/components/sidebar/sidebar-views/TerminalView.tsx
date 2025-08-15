import useResponsive from "@/hooks/useResponsive"
import { useEffect, useRef, useState } from "react"

function TerminalView() {
    const { viewHeight } = useResponsive()
    const [socket, setSocket] = useState<WebSocket | null>(null)
    const [term, setTerm] = useState<any>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const backendWsUrl = useRef(() => {
        const backendHttp = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001"
        const url = new URL(backendHttp)
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
        url.pathname = "/terminal"
        url.searchParams.set("token", import.meta.env.VITE_TERMINAL_API_KEY || "dev-terminal-key")
        return url.toString()
    }).current

    const initTerminal = async () => {
        if (!containerRef.current || term) return
        
        try {
            const [{ Terminal }, { FitAddon }] = await Promise.all([
                import("xterm"),
                import("xterm-addon-fit"),
            ])

            const instance = new Terminal({
                cursorBlink: true,
                fontSize: 14,
                theme: { 
                    background: "#1e1e1e",
                    foreground: "#ffffff",
                    cursor: "#ffffff"
                },
                cols: 80,
                rows: 24,
            })
            
            const fit = new FitAddon()
            instance.loadAddon(fit)
            instance.open(containerRef.current)
            fit.fit()

            const ws = new WebSocket(backendWsUrl())
            ws.binaryType = "arraybuffer"
            
            ws.onopen = () => {
                instance.focus()
                const dims = { cols: instance.cols, rows: instance.rows }
                ws.send(JSON.stringify({ type: "resize", ...dims }))
            }
            
            ws.onmessage = (ev) => {
                const data = typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data)
                instance.write(data)
            }
            
            ws.onclose = () => {
                instance.write("\r\n\x1b[31m[Disconnected]\x1b[0m\r\n")
            }

            instance.onData((data: string) => {
                if (ws.readyState === ws.OPEN) {
                    ws.send(data)
                }
            })

            const handleResize = () => {
                try {
                    fit.fit()
                    if (ws.readyState === ws.OPEN) {
                        ws.send(JSON.stringify({ 
                            type: "resize", 
                            cols: instance.cols, 
                            rows: instance.rows 
                        }))
                    }
                } catch (e) {
                    console.error("Resize error:", e)
                }
            }
            
            window.addEventListener("resize", handleResize)

            setTerm(instance)
            setSocket(ws)

        } catch (error) {
            console.error("Failed to initialize terminal:", error)
        }
    }

    useEffect(() => {
        initTerminal()

        return () => {
            if (socket) {
                try { socket.close() } catch {}
            }
            if (term) {
                try { term.dispose() } catch {}
            }
            window.removeEventListener("resize", () => {})
        }
    }, [])

    return (
        <div className="w-full h-full flex flex-col">
            <div className="text-white text-sm mb-2 px-2">
                Terminal - Connected to project directory
            </div>
            <div
                ref={containerRef}
                className="flex-1 w-full rounded-md bg-darkHover p-2"
                style={{ height: viewHeight - 100 }}
            />
        </div>
    )
}

export default TerminalView

