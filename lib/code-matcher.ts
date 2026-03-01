import Anthropic from "@anthropic-ai/sdk"
import fs from "fs"
import path from "path"

export interface CodeViolation {
  code: string
  confidence: "high" | "medium" | "low"
  explanation: string
}

interface MatchInput {
  complaintText: string
  entity: string
  channel?: string
  dislikeTraits?: string[]
  category: string
  severity: string
  feedbackId?: number
}

interface Rule {
  code: string
  pillar_id: number
  pillar_name_en: string
  category_number: string
  category_en: string
  description_en: string
  description_ar: string
  requirements: Array<{ text_en: string; monitoring: string }>
  impact_level: string
  keywords_en: string[]
}

interface PreAnalyzedRecord {
  feedback_id: number
  ai_sentiment: string
  ai_is_complaint: boolean
  ai_severity: string
  ai_category: string
  ai_code_violations: CodeViolation[]
}

let rulesCache: Rule[] | null = null
let preAnalyzedCache: Map<number, PreAnalyzedRecord> | null = null

function loadRules(): Rule[] {
  if (rulesCache) return rulesCache
  const filePath = path.join(process.cwd(), "data", "emirates_code_rules.json")
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"))
  rulesCache = data.rules as Rule[]
  return rulesCache
}

function loadPreAnalyzed(): Map<number, PreAnalyzedRecord> {
  if (preAnalyzedCache) return preAnalyzedCache
  const filePath = path.join(process.cwd(), "data", "pre_analyzed_seed.json")
  const data: PreAnalyzedRecord[] = JSON.parse(fs.readFileSync(filePath, "utf-8"))
  preAnalyzedCache = new Map(data.map((r) => [r.feedback_id, r]))
  return preAnalyzedCache
}

function isApiAvailable(): boolean {
  const key = process.env.ANTHROPIC_API_KEY
  return !!key && key.startsWith("sk-") && key.length > 10
}

// Select rules most likely relevant to this complaint based on keyword overlap
function selectRelevantRules(input: MatchInput): Rule[] {
  const allRules = loadRules()
  const text = [input.complaintText, input.category, ...(input.dislikeTraits || [])].join(" ").toLowerCase()

  const CATEGORY_KEYWORD_MAP: Record<string, string[]> = {
    waiting_time: ["waiting", "time", "queue", "delay", "speed", "SLA"],
    employee_conduct: ["staff", "employee", "behavior", "conduct", "training", "professional"],
    process_complexity: ["process", "journey", "simplif", "form", "step", "requirement"],
    accessibility: ["accessibility", "WCAG", "disability", "language", "translation"],
    communication: ["communication", "notification", "update", "inform", "response"],
    fees: ["fee", "payment", "cost", "receipt", "charge", "refund"],
    digital_experience: ["digital", "website", "app", "system", "online", "channel", "technical"],
    information_clarity: ["information", "content", "clarity", "guide", "help", "FAQ"],
    complaint_handling: ["complaint", "feedback", "grievance", "escalation", "resolution", "follow"],
    service_quality: ["service", "quality", "standard", "performance", "monitoring"],
  }

  const boostKeywords = CATEGORY_KEYWORD_MAP[input.category] || []

  const scored = allRules.map((rule) => {
    let score = 0
    const ruleText = [rule.description_en, rule.category_en, ...rule.keywords_en].join(" ").toLowerCase()

    // Keyword overlap with complaint text
    for (const kw of rule.keywords_en) {
      if (text.includes(kw.toLowerCase())) score += 3
    }

    // Category boost
    for (const kw of boostKeywords) {
      if (ruleText.includes(kw.toLowerCase())) score += 2
    }

    // Impact level boost
    if (rule.impact_level === "high") score += 1

    return { rule, score }
  })

  scored.sort((a, b) => b.score - a.score)

  // Return top 20 most relevant rules for Claude to evaluate
  return scored.slice(0, 20).filter((s) => s.score > 0).map((s) => s.rule)
}

const SYSTEM_PROMPT = `You are an expert on the Emirates Code for Government Services.
Given a citizen complaint and a set of potentially relevant rules from the code, determine which rules are genuinely violated.

Return a JSON array of objects, each with:
- code: the rule number (e.g. "1.7.3")
- confidence: "high" | "medium" | "low"
- explanation: 2-3 sentences explaining why this specific rule appears to be violated based on the complaint evidence

Be conservative — only flag genuine evidence of non-compliance. A complaint about waiting time does not automatically mean every process rule is violated.
Return an empty array [] if no rules are clearly violated.
Return JSON only, no markdown fences.`

