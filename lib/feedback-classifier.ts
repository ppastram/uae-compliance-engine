import Anthropic from "@anthropic-ai/sdk"

export interface ClassificationResult {
  sentiment: "positive" | "negative" | "neutral"
  is_complaint: boolean
  severity: "low" | "medium" | "high" | "critical"
  category:
    | "service_quality"
    | "employee_conduct"
    | "process_complexity"
    | "accessibility"
    | "waiting_time"
    | "communication"
    | "fees"
    | "digital_experience"
    | "information_clarity"
    | "complaint_handling"
    | "other"
  summary: string
}

interface ClassifyInput {
  feedbackText: string
  entity: string
  channel?: string
  dislikeTraits?: string[]
  feedbackType?: string
}

const SYSTEM_PROMPT = `You are an AI analyst for UAE government service feedback.
Classify this feedback and return ONLY a JSON object with these fields:
- sentiment: "positive" | "negative" | "neutral"
- is_complaint: boolean
- severity: "low" | "medium" | "high" | "critical"
- category: one of ["service_quality", "employee_conduct", "process_complexity", "accessibility", "waiting_time", "communication", "fees", "digital_experience", "information_clarity", "complaint_handling", "other"]
- summary: one-sentence English summary of the feedback

Handle Arabic and English input. Return JSON only, no markdown fences.`

function isApiAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

export async function classifyFeedback(input: ClassifyInput): Promise<ClassificationResult> {
  if (!isApiAvailable()) {
    return mockClassify(input)
  }

  const client = new Anthropic()

  const userMessage = [
    `Feedback text: ${input.feedbackText}`,
    `Entity: ${input.entity}`,
    input.channel ? `Channel: ${input.channel}` : null,
    input.dislikeTraits?.length ? `Dislike traits: ${input.dislikeTraits.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  return JSON.parse(text) as ClassificationResult
}

// --- Mock fallback ---

const TRAIT_TO_CATEGORY: Record<string, ClassificationResult["category"]> = {
  "Long waiting time": "waiting_time",
  "Unclear process": "process_complexity",
  "Rude staff": "employee_conduct",
  "Complex forms": "process_complexity",
  "System downtime": "digital_experience",
  "Missing information": "information_clarity",
  "No follow-up": "complaint_handling",
  "Fees too high": "fees",
}

const TRAIT_TO_SEVERITY: Record<string, ClassificationResult["severity"]> = {
  "Rude staff": "high",
  "System downtime": "high",
  "No follow-up": "high",
  "Complex forms": "medium",
  "Long waiting time": "medium",
  "Unclear process": "medium",
  "Missing information": "medium",
  "Fees too high": "medium",
}

const MOCK_SUMMARIES: Record<string, string> = {
  service_quality: "Citizen reported issues with overall service quality and delivery standards.",
  employee_conduct: "Citizen reported unprofessional or unhelpful behavior from service center staff.",
  process_complexity: "Citizen found the service process overly complex and difficult to navigate.",
  accessibility: "Citizen experienced accessibility barriers when trying to use the service.",
  waiting_time: "Citizen experienced excessive waiting times at the service center.",
  communication: "Citizen reported lack of clear communication about service status or requirements.",
  fees: "Citizen expressed concern about the fees charged relative to the service provided.",
  digital_experience: "Citizen encountered technical issues or poor usability in the digital service channel.",
  information_clarity: "Citizen found the provided information insufficient or unclear.",
  complaint_handling: "Citizen reported that a previous complaint was not addressed or followed up on.",
  other: "Citizen provided general feedback about the government service experience.",
}

function mockClassify(input: ClassifyInput): ClassificationResult {
  const text = (input.feedbackText || "").toLowerCase()
  const traits = input.dislikeTraits || []
  const type = input.feedbackType || ""

  // Determine if complaint
  const negativeSignals =
    type === "complaint" ||
    traits.length > 0 ||
    /بطيئ|slow|wait|rude|complex|problem|issue|fail|error|bad|poor|unhelpful|reject|crash|لم أحصل|لا توجد|معقد|مرتفع|لم يكن/.test(
      text
    )

  const positiveSignals =
    type === "compliment" ||
    /excellent|great|fast|ممتاز|رائع|سهل|محترف|سريع|good|helpful|professional/.test(text)

  const isComplaint = negativeSignals && !positiveSignals
  const sentiment: ClassificationResult["sentiment"] = positiveSignals
    ? "positive"
    : isComplaint
      ? "negative"
      : "neutral"

  // Determine category from traits
  let category: ClassificationResult["category"] = "other"
  let severity: ClassificationResult["severity"] = "low"

  if (traits.length > 0) {
    const primaryTrait = traits[0]
    category = TRAIT_TO_CATEGORY[primaryTrait] || "service_quality"
    severity = TRAIT_TO_SEVERITY[primaryTrait] || "medium"
  } else if (isComplaint) {
    // Infer from text
    if (/wait|بطيئ|انتظر/.test(text)) {
      category = "waiting_time"
      severity = "medium"
    } else if (/rude|unhelpful|لم يكن متعاون/.test(text)) {
      category = "employee_conduct"
      severity = "high"
    } else if (/complex|معقد|صعب/.test(text)) {
      category = "process_complexity"
      severity = "medium"
    } else if (/fee|رسوم|مرتفع/.test(text)) {
      category = "fees"
      severity = "medium"
    } else if (/system|crash|توقف|app|تطبيق/.test(text)) {
      category = "digital_experience"
      severity = "high"
    } else if (/information|معلومات|واضح/.test(text)) {
      category = "information_clarity"
      severity = "medium"
    } else {
      category = "service_quality"
      severity = "medium"
    }
  }

  // Elevate severity if multiple traits
  if (traits.length >= 3) severity = "high"
  if (traits.length >= 4) severity = "critical"

  return {
    sentiment,
    is_complaint: isComplaint,
    severity: isComplaint ? severity : "low",
    category: isComplaint ? category : "other",
    summary: isComplaint
      ? MOCK_SUMMARIES[category] || MOCK_SUMMARIES.other
      : positiveSignals
        ? "Citizen expressed satisfaction with the government service experience."
        : "Citizen provided neutral feedback about the service.",
  }
}
