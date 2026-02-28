import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET() {
  try {
    const db = getDb()
    const entities = db
      .prepare("SELECT DISTINCT entity_name_en FROM feedback WHERE entity_name_en != '' ORDER BY entity_name_en")
      .all() as Array<{ entity_name_en: string }>

    return NextResponse.json({ entities: entities.map((e) => e.entity_name_en) })
  } catch (error) {
    console.error("Feedback GET error:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      entity_name_en,
      service_center_en,
      feedback_type,
      dislike_traits,
      dislike_comment,
      general_comment,
    } = body

    if (!entity_name_en) {
      return NextResponse.json({ error: "entity_name_en is required" }, { status: 400 })
    }

    const db = getDb()

    // Generate a unique feedback_id
    const maxRow = db.prepare("SELECT MAX(feedback_id) as max_id FROM feedback").get() as { max_id: number | null }
    const feedbackId = (maxRow.max_id || 200000) + 1

    const result = db.prepare(`
      INSERT INTO feedback (
        feedback_id, entity_name_en, service_center_en, feedback_date,
        feedback_type, dislike_traits, dislike_comment, general_comment, device_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      feedbackId,
      entity_name_en,
      service_center_en || null,
      new Date().toISOString().split("T")[0],
      feedback_type || "complaint",
      JSON.stringify(dislike_traits || []),
      dislike_comment || null,
      general_comment || null,
      "desktop",
    )

    return NextResponse.json({
      success: true,
      id: result.lastInsertRowid,
      feedback_id: feedbackId,
    })
  } catch (error) {
    console.error("Feedback POST error:", error)
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 })
  }
}
