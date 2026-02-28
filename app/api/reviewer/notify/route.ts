import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { feedback_id, notification_text, violated_codes, violation_summary, entity_name_en } =
      await request.json()

    if (!feedback_id || !notification_text || !entity_name_en) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = getDb()

    // Generate case number
    const maxCase = db.prepare("SELECT COUNT(*) as c FROM cases").get() as { c: number }
    const caseNumber = `CE-2026-${String(maxCase.c + 1).padStart(4, "0")}`

    const now = new Date()
    const deadline = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000)

    db.prepare(`
      INSERT INTO cases (
        case_number, feedback_id, entity_name_en, violated_codes, violation_summary,
        notification_text, status, notified_at, deadline
      ) VALUES (?, ?, ?, ?, ?, ?, 'notified', ?, ?)
    `).run(
      caseNumber,
      feedback_id,
      entity_name_en,
      typeof violated_codes === "string" ? violated_codes : JSON.stringify(violated_codes),
      violation_summary || "Compliance violation detected by AI analysis",
      notification_text,
      now.toISOString(),
      deadline.toISOString(),
    )

    return NextResponse.json({
      success: true,
      caseNumber,
      deadline: deadline.toISOString(),
    })
  } catch (error) {
    console.error("Notify error:", error)
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 })
  }
}
