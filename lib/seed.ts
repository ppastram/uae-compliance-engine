import { getDb } from "./db"
import fs from "fs"
import path from "path"

interface FeedbackRecord {
  feedback_id: number | null
  entity_name_en: string
  entity_name_ar: string
  service_center_en: string
  feedback_date: string
  feedback_type: string
  dislike_traits: string[]
  dislike_comment: string | null
  general_comment: string | null
  device_type: string
}

interface PreAnalyzedRecord {
  feedback_id: number
  ai_sentiment: string
  ai_is_complaint: boolean
  ai_severity: string
  ai_category: string
  ai_code_violations: Array<{
    code: string
    confidence: string
    explanation: string
  }>
}

// Synthetic entity names for demo when data is anonymized
const DEMO_ENTITIES = [
  { en: "Federal Authority for Identity & Citizenship", ar: "الهيئة الاتحادية للهوية والجنسية" },
  { en: "Ministry of Health & Prevention", ar: "وزارة الصحة ووقاية المجتمع" },
  { en: "Ministry of Interior", ar: "وزارة الداخلية" },
  { en: "Ministry of Human Resources", ar: "وزارة الموارد البشرية والتوطين" },
  { en: "Dubai Electricity & Water Authority", ar: "هيئة كهرباء ومياه دبي" },
  { en: "Abu Dhabi Digital Authority", ar: "هيئة أبوظبي الرقمية" },
  { en: "Sharjah Municipality", ar: "بلدية الشارقة" },
  { en: "Ajman Government Services", ar: "خدمات حكومة عجمان" },
  { en: "Roads & Transport Authority", ar: "هيئة الطرق والمواصلات" },
  { en: "Dubai Municipality", ar: "بلدية دبي" },
]

const SERVICE_CENTERS = [
  "Main Branch", "Online Portal", "Mobile App", "Customer Service Center",
  "Call Center", "Self-Service Kiosk", "WhatsApp Channel",
]

const FEEDBACK_TYPES = ["compliment", "complaint", "suggestion", "inquiry"]
const DEVICE_TYPES = ["mobile", "desktop", "tablet", "kiosk"]
const DISLIKE_TRAIT_OPTIONS = [
  "Long waiting time", "Unclear process", "Rude staff", "Complex forms",
  "System downtime", "Missing information", "No follow-up", "Fees too high",
]

const COMPLAINT_COMMENTS = [
  "الخدمة بطيئة جداً وانتظرت أكثر من ساعتين - The service was extremely slow and I waited over 2 hours",
  "الموظف لم يكن متعاوناً ولم يشرح الإجراءات بشكل واضح - The employee was unhelpful and did not explain the procedures clearly",
  "الموقع الإلكتروني معقد جداً ولا أستطيع إتمام المعاملة - The website is very complex and I cannot complete the transaction",
  "لم أحصل على أي رد بعد تقديم الشكوى منذ شهرين - I haven't received any response after submitting the complaint 2 months ago",
  "الرسوم مرتفعة جداً مقارنة بالخدمة المقدمة - The fees are very high compared to the service provided",
  "النظام توقف أثناء تقديم الطلب وفقدت جميع البيانات - The system crashed during application and I lost all data",
  "لا توجد معلومات كافية عن المتطلبات والوثائق المطلوبة - There is insufficient information about requirements and required documents",
  "وقت الانتظار في مركز الخدمة غير مقبول - The waiting time at the service center is unacceptable",
  "تطبيق الهاتف لا يعمل بشكل صحيح - The mobile app does not work properly",
  "تم رفض طلبي دون إعطاء أي سبب واضح - My application was rejected without giving any clear reason",
]

const POSITIVE_COMMENTS = [
  "خدمة ممتازة وسريعة - Excellent and fast service",
  "الموظفون محترفون ومتعاونون - Staff are professional and helpful",
  "النظام الإلكتروني سهل الاستخدام - The electronic system is easy to use",
  "تجربة رائعة وأنصح بها - Great experience and I recommend it",
  "تم إنجاز المعاملة بسرعة - The transaction was completed quickly",
]

const CATEGORY_OPTIONS = [
  "service_quality", "employee_conduct", "process_complexity", "accessibility",
  "waiting_time", "communication", "fees", "digital_experience",
  "information_clarity", "complaint_handling",
]

