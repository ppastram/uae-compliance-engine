import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action, reviewer_notes } = await request.json()

    if (!action || !["accept", "reject"].includes(action)) {
      return NextResponse.json({ error: "action must be 'accept' or 'reject'" }, { status: 400 })
    }

    const db = getDb()

    const existing = db.prepare("SELECT id, status FROM cases WHERE id = ?").get(params.id) as
      | { id: number; status: string }
      | undefined

    if (!existing) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    if (action === "accept") {
      db.prepare(`
        UPDATE cases SET
          status = 'compliant',
          reviewer_notes = ?,
          resolved_at = ?
        WHERE id = ?
      `).run(
        reviewer_notes || "Evidence accepted — case closed.",
        new Date().toISOString(),
        params.id,
      )
      return NextResponse.json({ success: true, status: "compliant" })
    } else {
      if (!reviewer_notes) {
        return NextResponse.json({ error: "reviewer_notes required for rejection" }, { status: 400 })
      }
      db.prepare(`
        UPDATE cases SET
          reviewer_notes = ?
        WHERE id = ?
      `).run(reviewer_notes, params.id)
      return NextResponse.json({ success: true, status: existing.status })
    }
  } catch (error) {
    console.error("Verify error:", error)
    return NextResponse.json({ error: "Failed to verify" }, { status: 500 })
  }
}
