import Database from "better-sqlite3"
import path from "path"

const DB_PATH = path.join(process.cwd(), "data", "compliance.db")

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma("journal_mode = WAL")
    db.pragma("foreign_keys = ON")
    initializeSchema(db)
  }
  return db
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feedback_id INTEGER UNIQUE,
      entity_name_en TEXT NOT NULL,
      entity_name_ar TEXT,
      service_center_en TEXT,
      feedback_date DATETIME,
      feedback_type TEXT,
      dislike_traits TEXT,
      dislike_comment TEXT,
      general_comment TEXT,
      device_type TEXT,
      ai_sentiment TEXT,
      ai_category TEXT,
      ai_is_complaint BOOLEAN DEFAULT 0,
      ai_severity TEXT,
      ai_summary TEXT,
      ai_code_violations TEXT,
      processed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_number TEXT UNIQUE,
      feedback_id INTEGER REFERENCES feedback(id),
      entity_name_en TEXT NOT NULL,
      violated_codes TEXT NOT NULL,
      violation_summary TEXT NOT NULL,
      notification_text TEXT,
      status TEXT DEFAULT 'flagged',
      notified_at DATETIME,
      deadline DATETIME,
      evidence_text TEXT,
      evidence_files TEXT,
      evidence_submitted_at DATETIME,
      reviewer_notes TEXT,
      resolved_at DATETIME,
      history TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
}
