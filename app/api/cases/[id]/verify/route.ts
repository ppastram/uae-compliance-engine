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

    const existing = db.prepare("SELECT id, status, history FROM cases WHERE id = ?").get(params.id) as
      | { id: number; status: string; history: string | null }
      | undefined

    if (!existing) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    const history: Array<Record<string, unknown>> = existing.history ? JSON.parse(existing.history) : []

    if (action === "accept") {
      const notes = reviewer_notes || "Evidence accepted — case closed."
      history.push({ type: "accepted", date: new Date().toISOString(), notes })
      db.prepare(`
        UPDATE cases SET
          status = 'compliant',
          reviewer_notes = ?,
          resolved_at = ?,
          history = ?
        WHERE id = ?
      `).run(
        notes,
        new Date().toISOString(),
        JSON.stringify(history),
        params.id,
      )
      return NextResponse.json({ success: true, status: "compliant" })
    } else {
      if (!reviewer_notes) {
        return NextResponse.json({ error: "reviewer_notes required for rejection" }, { status: 400 })
      }
      history.push({ type: "rejected", date: new Date().toISOString(), notes: reviewer_notes })
      const newDeadline = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString()
      db.prepare(`
        UPDATE cases SET
          status = 'notified',
          reviewer_notes = ?,
          notified_at = ?,
          deadline = ?,
          evidence_text = NULL,
          evidence_files = NULL,
          evidence_submitted_at = NULL,
          history = ?
        WHERE id = ?
      `).run(
        reviewer_notes,
        new Date().toISOString(),
        newDeadline,
        JSON.stringify(history),
        params.id,
      )
      return NextResponse.json({ success: true, status: "notified" })
    }
  } catch (error) {
    console.error("Verify error:", error)
    return NextResponse.json({ error: "Failed to verify" }, { status: 500 })
  }
}