export async function matchCodeViolations(input: MatchInput): Promise<CodeViolation[]> {
  if (!isApiAvailable()) {
    return mockMatch(input)
  }

  const relevantRules = selectRelevantRules(input)
  if (relevantRules.length === 0) return []

  const rulesForPrompt = relevantRules.map((r) => ({
    code: r.code,
    category: r.category_en,
    description: r.description_en,
    impact: r.impact_level,
    requirements: r.requirements.map((req) => req.text_en),
  }))

  const client = new Anthropic()

  const userMessage = [
    `Complaint: ${input.complaintText}`,
    `Entity: ${input.entity}`,
    input.channel ? `Channel: ${input.channel}` : null,
    input.dislikeTraits?.length ? `Dislike traits: ${input.dislikeTraits.join(", ")}` : null,
    `Category: ${input.category}`,
    `Severity: ${input.severity}`,
    "",
    `Available rules:`,
    JSON.stringify(rulesForPrompt, null, 2),
  ]
    .filter((l) => l !== null)
    .join("\n")

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  })

  const raw = response.content[0].type === "text" ? response.content[0].text : "[]"
  const text = raw.replace(/```json\n?|```\n?/g, "").trim()
  return JSON.parse(text) as CodeViolation[]
}

// --- Mock fallback ---

// Category-to-rules mapping for mock mode
const CATEGORY_RULE_MAP: Record<string, Array<{ code: string; explanation: string }>> = {
  waiting_time: [
    { code: "2.1.1", explanation: "Service performance monitoring standards require tracking and minimizing customer wait times. Excessive waiting indicates non-compliance with SLA requirements." },
    { code: "1.7.1", explanation: "Instant digital support within service channel is required to reduce unnecessary in-person wait times and provide real-time queue management." },
  ],
  employee_conduct: [
    { code: "2.3.1", explanation: "Customer experience management standards require professional and courteous staff interactions at all service touchpoints." },
    { code: "2.2.1", explanation: "Customer feedback management standards require that entities address and act on feedback about staff conduct." },
  ],
  process_complexity: [
    { code: "1.5.1", explanation: "Simplifying customer journey standards require entities to minimize the number of steps and documents required from customers." },
    { code: "1.2.1", explanation: "Form quality and validation features must ensure forms are clear, simple, and guide the customer through completion without unnecessary complexity." },
  ],
  accessibility: [
    { code: "1.1.1", explanation: "All customer authentication and service steps must meet WCAG 2.2 accessibility standards and provide clear error messages." },
    { code: "1.3.1", explanation: "Language consistency in user journey requires services to be fully available in both Arabic and English." },
  ],
  communication: [
    { code: "2.4.1", explanation: "Proactive communication standards require entities to keep customers informed about service status and any changes." },
    { code: "1.7.3", explanation: "Service channels must provide timely notifications and updates to customers about their service requests." },
  ],
  fees: [
    { code: "1.6.1", explanation: "Clarity of fees, payment, and receipts standards require all service fees to be clearly displayed before the customer commits to the service." },
  ],
  digital_experience: [
    { code: "1.7.1", explanation: "Instant digital support within service channel requires reliable and responsive digital service delivery." },
    { code: "1.8.1", explanation: "Channel effectiveness standards require digital services to function properly even in low connectivity environments." },
    { code: "1.7.7", explanation: "Digital service channels must maintain uptime standards and gracefully handle system errors without losing customer data." },
  ],
  information_clarity: [
    { code: "1.4.1", explanation: "Digital literacy and help content standards require clear, accessible guidance to be available for all services." },
    { code: "1.9.1", explanation: "Content consistency and national design system standards require uniform, clear information across all service channels." },
  ],
  complaint_handling: [
    { code: "2.2.1", explanation: "Customer feedback management requires entities to acknowledge, track, and resolve all complaints within defined timelines." },
    { code: "2.1.4", explanation: "Service performance monitoring must include tracking of complaint resolution rates and response times." },
  ],
  service_quality: [
    { code: "2.1.1", explanation: "Service performance monitoring standards require entities to maintain measurable quality benchmarks for all services." },
    { code: "2.3.1", explanation: "Customer experience management requires consistent, high-quality service delivery across all channels." },
  ],
}

function mockMatch(input: MatchInput): CodeViolation[] {
  // First check pre-analyzed data for known feedback IDs
  if (input.feedbackId) {
    const preAnalyzed = loadPreAnalyzed()
    const existing = preAnalyzed.get(input.feedbackId)
    if (existing?.ai_code_violations) {
      return existing.ai_code_violations
    }
  }

  // Generate mock violations based on category
  const categoryRules = CATEGORY_RULE_MAP[input.category] || CATEGORY_RULE_MAP.service_quality

  // Higher severity → more violations flagged
  const maxViolations = input.severity === "critical" ? 4 : input.severity === "high" ? 3 : 2
  const violations = categoryRules.slice(0, maxViolations)

  return violations.map((v) => ({
    code: v.code,
    confidence: (input.severity === "critical" || input.severity === "high" ? "high" : "medium") as CodeViolation["confidence"],
    explanation: v.explanation,
  }))
}