const SEED_VIOLATIONS: Record<string, Array<{ code: string; explanation: string }>> = {
  waiting_time: [
    { code: "2.1.1", explanation: "Service performance monitoring standards require tracking and minimizing customer wait times." },
    { code: "1.7.1", explanation: "Instant digital support is required to reduce unnecessary in-person wait times." },
  ],
  employee_conduct: [
    { code: "2.3.1", explanation: "Customer experience management requires professional staff interactions at all touchpoints." },
    { code: "2.2.1", explanation: "Entities must address and act on feedback about staff conduct promptly." },
  ],
  process_complexity: [
    { code: "1.5.1", explanation: "Customer journey simplification requires minimizing steps and documents required." },
    { code: "1.2.1", explanation: "Form quality standards require clear, simple forms that guide the customer." },
  ],
  communication: [
    { code: "2.4.1", explanation: "Proactive communication standards require entities to keep customers informed." },
    { code: "1.7.3", explanation: "Service channels must provide timely notifications about service requests." },
  ],
  fees: [
    { code: "1.6.1", explanation: "All service fees must be clearly displayed before the customer commits." },
  ],
  digital_experience: [
    { code: "1.7.7", explanation: "Digital channels must maintain uptime standards and handle errors gracefully." },
    { code: "1.8.1", explanation: "Digital services must function properly even in low connectivity environments." },
  ],
  information_clarity: [
    { code: "1.4.1", explanation: "Digital literacy and help content standards require clear accessible guidance." },
    { code: "1.9.1", explanation: "Content consistency standards require uniform information across channels." },
  ],
  complaint_handling: [
    { code: "2.2.1", explanation: "Entities must acknowledge, track, and resolve all complaints within defined timelines." },
    { code: "2.1.4", explanation: "Service monitoring must track complaint resolution rates and response times." },
  ],
  service_quality: [
    { code: "2.1.1", explanation: "Service performance monitoring requires measurable quality benchmarks." },
    { code: "2.3.1", explanation: "Customer experience management requires consistent service delivery across channels." },
  ],
  accessibility: [
    { code: "1.1.1", explanation: "All service steps must meet WCAG 2.2 accessibility standards." },
    { code: "1.3.1", explanation: "Services must be fully available in both Arabic and English." },
  ],
}

