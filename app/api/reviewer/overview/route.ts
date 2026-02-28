import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const db = getDb()

    // Pending reviews: flagged feedback not yet in cases
    const caseFeedbackIds = (db.prepare("SELECT feedback_id FROM cases").all() as Array<{ feedback_id: number }>)
      .map((r) => r.feedback_id)
    const caseFeedbackSet = new Set(caseFeedbackIds)

    const allFlagged = db.prepare(`
      SELECT id FROM feedback
      WHERE ai_is_complaint = 1 AND ai_code_violations IS NOT NULL AND ai_code_violations != '[]'
    `).all() as Array<{ id: number }>

    const pendingReviews = allFlagged.filter((r) => !caseFeedbackSet.has(r.id)).length

    // Active cases
    const activeCases = (db.prepare(
      "SELECT COUNT(*) as v FROM cases WHERE status IN ('notified', 'flagged')"
    ).get() as { v: number }).v

    // Cases needing verification
    const needsVerification = (db.prepare(
      "SELECT COUNT(*) as v FROM cases WHERE status = 'evidence_submitted'"
    ).get() as { v: number }).v

    // Penalty cases
    const penaltyCases = (db.prepare(
      "SELECT COUNT(*) as v FROM cases WHERE status = 'penalty'"
    ).get() as { v: number }).v

    // Total cases
    const totalCases = (db.prepare("SELECT COUNT(*) as v FROM cases").get() as { v: number }).v

    return NextResponse.json({
      pendingReviews,
      activeCases,
      needsVerification,
      penaltyCases,
      totalCases,
    })
  } catch (error) {
    console.error("Overview error:", error)
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 })
  }
}
