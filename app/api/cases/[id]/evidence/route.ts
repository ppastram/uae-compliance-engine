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

    const existing = db.prepare("SELECT id, status FROM cases WHERE id = ?").get(params.id) as
      | { id: number; status: string }
      | undefined

    if (!existing) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    db.prepare(`
      UPDATE cases SET
        status = 'evidence_submitted',
        evidence_text = ?,
        evidence_files = ?,
        evidence_submitted_at = ?
      WHERE id = ?
    `).run(
      evidence_text,
      JSON.stringify(evidence_files || []),
      new Date().toISOString(),
      params.id,
    )

    return NextResponse.json({ success: true, status: "evidence_submitted" })
  } catch (error) {
    console.error("Evidence submit error:", error)
    return NextResponse.json({ error: "Failed to submit evidence" }, { status: 500 })
  }
}
