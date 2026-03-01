import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const entityFilter = request.nextUrl.searchParams.get("entity")

    const query = entityFilter
      ? `SELECT
          c.id, c.case_number, c.entity_name_en, c.violated_codes, c.violation_summary,
          c.status, c.notified_at, c.deadline, c.evidence_text, c.evidence_files,
          c.evidence_submitted_at, c.reviewer_notes, c.resolved_at, c.created_at,
          f.dislike_comment, f.general_comment, f.ai_severity, f.ai_category
        FROM cases c
        LEFT JOIN feedback f ON c.feedback_id = f.id
        WHERE c.entity_name_en = ?
        ORDER BY c.id DESC`
      : `SELECT
          c.id, c.case_number, c.entity_name_en, c.violated_codes, c.violation_summary,
          c.status, c.notified_at, c.deadline, c.evidence_text, c.evidence_files,
          c.evidence_submitted_at, c.reviewer_notes, c.resolved_at, c.created_at,
          f.dislike_comment, f.general_comment, f.ai_severity, f.ai_category
        FROM cases c
        LEFT JOIN feedback f ON c.feedback_id = f.id
        ORDER BY c.id DESC`

    const cases = (entityFilter
      ? db.prepare(query).all(entityFilter)
      : db.prepare(query).all()
    ) as Array<{
      id: number
      case_number: string
      entity_name_en: string
      violated_codes: string
      violation_summary: string
      status: string
      notified_at: string | null
      deadline: string | null
      evidence_text: string | null
      evidence_files: string | null
      evidence_submitted_at: string | null
      reviewer_notes: string | null
      resolved_at: string | null
      created_at: string
      dislike_comment: string | null
      general_comment: string | null
      ai_severity: string | null
      ai_category: string | null
    }>

    const formatted = cases.map((c) => {
      let violatedCodes: Array<{ code: string; confidence: string; explanation: string }> = []
      try { violatedCodes = JSON.parse(c.violated_codes) } catch { /* skip */ }

      let evidenceFiles: string[] = []
      try { if (c.evidence_files) evidenceFiles = JSON.parse(c.evidence_files) } catch { /* skip */ }

      return {
        id: c.id,
        caseNumber: c.case_number,
        entity: c.entity_name_en,
        violatedCodes,
        violationSummary: c.violation_summary,
        status: c.status,
        notifiedAt: c.notified_at,
        deadline: c.deadline,
        evidenceText: c.evidence_text,
        evidenceFiles,
        evidenceSubmittedAt: c.evidence_submitted_at,
        reviewerNotes: c.reviewer_notes,
        resolvedAt: c.resolved_at,
        createdAt: c.created_at,
        complaintText: c.dislike_comment || c.general_comment,
        severity: c.ai_severity,
        category: c.ai_category,
      }
    })

    return NextResponse.json({ cases: formatted })
  } catch (error) {
    console.error("Cases error:", error)
    return NextResponse.json({ error: "Failed to load cases" }, { status: 500 })
  }
}
