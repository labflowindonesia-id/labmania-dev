"use client"

import { useState, useRef, useEffect } from "react"
import { Bot, Send, User, CheckCircle2, HelpCircle, AlertTriangle, Shield, Database, FileText, UserCheck, Server, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Message {
    id: string
    content: string
    sender: "bot" | "user"
    timestamp: Date
}

// Initial welcome message from LIMS Assistant
const welcomeMessage: Message = {
    id: "welcome",
    content: `Halo! Saya LIMS Assistant, asisten virtual laboratorium Anda.

Saya dapat membantu Anda dengan:
• Mengecek stok inventory dan status
• Melihat jadwal kalibrasi instrumen
• Memberikan informasi instruksi kerja alat
• Menjawab pertanyaan tentang MSDS

Apa yang bisa saya bantu hari ini?`,
    sender: "bot",
    timestamp: new Date(),
}

// Quick action suggestions
const quickActions = [
    { label: "Cek Stok Reagen", message: "Cek stok reagen yang tersedia saat ini" },
    { label: "Jadwal Kalibrasi", message: "Tampilkan jadwal kalibrasi instrumen yang akan datang" },
    { label: "Info MSDS Acetone", message: "Berikan informasi MSDS untuk Acetone" },
]

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([welcomeMessage])
    const [inputValue, setInputValue] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isTermsOpen, setIsTermsOpen] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    const sendMessage = async (content: string) => {
        if (!content.trim() || isLoading) return

        // Add user message
        const userMessage: Message = {
            id: `user-${Date.now()}`,
            content: content.trim(),
            sender: "user",
            timestamp: new Date(),
        }
        setMessages((prev) => [...prev, userMessage])
        setInputValue("")
        setIsLoading(true)

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message: content.trim() }),
            })

            const data = await response.json()

            // Add bot response
            const botMessage: Message = {
                id: `bot-${Date.now()}`,
                content: data.response || data.error || "Maaf, terjadi kesalahan.",
                sender: "bot",
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, botMessage])
        } catch (error) {
            console.error("Chat error:", error)
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                content: "Maaf, terjadi kesalahan saat menghubungi asisten. Silakan coba lagi.",
                sender: "bot",
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        sendMessage(inputValue)
    }

    const handleQuickAction = (message: string) => {
        sendMessage(message)
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto bg-background">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-card">
                <div className="flex items-center gap-3">
                    {/* Bot Avatar */}
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#0ea5e9] text-white shadow-md">
                        <Bot className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-foreground">LIMS Assistant</h1>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-sm text-muted-foreground">Asisten virtual laboratorium</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Help / Terms Button */}
                    <Dialog open={isTermsOpen} onOpenChange={setIsTermsOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                                <HelpCircle className="h-5 w-5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[85vh]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-xl">
                                    <Shield className="h-5 w-5 text-[#0ea5e9]" />
                                    Syarat dan Ketentuan Penggunaan Fitur Chat AI
                                </DialogTitle>
                                <DialogDescription>
                                    Harap membaca dengan saksama sebelum menggunakan fitur Chat AI.
                                </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-[60vh] pr-4">
                                <div className="space-y-6 text-sm">
                                    {/* Introduction */}
                                    <p className="text-muted-foreground">
                                        Fitur ini dirancang sebagai asisten cerdas untuk membantu Anda dalam manajemen inventaris,
                                        pengecekan status instrumen, dan pencarian informasi teknis laboratorium melalui integrasi
                                        workflow otomatisasi.
                                    </p>
                                    <p className="text-muted-foreground">
                                        Dengan menggunakan fitur ini, Anda (&quot;Pengguna&quot; atau &quot;Analis&quot;) menyetujui poin-poin berikut:
                                    </p>

                                    {/* Section 1 */}
                                    <div className="space-y-3">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-[#0ea5e9]" />
                                            1. Sifat Layanan (Nature of Service)
                                        </h3>
                                        <ul className="space-y-2 pl-6 text-muted-foreground">
                                            <li><strong>Alat Bantu (Support Tool):</strong> Fitur Chat AI ini berfungsi sebagai alat pendukung produktivitas dan bukan sebagai pengganti penilaian profesional manusia, Supervisor, atau Manajer Laboratorium.</li>
                                            <li><strong>Teknologi Generatif:</strong> Layanan ini ditenagai oleh Large Language Models (LLM) melalui integrasi pihak ketiga. Jawaban yang dihasilkan bersifat probabilistik (berdasarkan kemungkinan) dan dapat mengandung ketidakakuratan, bias, atau &quot;halusinasi&quot; (informasi yang tampak meyakinkan namun salah).</li>
                                            <li><strong>Keterbatasan Real-time:</strong> Meskipun AI dapat membaca data inventaris dan status instrumen, mungkin terdapat jeda waktu (latency) antara kondisi fisik aktual di laboratorium dengan data yang diproses oleh AI.</li>
                                        </ul>
                                    </div>

                                    {/* Section 2 - Critical */}
                                    <div className="space-y-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
                                        <h3 className="font-semibold flex items-center gap-2 text-red-700 dark:text-red-400">
                                            <AlertTriangle className="h-4 w-4" />
                                            2. Penafian Keselamatan & Akurasi (Safety & Critical Disclaimer)
                                        </h3>
                                        <p className="text-red-600 dark:text-red-400 font-semibold text-xs uppercase tracking-wide">
                                            PERHATIAN: INI ADALAH KLAUSUL PALING PENTING DEMI KESELAMATAN KERJA.
                                        </p>
                                        <ul className="space-y-2 pl-6 text-muted-foreground">
                                            <li><strong>Bukan Referensi Utama:</strong> Informasi yang diberikan oleh AI mengenai Material Safety Data Sheet (MSDS), penanganan bahan kimia berbahaya (B3), atau Instruksi Kerja Instrumen hanyalah referensi cepat.</li>
                                            <li><strong>Kewajiban Verifikasi Manual:</strong> Pengguna WAJIB melakukan verifikasi silang (cross-check) jawaban AI dengan dokumen fisik/digital resmi yang telah disahkan (Dokumen MSDS asli dari supplier, Manual Book asli Instrumen, atau SOP Laboratorium yang berlaku).</li>
                                            <li><strong>Pembebasan Tanggung Jawab:</strong> Pengembang aplikasi dan Manajemen Laboratorium tidak bertanggung jawab atas kecelakaan kerja, kerusakan alat, atau kesalahan analisis yang disebabkan oleh kepercayaan penuh (sole reliance) pengguna terhadap jawaban AI tanpa melakukan verifikasi pada dokumen resmi.</li>
                                            <li><strong>Keputusan Stok:</strong> Rekomendasi AI terkait penggunaan stok (misal: &quot;Gunakan botol A&quot;) harus divalidasi dengan kondisi fisik botol. Jika AI menyatakan stok tersedia namun fisik tidak ada/rusak, kondisi fisiklah yang menjadi acuan.</li>
                                        </ul>
                                    </div>

                                    {/* Section 3 */}
                                    <div className="space-y-3">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <Database className="h-4 w-4 text-[#0ea5e9]" />
                                            3. Pemrosesan Data Pihak Ketiga
                                        </h3>
                                        <ul className="space-y-2 pl-6 text-muted-foreground">
                                            <li><strong>Transmisi Data:</strong> Pengguna memahami bahwa pertanyaan (prompt) yang dikirimkan melalui Chat UI akan diproses melalui alur kerja otomatisasi (n8n) dan diteruskan ke penyedia model AI pihak ketiga (seperti OpenAI, Google Gemini, atau Anthropic).</li>
                                            <li><strong>Data Sensitif:</strong> Meskipun sistem ini adalah internal tools, Pengguna disarankan untuk tidak memasukkan data rahasia perusahaan yang sangat sensitif (seperti formula paten rahasia, data pribadi karyawan/NIK, atau password) ke dalam kolom chat.</li>
                                        </ul>
                                    </div>

                                    {/* Section 4 */}
                                    <div className="space-y-3">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-[#0ea5e9]" />
                                            4. Retensi Data & Audit (Sifat Ephemeral)
                                        </h3>
                                        <ul className="space-y-2 pl-6 text-muted-foreground">
                                            <li><strong>Sifat Sementara:</strong> Percakapan dengan Chat AI dianggap bersifat ephemeral (sementara) untuk kebutuhan operasional saat itu saja.</li>
                                            <li><strong>Bukan Bukti Hukum:</strong> Riwayat percakapan (Chat Logs) tidak dianggap sebagai dokumen pengikat secara hukum perusahaan. Log penggunaan yang sah dan mengikat adalah yang tercatat pada Usage Logs (penggunaan bahan) dan Calibration Logs (riwayat kalibrasi) di database utama, bukan pada teks percakapan chat.</li>
                                            <li><strong>Ketersediaan Riwayat:</strong> Sistem tidak menjamin penyimpanan riwayat percakapan (chat history) dalam jangka waktu tak terbatas. Riwayat dapat dihapus secara berkala untuk optimalisasi storage.</li>
                                        </ul>
                                    </div>

                                    {/* Section 5 */}
                                    <div className="space-y-3">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <UserCheck className="h-4 w-4 text-[#0ea5e9]" />
                                            5. Tanggung Jawab Pengguna
                                        </h3>
                                        <ul className="space-y-2 pl-6 text-muted-foreground">
                                            <li><strong>Penggunaan Profesional:</strong> Fitur ini hanya boleh digunakan untuk keperluan pekerjaan laboratorium (pengecekan stok, status alat, info teknis). Dilarang menggunakan AI untuk tujuan di luar konteks pekerjaan.</li>
                                            <li><strong>Prompt Injection:</strong> Pengguna dilarang dengan sengaja mencoba memanipulasi AI (jailbreaking atau prompt injection) untuk menghasilkan output yang melanggar kebijakan perusahaan atau etika.</li>
                                            <li><strong>Pelaporan Bug:</strong> Jika AI memberikan jawaban yang sangat menyimpang atau berbahaya (misal: menyarankan pencampuran bahan kimia yang eksplosif), Pengguna wajib segera melaporkan hal tersebut kepada Tim IT/Pengembang.</li>
                                        </ul>
                                    </div>

                                    {/* Section 6 */}
                                    <div className="space-y-3">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <Server className="h-4 w-4 text-[#0ea5e9]" />
                                            6. Hak Akses & Ketersediaan
                                        </h3>
                                        <ul className="space-y-2 pl-6 text-muted-foreground">
                                            <li><strong>Read-Only (Saat Ini):</strong> Pengguna memahami bahwa saat ini AI hanya memiliki akses &quot;Baca&quot; (Read-Only) terhadap database. AI tidak dapat melakukan eksekusi order, mengubah status kalibrasi, atau menghapus stok secara langsung. Segala tindakan perubahan data (Create/Update/Delete) harus dilakukan Pengguna melalui antarmuka (UI) aplikasi resmi.</li>
                                            <li><strong>Downtime:</strong> Ketersediaan fitur Chat AI bergantung pada koneksi internet dan status server pihak ketiga (API Provider). Layanan mungkin tidak tersedia sewaktu-waktu tanpa pemberitahuan.</li>
                                        </ul>
                                    </div>

                                    {/* Section 7 */}
                                    <div className="space-y-3">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <RefreshCw className="h-4 w-4 text-[#0ea5e9]" />
                                            7. Perubahan Ketentuan
                                        </h3>
                                        <p className="pl-6 text-muted-foreground">
                                            Pengembang berhak untuk mengubah Syarat dan Ketentuan ini sewaktu-waktu sesuai dengan perkembangan
                                            fitur dan kebijakan keselamatan laboratorium. Pengguna diharapkan untuk meninjau ketentuan ini secara berkala.
                                        </p>
                                    </div>

                                    {/* Agreement Notice */}
                                    <div className="p-4 bg-[#0ea5e9]/10 rounded-lg border border-[#0ea5e9]/20">
                                        <p className="text-sm text-center text-muted-foreground">
                                            Dengan menekan tombol &quot;Setuju&quot; atau mulai menggunakan fitur Chat AI, Anda menyatakan bahwa
                                            Anda telah membaca, memahami, dan menyetujui seluruh syarat di atas, <strong>terutama poin terkait Keselamatan Kerja</strong>.
                                        </p>
                                    </div>
                                </div>
                            </ScrollArea>
                            <DialogFooter>
                                <Button onClick={() => setIsTermsOpen(false)} className="bg-[#0ea5e9] hover:bg-[#0284c7]">
                                    Saya Mengerti
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={cn(
                            "flex gap-3",
                            message.sender === "user" ? "flex-row-reverse" : "flex-row"
                        )}
                    >
                        {/* Avatar */}
                        <div
                            className={cn(
                                "flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full shadow-sm",
                                message.sender === "bot"
                                    ? "bg-[#0ea5e9] text-white"
                                    : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                            )}
                        >
                            {message.sender === "bot" ? (
                                <Bot className="h-5 w-5" />
                            ) : (
                                <User className="h-5 w-5" />
                            )}
                        </div>

                        {/* Message Bubble */}
                        <div
                            className={cn(
                                "max-w-[75%] flex flex-col",
                                message.sender === "user" ? "items-end" : "items-start"
                            )}
                        >
                            <div
                                className={cn(
                                    "px-4 py-3 rounded-2xl shadow-sm",
                                    message.sender === "bot"
                                        ? "bg-gray-100 dark:bg-gray-800 text-foreground rounded-tl-sm"
                                        : "bg-[#0ea5e9] text-white rounded-tr-sm"
                                )}
                            >
                                {message.sender === "bot" ? (
                                    <div className="space-y-2">
                                        {message.content.split("\n").map((line, i) => {
                                            // Check if line starts with bullet point
                                            if (line.startsWith("•")) {
                                                return (
                                                    <div key={i} className="flex items-start gap-2">
                                                        <CheckCircle2 className="h-4 w-4 text-[#0ea5e9] mt-0.5 flex-shrink-0" />
                                                        <span className="text-sm">{line.substring(1).trim()}</span>
                                                    </div>
                                                )
                                            }
                                            return line ? (
                                                <p key={i} className="text-sm">{line}</p>
                                            ) : (
                                                <div key={i} className="h-2" />
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm">{message.content}</p>
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground mt-1 px-1">
                                {formatTime(message.timestamp)}
                            </span>
                        </div>
                    </div>
                ))}

                {/* Typing Indicator */}
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-[#0ea5e9] text-white shadow-sm">
                            <Bot className="h-5 w-5" />
                        </div>
                        <div className="px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm shadow-sm">
                            <div className="flex gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-2 flex gap-2 flex-wrap">
                {quickActions.map((action) => (
                    <Button
                        key={action.label}
                        variant="outline"
                        size="sm"
                        className="rounded-full text-sm font-normal hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleQuickAction(action.message)}
                        disabled={isLoading}
                    >
                        {action.label}
                    </Button>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-card">
                <form onSubmit={handleSubmit} className="flex gap-3">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ketik pesan untuk LIMS Assistant..."
                        className="flex-1 rounded-full px-4 py-3 h-12 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus-visible:ring-[#0ea5e9]"
                        disabled={isLoading}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        className="rounded-full w-12 h-12 bg-[#0ea5e9] hover:bg-[#0284c7] shadow-md"
                        disabled={isLoading || !inputValue.trim()}
                    >
                        <Send className="h-5 w-5" />
                    </Button>
                </form>

                {/* Disclaimer */}
                <p className="text-center text-xs text-muted-foreground mt-3 uppercase tracking-wider">
                    Baca Syarat dan Ketentuan Penggunaan
                </p>
            </div>
        </div>
    )
}
