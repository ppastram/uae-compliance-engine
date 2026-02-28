import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

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

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

export async function GET() {
  try {
    const db = getDb()
    const rules = loadRulesMap()

    const rows = db.prepare(`
      SELECT
        id, feedback_id, entity_name_en, entity_name_ar, service_center_en,
        feedback_date, feedback_type, dislike_traits, dislike_comment, general_comment,
        ai_sentiment, ai_category, ai_severity, ai_summary, ai_code_violations
      FROM feedback
      WHERE ai_is_complaint = 1
        AND ai_code_violations IS NOT NULL
        AND ai_code_violations != '[]'
      ORDER BY id DESC
    `).all() as Array<{
      id: number
      feedback_id: number
      entity_name_en: string
      entity_name_ar: string | null
      service_center_en: string | null
      feedback_date: string
      feedback_type: string | null
      dislike_traits: string | null
      dislike_comment: string | null
      general_comment: string | null
      ai_sentiment: string
      ai_category: string
      ai_severity: string
      ai_summary: string | null
      ai_code_violations: string
    }>

    // Check which feedback already has a case
    const caseFeedbackIds = new Set(
      (db.prepare("SELECT feedback_id FROM cases").all() as Array<{ feedback_id: number }>)
        .map((r) => r.feedback_id)
    )

    const items = rows
      .filter((r) => !caseFeedbackIds.has(r.id))
      .map((r) => {
        let violations: Array<{ code: string; confidence: string; explanation: string }> = []
        try { violations = JSON.parse(r.ai_code_violations) } catch { /* skip */ }

        const enrichedViolations = violations.map((v) => {
          const rule = rules.get(v.code)
          return {
            ...v,
            pillar: rule?.pillar_name_en || "—",
            category: rule?.category_en || "—",
            ruleDescription: rule?.description_en || "",
          }
        })

        return {
          id: r.id,
          feedbackId: r.feedback_id,
          entity: r.entity_name_en,
          entityAr: r.entity_name_ar,
          serviceCenter: r.service_center_en,
          date: r.feedback_date,
          type: r.feedback_type,
          dislikeTraits: r.dislike_traits ? JSON.parse(r.dislike_traits) : [],
          complaintText: r.dislike_comment || r.general_comment || "",
          sentiment: r.ai_sentiment,
          category: r.ai_category,
          severity: r.ai_severity,
          summary: r.ai_summary,
          violations: enrichedViolations,
        }
      })
      .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9))

    return NextResponse.json({ items })
  } catch (error) {
    console.error("Inbox error:", error)
    return NextResponse.json({ error: "Failed to load inbox" }, { status: 500 })
  }
}
