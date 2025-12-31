"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, Send, User, Loader2, FlaskConical, AlertCircle } from "lucide-react"
import { ChatMessage } from "@/types"

// Initial welcome message
const initialMessages: ChatMessage[] = [
    {
        id: "1",
        role: "assistant",
        content: "Halo! Saya LIMS Assistant, asisten virtual laboratorium Anda. Saya dapat membantu Anda dengan:\n\n• Mengecek stok inventory dan status\n• Melihat jadwal kalibrasi instrumen\n• Memberikan informasi instruksi kerja alat\n• Menjawab pertanyaan tentang MSDS\n\nApa yang bisa saya bantu hari ini?",
        timestamp: new Date(),
    },
]

export default function ChatPage() {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: input,
            timestamp: new Date(),
        }

        setMessages(prev => [...prev, userMessage])
        const userInput = input
        setInput("")
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userInput }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Gagal mendapatkan respons")
            }

            const data = await response.json()

            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.response || "Maaf, saya tidak dapat memproses permintaan Anda saat ini.",
                timestamp: new Date(),
            }

            setMessages(prev => [...prev, aiMessage])
        } catch (err) {
            console.error("Chat error:", err)
            // Provide fallback response when webhook is not configured
            const fallbackMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: getFallbackResponse(userInput),
                timestamp: new Date(),
            }
            setMessages(prev => [...prev, fallbackMessage])
            setError(err instanceof Error ? err.message : "Terjadi kesalahan")
        } finally {
            setIsLoading(false)
        }
    }

    // Fallback responses when API is not configured
    const getFallbackResponse = (userInput: string): string => {
        const mockResponses: Record<string, string> = {
            stok: "📦 **Status Stok Inventory:**\n\n• Untuk melihat stok realtime, pastikan koneksi ke database aktif.\n• Silakan cek halaman Inventory > Reagents untuk detail stok.\n\n*Note: AI chatbot belum terkonfigurasi dengan n8n webhook.*",
            kalibrasi: "🔬 **Jadwal Kalibrasi:**\n\n• Untuk melihat jadwal kalibrasi, buka halaman Instruments > Database.\n• Instrumen yang perlu dikalibrasi akan ditandai dengan status \"Jadwal Mendatang\" atau \"Lewat Jatuh Tempo\".\n\n*Note: AI chatbot belum terkonfigurasi dengan n8n webhook.*",
            default: "⚠️ **AI Chatbot Mode Terbatas**\n\nSaat ini chatbot berjalan dalam mode terbatas karena n8n webhook belum dikonfigurasi.\n\nAnda masih bisa menggunakan fitur lain:\n• 📦 Inventory Management\n• 🔬 Instruments & Calibration\n• 📊 Dashboard Overview\n\nHubungi administrator untuk mengaktifkan fitur AI penuh.",
        }

        const lowerInput = userInput.toLowerCase()
        if (lowerInput.includes("stok") || lowerInput.includes("inventory") || lowerInput.includes("reagent")) {
            return mockResponses.stok
        } else if (lowerInput.includes("kalibrasi") || lowerInput.includes("jadwal") || lowerInput.includes("instrumen")) {
            return mockResponses.kalibrasi
        }
        return mockResponses.default
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Bot className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold">LIMS Assistant</h1>
                    <p className="text-sm text-muted-foreground">Asisten virtual laboratorium</p>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>Mode terbatas: {error}</span>
                </div>
            )}

            {/* Chat Messages */}
            <ScrollArea ref={scrollRef} className="flex-1 py-4">
                <div className="space-y-4 pr-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                        >
                            {message.role === "assistant" && (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                    <FlaskConical className="h-4 w-4" />
                                </div>
                            )}
                            <Card className={`max-w-[80%] ${message.role === "user" ? "bg-primary text-primary-foreground" : ""}`}>
                                <CardContent className="p-3">
                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    <p className={`text-xs mt-2 ${message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                        {message.timestamp.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </CardContent>
                            </Card>
                            {message.role === "user" && (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                                    <User className="h-4 w-4" />
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <FlaskConical className="h-4 w-4" />
                            </div>
                            <Card>
                                <CardContent className="p-3">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm text-muted-foreground">Sedang mengetik...</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="pt-4 border-t">
                <div className="flex gap-2">
                    <Input
                        placeholder="Ketik pertanyaan Anda..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                    Coba tanyakan: &quot;Berapa stok methanol?&quot; atau &quot;Jadwal kalibrasi minggu ini&quot;
                </p>
            </div>
        </div>
    )
}
