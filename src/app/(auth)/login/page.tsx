"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { FlaskConical, Loader2, User, Lock, Eye, EyeOff, AlertCircle } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"

export default function LoginPage() {
    const router = useRouter()
    const { signIn } = useAuth()
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [role, setRole] = useState("analyst")
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const result = await signIn(username, password, role)

        if (result.success) {
            router.push("/")
        } else {
            setError(result.error || "Login gagal")
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#f5f7f8] dark:bg-[#101922]">
            {/* Header */}
            <header className="flex items-center justify-between px-8 py-4 w-full absolute top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 text-primary">
                        <FlaskConical className="h-8 w-8" />
                    </div>
                    <h2 className="text-xl font-bold leading-tight tracking-tight text-foreground">
                        LabFlow
                    </h2>
                </div>
                <Button variant="outline" className="h-9 px-4">
                    Contact Support
                </Button>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:flex-row h-full">
                {/* Left Side: Login Form */}
                <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col justify-center items-center p-8 lg:p-16 xl:p-24 relative z-0">
                    <div className="w-full max-w-[480px] flex flex-col gap-6">
                        {/* Mobile Logo */}
                        <div className="lg:hidden flex justify-center mb-6">
                            <div className="h-16 w-16 text-primary">
                                <FlaskConical className="h-16 w-16" />
                            </div>
                        </div>

                        {/* Welcome Text */}
                        <div className="mb-4 text-center lg:text-left">
                            <h1 className="text-[32px] font-bold leading-tight tracking-tight mb-3">
                                Welcome Back
                            </h1>
                            <p className="text-muted-foreground text-base">
                                Systems for managing inventory and instruments for Labmania Indonesia
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleLogin} className="flex flex-col gap-5">
                            {/* Username */}
                            <div className="flex flex-col gap-2">
                                <label className="text-base font-medium">Username</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="h-14 pl-12 pr-4 text-base"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Role Selector */}
                            <div className="flex flex-col gap-2">
                                <label className="text-base font-medium">Login As</label>
                                <Select value={role} onValueChange={setRole}>
                                    <SelectTrigger className="h-14 pl-4 pr-4 text-base">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="analyst">Analyst</SelectItem>
                                        <SelectItem value="manager">Manager</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Password */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-base font-medium">Password</label>
                                    <a href="#" className="text-primary hover:text-primary/80 text-sm font-bold transition-colors">
                                        Forgot Password?
                                    </a>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-14 pl-12 pr-12 text-base"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                    <span className="text-sm font-medium">{error}</span>
                                </div>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="h-12 text-base font-bold mt-2 shadow-lg shadow-primary/20"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    "Sign In"
                                )}
                            </Button>
                        </form>

                        <p className="text-center text-muted-foreground text-sm mt-4">
                            Powered by Labmania Indonesia
                        </p>
                    </div>
                </div>

                {/* Right Side: Hero Image */}
                <div className="hidden lg:flex w-[55%] xl:w-[60%] bg-white dark:bg-gray-900 relative overflow-hidden items-center justify-center p-4">
                    {/* Background Image Container */}
                    <div className="absolute inset-0 z-0">
                        <div
                            className="w-full h-full bg-cover bg-center"
                            style={{
                                backgroundImage: "url('https://images.unsplash.com/photo-1582719471384-894fbb16e074?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')"
                            }}
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-[#101922]/90" />
                        {/* Pattern Overlay */}
                        <div className="absolute inset-0 opacity-10"
                            style={{
                                backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
                            }}
                        />
                    </div>

                    {/* Floating Card Content */}
                    <div className="relative z-10 max-w-md text-white p-8">
                        <div className="mb-6 inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                            <FlaskConical className="h-10 w-10 text-white" />
                        </div>
                        <h2 className="text-4xl font-bold mb-4 tracking-tight leading-snug">
                            Efficient Lab Management for Modern Science
                        </h2>
                        <p className="text-lg text-white/80 leading-relaxed font-light">
                            Streamline your inventory, track instruments, and optimize your laboratory workflow with LabFlow&apos;s comprehensive management suite.
                        </p>

                        {/* Stat items */}
                        <div className="grid grid-cols-2 gap-4 mt-10">
                            <div className="p-4 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10">
                                <div className="text-3xl font-bold mb-1">99%</div>
                                <div className="text-sm text-white/70">Uptime Reliability</div>
                            </div>
                            <div className="p-4 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10">
                                <div className="text-3xl font-bold mb-1">24/7</div>
                                <div className="text-sm text-white/70">Support Access</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
