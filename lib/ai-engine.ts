import { getDb } from "./db"
import { classifyFeedback, type ClassificationResult } from "./feedback-classifier"
import { matchCodeViolations, type CodeViolation } from "./code-matcher"

export interface ProcessingResult {
  feedbackId: number
  classification: ClassificationResult
  violations: CodeViolation[]
  mode: "live" | "mock"
}

interface FeedbackRow {
  id: number
  feedback_id: number
  entity_name_en: string
  service_center_en: string | null
  feedback_type: string | null
  dislike_traits: string | null
  dislike_comment: string | null
  general_comment: string | null
}

export async function processNewFeedback(dbFeedbackId: number): Promise<ProcessingResult> {
  const db = getDb()
  const key = process.env.ANTHROPIC_API_KEY
  const mode = key && key.startsWith("sk-") && key.length > 10 ? "live" : "mock"

  // Fetch the feedback record
  const row = db.prepare("SELECT * FROM feedback WHERE id = ?").get(dbFeedbackId) as FeedbackRow | undefined
  if (!row) {
    throw new Error(`Feedback record with id ${dbFeedbackId} not found`)
  }

  // Build the text to classify from available comment fields
  const feedbackText = row.dislike_comment || row.general_comment || ""
  const dislikeTraits: string[] = row.dislike_traits ? JSON.parse(row.dislike_traits) : []

  // Step 1: Classify feedback
  const classification = await classifyFeedback({
    feedbackText,
    entity: row.entity_name_en,
    channel: row.service_center_en || undefined,
    dislikeTraits,
    feedbackType: row.feedback_type || undefined,
  })

  // Step 2: Match code violations (only if complaint with severity >= medium)
  let violations: CodeViolation[] = []
  if (classification.is_complaint && classification.severity !== "low") {
    violations = await matchCodeViolations({
      complaintText: feedbackText,
      entity: row.entity_name_en,
      channel: row.service_center_en || undefined,
      dislikeTraits,
      category: classification.category,
      severity: classification.severity,
      feedbackId: row.feedback_id,
    })
  }

  // Step 3: Update the database
  db.prepare(`
    UPDATE feedback SET
      ai_sentiment = ?,
      ai_category = ?,
      ai_is_complaint = ?,
      ai_severity = ?,
      ai_summary = ?,
      ai_code_violations = ?,
      processed_at = ?
    WHERE id = ?
  `).run(
    classification.sentiment,
    classification.category,
    classification.is_complaint ? 1 : 0,
    classification.severity,
    classification.summary,
    violations.length > 0 ? JSON.stringify(violations) : null,
    new Date().toISOString(),
    dbFeedbackId,
  )

  return {
    feedbackId: dbFeedbackId,
    classification,
    violations,
    mode,
  }
}
