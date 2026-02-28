import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { feedback_id } = await request.json()
    if (!feedback_id) {
      return NextResponse.json({ error: "feedback_id is required" }, { status: 400 })
    }

    const db = getDb()
    db.prepare("UPDATE feedback SET ai_is_complaint = 0, ai_code_violations = NULL WHERE id = ?").run(feedback_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Dismiss error:", error)
    return NextResponse.json({ error: "Failed to dismiss" }, { status: 500 })
  }
}
