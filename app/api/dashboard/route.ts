import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

interface Rule {
  code: string
  pillar_id: number
  pillar_name_en: string
  category_number: string
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

export async function GET() {
  try {
    const db = getDb()

    // KPIs
    const totalFeedback = (db.prepare("SELECT COUNT(*) as v FROM feedback").get() as { v: number }).v
    const totalComplaints = (db.prepare("SELECT COUNT(*) as v FROM feedback WHERE ai_is_complaint = 1").get() as { v: number }).v
    const totalWithViolations = (db.prepare("SELECT COUNT(*) as v FROM feedback WHERE ai_code_violations IS NOT NULL AND ai_code_violations != '[]'").get() as { v: number }).v
    const complianceRate = totalFeedback > 0 ? Math.round(((totalFeedback - totalWithViolations) / totalFeedback) * 1000) / 10 : 100

    // Sentiment distribution
    const sentimentRows = db.prepare(`
      SELECT ai_sentiment as name, COUNT(*) as value
      FROM feedback
      WHERE ai_sentiment IS NOT NULL AND ai_sentiment != ''
      GROUP BY ai_sentiment
    `).all() as Array<{ name: string; value: number }>

    // Feedback volume over time (aggregate by week for cleaner chart)
    const volumeRows = db.prepare(`
      SELECT feedback_date as date, COUNT(*) as count
      FROM feedback
      WHERE feedback_date IS NOT NULL AND feedback_date != ''
      GROUP BY feedback_date
      ORDER BY feedback_date
    `).all() as Array<{ date: string; count: number }>

    // Aggregate into weeks
    const weeklyVolume: Array<{ week: string; total: number; complaints: number }> = []
    const complaintByDate = new Map<string, number>()
    const complaintRows = db.prepare(`
      SELECT feedback_date as date, COUNT(*) as count
      FROM feedback
      WHERE feedback_date IS NOT NULL AND feedback_date != '' AND ai_is_complaint = 1
      GROUP BY feedback_date
    `).all() as Array<{ date: string; count: number }>
    for (const r of complaintRows) complaintByDate.set(r.date, r.count)

    // Group by week
    const weekMap = new Map<string, { total: number; complaints: number }>()
    for (const r of volumeRows) {
      const d = new Date(r.date)
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      const weekKey = weekStart.toISOString().split("T")[0]
      const existing = weekMap.get(weekKey) || { total: 0, complaints: 0 }
      existing.total += r.count
      existing.complaints += complaintByDate.get(r.date) || 0
      weekMap.set(weekKey, existing)
    }
    for (const [week, data] of Array.from(weekMap.entries()).sort()) {
      weeklyVolume.push({ week, ...data })
    }

    // Entity breakdown
    const entityRows = db.prepare(`
      SELECT
        entity_name_en as entity,
        COUNT(*) as total,
        SUM(CASE WHEN ai_is_complaint = 1 THEN 1 ELSE 0 END) as complaints,
        SUM(CASE WHEN ai_code_violations IS NOT NULL AND ai_code_violations != '[]' THEN 1 ELSE 0 END) as violations
      FROM feedback
      GROUP BY entity_name_en
      ORDER BY total DESC
    `).all() as Array<{ entity: string; total: number; complaints: number; violations: number }>

    const entityBreakdown = entityRows
      .filter((e) => e.entity)
      .map((e) => ({
        ...e,
        complianceScore: e.total > 0 ? Math.round(((e.total - e.violations) / e.total) * 1000) / 10 : 100,
      }))

    // Top complaint categories
    const categoryRows = db.prepare(`
      SELECT ai_category as category, COUNT(*) as count
      FROM feedback
      WHERE ai_is_complaint = 1 AND ai_category IS NOT NULL
      GROUP BY ai_category
      ORDER BY count DESC
      LIMIT 8
    `).all() as Array<{ category: string; count: number }>

    // Top violated codes
    const violationFeedback = db.prepare(`
      SELECT ai_code_violations FROM feedback
      WHERE ai_code_violations IS NOT NULL AND ai_code_violations != '[]'
    `).all() as Array<{ ai_code_violations: string }>

    const codeCountMap = new Map<string, number>()
    for (const row of violationFeedback) {
      try {
        const violations = JSON.parse(row.ai_code_violations) as Array<{ code: string }>
        for (const v of violations) {
          codeCountMap.set(v.code, (codeCountMap.get(v.code) || 0) + 1)
        }
      } catch { /* skip malformed */ }
    }

    const rules = loadRulesMap()
    const topCodes = Array.from(codeCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, count]) => {
        const rule = rules.get(code)
        return {
          code,
          count,
          description: rule?.description_en?.slice(0, 120) || "Emirates Code requirement",
          pillar: rule?.pillar_name_en || "—",
          category: rule?.category_en || "—",
        }
      })

    // Recent flagged items
    const recentFlagged = db.prepare(`
      SELECT
        id, feedback_id, entity_name_en, ai_severity, ai_category, ai_summary,
        dislike_comment, general_comment, feedback_date, ai_code_violations
      FROM feedback
      WHERE ai_is_complaint = 1 AND ai_code_violations IS NOT NULL AND ai_code_violations != '[]'
      ORDER BY id DESC
      LIMIT 6
    `).all() as Array<{
      id: number
      feedback_id: number
      entity_name_en: string
      ai_severity: string
      ai_category: string
      ai_summary: string | null
      dislike_comment: string | null
      general_comment: string | null
      feedback_date: string
      ai_code_violations: string
    }>

    const flagged = recentFlagged.map((r) => {
      let violationCount = 0
      try {
        violationCount = JSON.parse(r.ai_code_violations).length
      } catch { /* skip */ }
      return {
        id: r.id,
        feedbackId: r.feedback_id,
        entity: r.entity_name_en,
        severity: r.ai_severity,
        category: r.ai_category,
        summary: r.ai_summary,
        excerpt: (r.dislike_comment || r.general_comment || "")?.slice(0, 100),
        date: r.feedback_date,
        violationCount,
      }
    })

    return NextResponse.json({
      kpis: { totalFeedback, totalComplaints, totalWithViolations, complianceRate },
      sentimentDistribution: sentimentRows.filter((s) => s.name),
      weeklyVolume,
      entityBreakdown,
      topCategories: categoryRows,
      topViolatedCodes: topCodes,
      recentFlagged: flagged,
    })
  } catch (error) {
    console.error("Dashboard error:", error)
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 })
  }
}