const SUMMARIES: Record<string, string> = {
  service_quality: "Citizen reported issues with overall service quality and delivery standards.",
  employee_conduct: "Staff behavior reported as unprofessional or unhelpful during service interaction.",
  process_complexity: "Service process found to be overly complex and difficult to navigate.",
  accessibility: "Accessibility barriers experienced when attempting to use the service.",
  waiting_time: "Excessive waiting times reported at the service center or call channel.",
  communication: "Lack of clear communication about service status or requirements.",
  fees: "Fees charged considered disproportionate to the service provided.",
  digital_experience: "Technical issues or poor usability encountered in the digital channel.",
  information_clarity: "Provided information found insufficient or unclear for service completion.",
  complaint_handling: "Previous complaint not addressed or followed up within expected timeframe.",
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(startDays: number, endDays: number): string {
  const now = Date.now()
  const start = now - startDays * 86400000
  const end = now - endDays * 86400000
  const d = new Date(start + Math.random() * (end - start))
  return d.toISOString().split("T")[0]
}

function randomSubset<T>(arr: T[], min: number, max: number): T[] {
  const count = min + Math.floor(Math.random() * (max - min + 1))
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export function seedDatabase() {
  const db = getDb()

  // Check if already seeded
  const count = db.prepare("SELECT COUNT(*) as count FROM feedback").get() as { count: number }
  if (count.count > 0) {
    return { message: "Database already seeded", feedbackCount: count.count }
  }

  const dataDir = path.join(process.cwd(), "data")
  const feedbackRaw: FeedbackRecord[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, "feedback_sample.json"), "utf-8")
  )
  const preAnalyzed: PreAnalyzedRecord[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, "pre_analyzed_seed.json"), "utf-8")
  )

  // Check if data is anonymized (empty entity names)
  const isAnonymized = feedbackRaw.every((r) => !r.entity_name_en)

  // Build a map of pre-analyzed feedback by ID
  const preAnalyzedMap = new Map<number, PreAnalyzedRecord>()
  for (const pa of preAnalyzed) {
    preAnalyzedMap.set(pa.feedback_id, pa)
  }

  // Insert feedback records
  const insertFeedback = db.prepare(`
    INSERT INTO feedback (
      feedback_id, entity_name_en, entity_name_ar, service_center_en,
      feedback_date, feedback_type, dislike_traits, dislike_comment,
      general_comment, device_type,
      ai_sentiment, ai_category, ai_is_complaint, ai_severity, ai_summary, ai_code_violations, processed_at
    ) VALUES (
      @feedback_id, @entity_name_en, @entity_name_ar, @service_center_en,
      @feedback_date, @feedback_type, @dislike_traits, @dislike_comment,
      @general_comment, @device_type,
      @ai_sentiment, @ai_category, @ai_is_complaint, @ai_severity, @ai_summary, @ai_code_violations, @processed_at
    )
  `)

  const insertMany = db.transaction(() => {
    if (isAnonymized) {
      // Generate synthetic demo data
      // First, insert records that match pre-analyzed IDs
      const preAnalyzedIds = Array.from(preAnalyzedMap.keys())

      for (let i = 0; i < 1000; i++) {
        const feedbackId = preAnalyzedIds[i] ?? 100000 + i
        const entity = randomItem(DEMO_ENTITIES)
        const isPreAnalyzed = preAnalyzedMap.has(feedbackId)
        const pa = isPreAnalyzed ? preAnalyzedMap.get(feedbackId)! : null

        const isComplaint = pa ? pa.ai_is_complaint : Math.random() < 0.35
        const feedbackType = isComplaint ? "complaint" : randomItem(FEEDBACK_TYPES)
        const traits = isComplaint ? randomSubset(DISLIKE_TRAIT_OPTIONS, 1, 4) : []
        const comment = isComplaint ? randomItem(COMPLAINT_COMMENTS) : (Math.random() < 0.6 ? randomItem(POSITIVE_COMMENTS) : null)

        // Generate varied severity for non-pre-analyzed complaints
        let severity: string | null = null
        let category: string | null = null
        let violations: string | null = null
        let summary: string | null = null
        let sentiment: string = "positive"

        if (pa) {
          severity = pa.ai_severity
          category = pa.ai_category
          violations = pa.ai_code_violations ? JSON.stringify(pa.ai_code_violations) as string : null
          summary = `AI-classified ${pa.ai_category} issue with ${pa.ai_severity} severity`
          sentiment = pa.ai_sentiment
        } else if (isComplaint) {
          // Varied severity distribution: 5% critical, 25% high, 50% medium, 20% low
          const sRoll = Math.random()
          severity = sRoll < 0.05 ? "critical" : sRoll < 0.30 ? "high" : sRoll < 0.80 ? "medium" : "low"
          category = randomItem(CATEGORY_OPTIONS)
          sentiment = "negative"
          summary = SUMMARIES[category] || SUMMARIES.service_quality

          // Generate violations for medium+ severity (70% chance for high/critical, 30% for medium)
          const shouldHaveViolations = severity === "critical" || severity === "high"
            ? Math.random() < 0.7
            : severity === "medium"
              ? Math.random() < 0.3
              : false

          if (shouldHaveViolations) {
            const categoryViolations = SEED_VIOLATIONS[category] || SEED_VIOLATIONS.service_quality
            const count = severity === "critical" ? 2 : severity === "high" ? Math.min(2, categoryViolations.length) : 1
            const selected = categoryViolations.slice(0, count).map((v) => ({
              code: v.code,
              confidence: severity === "critical" || severity === "high" ? "high" : "medium",
              explanation: v.explanation,
            }))
            violations = JSON.stringify(selected)
          }
        } else {
          // Non-complaints: mostly positive, some neutral
          sentiment = Math.random() < 0.15 ? "neutral" : "positive"
        }

        insertFeedback.run({
          feedback_id: feedbackId,
          entity_name_en: entity.en,
          entity_name_ar: entity.ar,
          service_center_en: randomItem(SERVICE_CENTERS),
          feedback_date: randomDate(180, 1),
          feedback_type: feedbackType,
          dislike_traits: JSON.stringify(traits),
          dislike_comment: isComplaint ? comment : null,
          general_comment: !isComplaint ? comment : null,
          device_type: randomItem(DEVICE_TYPES),
          ai_sentiment: sentiment,
          ai_category: category,
          ai_is_complaint: isComplaint ? 1 : 0,
          ai_severity: severity,
          ai_summary: summary,
          ai_code_violations: violations,
          processed_at: (isComplaint || pa) ? new Date().toISOString() : null,
        })
      }
    } else {
      // Use real data from file
      for (let i = 0; i < feedbackRaw.length; i++) {
        const r = feedbackRaw[i]
        const feedbackId = r.feedback_id ?? 100000 + i
        const pa = preAnalyzedMap.get(feedbackId) ?? null

        insertFeedback.run({
          feedback_id: feedbackId,
          entity_name_en: r.entity_name_en || "Unknown Entity",
          entity_name_ar: r.entity_name_ar || null,
          service_center_en: r.service_center_en || null,
          feedback_date: r.feedback_date || randomDate(180, 1),
          feedback_type: r.feedback_type || "complaint",
          dislike_traits: JSON.stringify(r.dislike_traits ?? []),
          dislike_comment: r.dislike_comment || null,
          general_comment: r.general_comment || null,
          device_type: r.device_type || null,
          ai_sentiment: pa?.ai_sentiment ?? null,
          ai_category: pa?.ai_category ?? null,
          ai_is_complaint: pa ? (pa.ai_is_complaint ? 1 : 0) : 0,
          ai_severity: pa?.ai_severity ?? null,
          ai_summary: null,
          ai_code_violations: pa?.ai_code_violations ? JSON.stringify(pa.ai_code_violations) : null,
          processed_at: pa ? new Date().toISOString() : null,
        })
      }
    }
  })

  insertMany()

  // Create 5 sample cases at various stages
  createSampleCases(db)

  const finalCount = db.prepare("SELECT COUNT(*) as count FROM feedback").get() as { count: number }
  const caseCount = db.prepare("SELECT COUNT(*) as count FROM cases").get() as { count: number }

  return {
    message: "Database seeded successfully",
    feedbackCount: finalCount.count,
    caseCount: caseCount.count,
  }
}

