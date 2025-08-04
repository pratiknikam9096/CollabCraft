import illustration from "@/assets/illustration.svg"
import { Link } from "react-router-dom"

function NotFound() {
    console.log("NotFound page rendered") // Debugging log
    return (
        <div className="min-h-screen bg-gradient-to-br from-dark via-dark to-darkHover">
            <div className="flex min-h-screen flex-col items-center justify-center gap-16 px-4">
                <div className="my-12 flex h-full min-w-full max-w-7xl flex-col items-center justify-evenly sm:flex-row sm:pt-0">
                    <div className="flex w-full animate-up-down justify-center sm:w-1/2 sm:pl-4">
                        <img
                            src={illustration}
                            alt="Not Found Illustration"
                            className="mx-auto w-[280px] drop-shadow-2xl sm:w-[450px]"
                        />
                    </div>
                    <div className="flex w-full items-center justify-center sm:w-1/2">
                        <div className="w-full max-w-md">
                            <div className="mb-8 text-center">
                                <h1 className="mb-4 bg-gradient-to-r from-primary to-green-400 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
                                    404 - Page Not Found
                                </h1>
                                <p className="text-lg text-gray-300 sm:text-xl">
                                    Oops! The page you're looking for doesn't exist.
                                </p>
                                <p className="mt-2 text-sm text-gray-400">
                                    You might have mistyped the URL or the page has been moved.
                                </p>
                            </div>
                            <div className="text-center">
                                <Link
                                    to="/"
                                    className="inline-block rounded-lg bg-primary px-6 py-3 text-white transition-all duration-300 hover:bg-primary/80"
                                >
                                    Go Back to Home
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default NotFound
