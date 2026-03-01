import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { evidence_text, evidence_files } = await request.json()

    if (!evidence_text) {
      return NextResponse.json({ error: "evidence_text is required" }, { status: 400 })
    }

    const db = getDb()

    const existing = db.prepare("SELECT id, status, history FROM cases WHERE id = ?").get(params.id) as
      | { id: number; status: string; history: string | null }
      | undefined

    if (!existing) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    const history: Array<Record<string, unknown>> = existing.history ? JSON.parse(existing.history) : []
    history.push({
      type: "evidence_submitted",
      date: new Date().toISOString(),
      text: evidence_text,
      files: evidence_files || [],
    })

    db.prepare(`
      UPDATE cases SET
        status = 'evidence_submitted',
        evidence_text = ?,
        evidence_files = ?,
        evidence_submitted_at = ?,
        history = ?
      WHERE id = ?
    `).run(
      evidence_text,
      JSON.stringify(evidence_files || []),
      new Date().toISOString(),
      JSON.stringify(history),
      params.id,
    )

    return NextResponse.json({ success: true, status: "evidence_submitted" })
  } catch (error) {
    console.error("Evidence submit error:", error)
    return NextResponse.json({ error: "Failed to submit evidence" }, { status: 500 })
  }
}