function createSampleCases(db: import("better-sqlite3").Database) {
  // Get some complaints from the seeded data
  const complaints = db.prepare(`
    SELECT id, feedback_id, entity_name_en, ai_code_violations, ai_severity, ai_category
    FROM feedback
    WHERE ai_is_complaint = 1 AND ai_code_violations IS NOT NULL
    ORDER BY id
    LIMIT 5
  `).all() as Array<{
    id: number
    feedback_id: number
    entity_name_en: string
    ai_code_violations: string
    ai_severity: string
    ai_category: string
  }>

  if (complaints.length === 0) return

  const insertCase = db.prepare(`
    INSERT INTO cases (
      case_number, feedback_id, entity_name_en, violated_codes, violation_summary,
      notification_text, status, notified_at, deadline,
      evidence_text, evidence_files, evidence_submitted_at,
      reviewer_notes, resolved_at
    ) VALUES (
      @case_number, @feedback_id, @entity_name_en, @violated_codes, @violation_summary,
      @notification_text, @status, @notified_at, @deadline,
      @evidence_text, @evidence_files, @evidence_submitted_at,
      @reviewer_notes, @resolved_at
    )
  `)

  const statuses: Array<{
    status: string
    notified: boolean
    hasDeadline: boolean
    hasEvidence: boolean
    resolved: boolean
  }> = [
    { status: "flagged", notified: false, hasDeadline: false, hasEvidence: false, resolved: false },
    { status: "flagged", notified: false, hasDeadline: false, hasEvidence: false, resolved: false },
    { status: "notified", notified: true, hasDeadline: true, hasEvidence: false, resolved: false },
    { status: "evidence_submitted", notified: true, hasDeadline: true, hasEvidence: true, resolved: false },
    { status: "penalty", notified: true, hasDeadline: true, hasEvidence: false, resolved: false },
  ]

  const now = new Date()

  for (let i = 0; i < Math.min(complaints.length, 5); i++) {
    const c = complaints[i]
    const s = statuses[i]
    const caseNum = `CE-2026-${String(i + 1).padStart(4, "0")}`

    const notifiedAt = s.notified ? new Date(now.getTime() - (15 + i * 3) * 86400000).toISOString() : null
    const deadline = s.hasDeadline ? new Date(
      new Date(notifiedAt!).getTime() + 20 * 86400000
    ).toISOString() : null

    // For penalty case, set deadline in the past
    const finalDeadline = s.status === "penalty"
      ? new Date(now.getTime() - 5 * 86400000).toISOString()
      : deadline

    const notificationText = s.notified
      ? `Dear ${c.entity_name_en},\n\nFollowing an analysis of citizen feedback received through the Government Services Monitoring System, the following potential non-compliance with the Emirates Code for Government Services has been identified.\n\nViolated Codes: ${c.ai_code_violations}\n\nYou are required to submit evidence of corrective action within 20 working days from the date of this notification.\n\nRegards,\nGovernment Services Compliance Office`
      : null

    insertCase.run({
      case_number: caseNum,
      feedback_id: c.id,
      entity_name_en: c.entity_name_en,
      violated_codes: c.ai_code_violations,
      violation_summary: `${c.ai_category} violation detected with ${c.ai_severity} severity. AI analysis flagged potential non-compliance with Emirates Code requirements.`,
      notification_text: notificationText,
      status: s.status,
      notified_at: notifiedAt,
      deadline: finalDeadline,
      evidence_text: s.hasEvidence
        ? "We have reviewed the flagged issues and implemented the following corrective measures:\n\n1. Staff retraining on service standards completed on 2026-02-15\n2. Updated process documentation to clarify requirements\n3. New feedback monitoring system implemented at the service center\n\nPlease find attached supporting documentation."
        : null,
      evidence_files: s.hasEvidence ? JSON.stringify(["training_records.pdf", "updated_sop.pdf"]) : null,
      evidence_submitted_at: s.hasEvidence
        ? new Date(now.getTime() - 3 * 86400000).toISOString()
        : null,
      reviewer_notes: null,
      resolved_at: null,
    })
  }
}
