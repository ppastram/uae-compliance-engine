import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import fs from "fs"
import path from "path"

interface Rule {
  code: string
  pillar_name_en: string
  category_en: string
  description_en: string
}

let rulesMap: Map<string, Rule> | null = null

function loadRulesMap(): Map<string, Rule> {
  if (rulesMap) return rulesMap
  const filePath = path.join(process.cwd(), "data", "emirates_code_rules.json")
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"))
  rulesMap = new Map(data.rules.map((r: Rule) => [r.code, r]))
  return rulesMap
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb()
    const rules = loadRulesMap()

    const row = db.prepare(`
      SELECT
        c.*, f.dislike_comment, f.general_comment, f.ai_severity, f.ai_category,
        f.entity_name_ar, f.service_center_en, f.feedback_date
      FROM cases c
      LEFT JOIN feedback f ON c.feedback_id = f.id
      WHERE c.id = ?
    `).get(params.id) as Record<string, unknown> | undefined

    if (!row) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    let violatedCodes: Array<{ code: string; confidence: string; explanation: string }> = []
    try { violatedCodes = JSON.parse(row.violated_codes as string) } catch { /* skip */ }

    let evidenceFiles: string[] = []
    try { if (row.evidence_files) evidenceFiles = JSON.parse(row.evidence_files as string) } catch { /* skip */ }

    let history: Array<Record<string, unknown>> = []
    try { if (row.history) history = JSON.parse(row.history as string) } catch { /* skip */ }

    const enrichedViolations = violatedCodes.map((v) => {
      const rule = rules.get(v.code)
      return {
        ...v,
        pillar: rule?.pillar_name_en || "—",
        category: rule?.category_en || "—",
        ruleDescription: rule?.description_en || "",
      }
    })

    return NextResponse.json({
      id: row.id,
      caseNumber: row.case_number,
      entity: row.entity_name_en,
      entityAr: row.entity_name_ar,
      serviceCenter: row.service_center_en,
      violatedCodes: enrichedViolations,
      violationSummary: row.violation_summary,
      notificationText: row.notification_text,
      status: row.status,
      notifiedAt: row.notified_at,
      deadline: row.deadline,
      evidenceText: row.evidence_text,
      evidenceFiles,
      evidenceSubmittedAt: row.evidence_submitted_at,
      reviewerNotes: row.reviewer_notes,
      resolvedAt: row.resolved_at,
      complaintText: row.dislike_comment || row.general_comment,
      severity: row.ai_severity,
      category: row.ai_category,
      feedbackDate: row.feedback_date,
      history,
    })
  } catch (error) {
    console.error("Case detail error:", error)
    return NextResponse.json({ error: "Failed to load case" }, { status: 500 })
  }
}
