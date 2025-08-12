import { useChat } from "@/context/ChatContext"
import { FormEvent, useRef } from "react"
import { LuSendHorizontal } from "react-icons/lu"

function ChatInput() {
    const { sendMessage } = useChat()
    const inputRef = useRef<HTMLInputElement | null>(null)

    const handleSendMessage = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        const inputVal = inputRef.current?.value.trim()

        if (inputVal && inputVal.length > 0) {
            sendMessage(inputVal)

            if (inputRef.current) inputRef.current.value = ""
        }
    }

    return (
        <form
            onSubmit={handleSendMessage}
            className="flex justify-between rounded-md border border-primary"
        >
            <input
                type="text"
                className="w-full flex-grow rounded-md border-none bg-dark p-2 outline-none"
                placeholder="Enter a message..."
                ref={inputRef}
            />
            <button
                className="flex items-center justify-center rounded-r-md  bg-primary p-2 text-black"
                type="submit"
            >
                <LuSendHorizontal size={24} />

            </button>
        </form>
    )
}

export default ChatInput
