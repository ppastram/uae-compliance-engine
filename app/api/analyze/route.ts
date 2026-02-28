import { NextRequest, NextResponse } from "next/server"
import { processNewFeedback } from "@/lib/ai-engine"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const feedbackId = body.feedback_id

    if (!feedbackId || typeof feedbackId !== "number") {
      return NextResponse.json(
        { error: "feedback_id (number) is required in request body" },
        { status: 400 }
      )
    }

    const result = await processNewFeedback(feedbackId)

    return NextResponse.json({
      success: true,
      mode: result.mode,
      feedbackId: result.feedbackId,
      classification: result.classification,
      violations: result.violations,
    })
  } catch (error) {
    console.error("Analyze error:", error)
    const message = error instanceof Error ? error.message : "Analysis failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
