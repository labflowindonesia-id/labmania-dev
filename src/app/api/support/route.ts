import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { supportRequests } from "@/lib/db/schema"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, company, contact, issue } = body

        // Validate required fields
        if (!name || !company || !contact || !issue) {
            return NextResponse.json(
                { error: "Semua field harus diisi" },
                { status: 400 }
            )
        }

        // Insert into database
        const [result] = await db.insert(supportRequests).values({
            name,
            company,
            contact,
            issue,
        }).returning()

        return NextResponse.json({
            success: true,
            message: "Permintaan support berhasil dikirim",
            id: result.id
        })
    } catch (error) {
        console.error("Support request error:", error)
        return NextResponse.json(
            { error: "Gagal mengirim permintaan support" },
            { status: 500 }
        )
    }
}

export async function GET() {
    try {
        const requests = await db.select().from(supportRequests).orderBy(supportRequests.createdAt)
        return NextResponse.json({ requests })
    } catch (error) {
        console.error("Get support requests error:", error)
        return NextResponse.json(
            { error: "Gagal mengambil data support requests" },
            { status: 500 }
        )
    }
}
