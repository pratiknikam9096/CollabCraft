import illustration from "@/assets/illustration.svg"
import FormComponent from "@/components/forms/FormComponent"
import { PiPlay, PiCode, PiUsers, PiChatCircle } from "react-icons/pi"
import { LuSparkles } from "react-icons/lu"

function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-dark via-dark to-darkHover">
            {/* Hero Section */}
            <div className="flex min-h-screen flex-col items-center justify-center gap-16 px-4">
                <div className="my-12 flex h-full min-w-full max-w-7xl flex-col items-center justify-evenly sm:flex-row sm:pt-0">
                    <div className="flex w-full animate-up-down justify-center sm:w-1/2 sm:pl-4">
                        <img
                            src={illustration}
                            alt="Code Sync Illustration"
                            className="mx-auto w-[280px] drop-shadow-2xl sm:w-[450px]"
                        />
                    </div>
                    <div className="flex w-full items-center justify-center sm:w-1/2">
                        <div className="w-full max-w-md">
                            <div className="mb-8 text-center">
                                <h1 className="mb-4 bg-gradient-to-r from-primary to-green-400 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
                                    CollabCraft
                                </h1>
                                <p className="text-lg text-gray-300 sm:text-xl">
                                    Real-time collaborative code editor
                                </p>
                                <p className="mt-2 text-sm text-gray-400">
                                    Code together, create together, craft together
                                </p>
                            </div>
                            <FormComponent />
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <div className="w-full max-w-6xl px-4 pb-16">
                    <h2 className="mb-12 text-center text-3xl font-bold text-white">
                        Powerful Features
                    </h2>
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                        <FeatureCard
                            icon={<PiCode size={32} />}
                            title="Real-time Editing"
                            description="Collaborate on code with multiple users simultaneously"
                        />
                        <FeatureCard
                            icon={<PiPlay size={32} />}
                            title="Code Execution"
                            description="Run your code directly in the browser with instant results"
                        />
                        <FeatureCard
                            icon={<PiUsers size={32} />}
                            title="Team Collaboration"
                            description="See who's online and track changes in real-time"
                        />
                        <FeatureCard
                            icon={<PiChatCircle size={32} />}
                            title="Live Chat"
                            description="Communicate with your team while coding"
                        />
                        <FeatureCard
                            icon={<LuSparkles size={32} />}
                            title="AI Copilot"
                            description="Get AI-powered code suggestions and generation"
                        />
                        <FeatureCard
                            icon={<PiCode size={32} />}
                            title="Multi-language"
                            description="Support for 40+ programming languages"
                        />
                        <FeatureCard
                            icon={<PiPlay size={32} />}
                            title="Drawing Board"
                            description="Collaborative whiteboard for planning and design"
                        />
                        <FeatureCard
                            icon={<PiUsers size={32} />}
                            title="File Management"
                            description="Create, edit, and organize files and folders"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => {
    return (
        <div className="group rounded-xl border border-gray-700 bg-dark/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:bg-dark/70 hover:shadow-lg hover:shadow-primary/10">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                {icon}
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-gray-400">{description}</p>
        </div>
    )
}

export default HomePage
