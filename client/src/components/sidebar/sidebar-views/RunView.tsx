    import { useRunCode } from "@/context/RunCodeContext"
    import useResponsive from "@/hooks/useResponsive"
    import { ChangeEvent, useMemo, useState } from "react"
    import toast from "react-hot-toast"
    import { LuCopy } from "react-icons/lu"
    import { PiCaretDownBold } from "react-icons/pi"
    import TerminalView from "./TerminalView"

    function RunView() {
        const { viewHeight } = useResponsive()
        const {
            setInput,
            output,
            isRunning,
            supportedLanguages,
            selectedLanguage,
            setSelectedLanguage,
            runCode,
        } = useRunCode()
    const [activeTab, setActiveTab] = useState<"run" | "terminal">("run")
    const headerTitle = useMemo(() => (activeTab === "terminal" ? "Terminal" : "Run"), [activeTab])

        const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
            const lang = JSON.parse(e.target.value)
            setSelectedLanguage(lang)
        }

        const copyOutput = () => {
            navigator.clipboard.writeText(output)
            toast.success("Output copied to clipboard")
        }

        return (
            <div
                className="flex flex-col items-center gap-2 p-4"
                style={{ height: viewHeight }}
            >
                <div className="flex w-full items-center justify-between">
                    <h1 className="view-title">{headerTitle}</h1>
                    <div className="relative text-white  min-w-[160px]">
                        <select
                            aria-label="Select mode"
                            className="w-full appearance-none  rounded-md border-none bg-darkHover px-4 py-1 pr-10 text-white outline-none"
                            value={activeTab}
                            onChange={(e) => setActiveTab(e.target.value as "run" | "terminal")}
                        >
                            <option value="run">Run Code</option>
                            <option value="terminal">Terminal</option>
                        </select>
                        <PiCaretDownBold
                            size={16}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white"
                        />
                    </div>
                </div>
                
                <div className="flex h-[90%] w-full flex-col items-end gap-2 md:h-[92%]">
                    {activeTab === "run" ? (
                        <>
                            <div className="relative w-full">
                                <select
                                    className="w-full rounded-md border-none bg-darkHover px-4 py-2 text-white outline-none"
                                    value={JSON.stringify(selectedLanguage)}
                                    onChange={handleLanguageChange}
                                >
                                    {supportedLanguages
                                        .sort((a, b) => (a.language > b.language ? 1 : -1))
                                        .map((lang, i) => {
                                            return (
                                                <option
                                                    key={i}
                                                    value={JSON.stringify(lang)}
                                                >
                                                    {lang.language +
                                                        (lang.version
                                                            ? ` (${lang.version})`
                                                            : "")}
                                                </option>
                                            )
                                        })}
                                </select>
                                <PiCaretDownBold
                                    size={16}
                                    className="absolute bottom-3 right-4 z-10 text-white"
                                />
                            </div>
                            <textarea
                                className="min-h-[120px] w-full resize-none rounded-md border-none bg-darkHover p-2 text-white outline-none"
                                placeholder="Write you input here..."
                                onChange={(e) => setInput(e.target.value)}
                            />
                            <button
                                className="flex w-full justify-center rounded-md bg-primary p-2 font-bold text-black outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={runCode}
                                disabled={isRunning}
                            >
                                Run
                            </button>
                            <label className="flex w-full justify-between">
                                Output :
                                <button onClick={copyOutput} title="Copy Output">
                                    <LuCopy
                                        size={18}
                                        className="cursor-pointer text-white"
                                    />
                                </button>
                            </label>
                            <div className="w-full flex-grow resize-none overflow-y-auto rounded-md border-none bg-darkHover p-2 text-white outline-none">
                                <code>
                                    <pre className="text-wrap">{output}</pre>
                                </code>
                            </div>
                        </>
                    ) : (
                        <div className="w-full h-full">
                            <TerminalView />
                        </div>
                    )}
                </div>
            </div>
        )
    }

    export default RunView
