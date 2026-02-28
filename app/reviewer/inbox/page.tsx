"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Inbox,
  ChevronDown,
  ChevronRight,
  Shield,
  Send,
  X,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  Mail,
  Clock,
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

/* ─── Types ─── */

interface Violation {
  code: string
  confidence: string
  explanation: string
  pillar: string
  category: string
  ruleDescription: string
}

interface InboxItem {
  id: number
  feedbackId: number
  entity: string
  entityAr: string | null
  serviceCenter: string | null
  date: string
  type: string | null
  dislikeTraits: string[]
  complaintText: string
  sentiment: string
  category: string
  severity: string
  summary: string | null
  violations: Violation[]
}

/* ─── Constants ─── */

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-uae-red/15", text: "text-uae-red", border: "border-uae-red/30" },
  high: { bg: "bg-uae-red/10", text: "text-uae-red", border: "border-uae-red/20" },
  medium: { bg: "bg-uae-gold/10", text: "text-uae-gold", border: "border-uae-gold/20" },
  low: { bg: "bg-uae-gray-50", text: "text-uae-black/50", border: "border-uae-gray-100" },
}

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-uae-red/10 text-uae-red",
  medium: "bg-uae-gold/10 text-uae-gold",
  low: "bg-uae-gray-50 text-uae-black/50",
}

/* ─── Page ─── */

export default function ReviewerInboxPage() {
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [notifyItem, setNotifyItem] = useState<InboxItem | null>(null)
  const [emailPreview, setEmailPreview] = useState<{
    caseNumber: string
    entity: string
    text: string
    deadline: string
  } | null>(null)

  const loadInbox = useCallback(() => {
    fetch("/api/reviewer/inbox")
      .then((r) => r.json())
      .then((d) => { setItems(d.items || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { loadInbox() }, [loadInbox])

  async function handleDismiss(item: InboxItem) {
    const res = await fetch("/api/reviewer/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback_id: item.id }),
    })
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      toast.success("Flag dismissed", { description: `Feedback #${item.feedbackId} removed from inbox` })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 size={28} className="text-uae-gold animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-uae-gold/10 flex items-center justify-center">
            <Inbox size={20} className="text-uae-gold" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-uae-black">Reviewer Inbox</h1>
            <p className="text-sm text-uae-black/50">
              {items.length} flagged complaint{items.length !== 1 ? "s" : ""} pending review
            </p>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-uae-gray-100 shadow-sm p-12 text-center">
          <CheckCircle2 size={40} className="text-uae-green mx-auto mb-3" />
          <p className="text-sm font-medium text-uae-black">Inbox Clear</p>
          <p className="text-xs text-uae-black/40 mt-1">No flagged complaints pending review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <InboxCard
              key={item.id}
              item={item}
              isExpanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onNotify={() => setNotifyItem(item)}
              onDismiss={() => handleDismiss(item)}
            />
          ))}
        </div>
      )}

      {/* Notification Composer Modal */}
      {notifyItem && (
        <NotificationComposer
          item={notifyItem}
          onClose={() => setNotifyItem(null)}
          onSent={(result) => {
            setNotifyItem(null)
            setItems((prev) => prev.filter((i) => i.id !== notifyItem.id))
            setEmailPreview(result)
          }}
        />
      )}

      {/* Email Preview Modal */}
      {emailPreview && (
        <EmailSimulator
          data={emailPreview}
          onClose={() => setEmailPreview(null)}
        />
      )}
    </div>
  )
}

/* ─── Inbox Card ─── */

function InboxCard({
  item,
  isExpanded,
  onToggle,
  onNotify,
  onDismiss,
}: {
  item: InboxItem
  isExpanded: boolean
  onToggle: () => void
  onNotify: () => void
  onDismiss: () => void
}) {
  const sev = SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.medium

  return (
    <div
      className={cn(
        "bg-white rounded-xl border shadow-sm transition-all overflow-hidden",
        isExpanded ? `${sev.border} shadow-md` : "border-uae-gray-100"
      )}
    >
      {/* Compact Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-uae-gray-50/30 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown size={16} className="text-uae-black/30 shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-uae-black/30 shrink-0" />
        )}

        {/* Severity */}
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded shrink-0",
            sev.bg, sev.text
          )}
        >
          {item.severity}
        </span>

        {/* Entity + Excerpt */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-uae-black truncate">{item.entity}</p>
          <p className="text-xs text-uae-black/40 truncate mt-0.5">
            {item.complaintText?.slice(0, 100) || item.summary || "No details"}
          </p>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1 text-[10px] text-uae-red/70 font-medium">
            <Shield size={11} />
            {item.violations.length} code{item.violations.length !== 1 ? "s" : ""}
          </span>
          <span className="text-[10px] text-uae-black/30">{item.date}</span>
        </div>
      </button>

      {/* Expanded Detail */}
      {isExpanded && (
        <div className="border-t border-uae-gray-100">
          <div className="px-5 py-4 space-y-4">
            {/* Full Complaint Text */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-uae-black/40 mb-1.5">
                Full Complaint
              </p>
              <div className="px-3 py-2.5 rounded-lg bg-uae-gray-50 border border-uae-gray-100">
                <p className="text-sm text-uae-black leading-relaxed whitespace-pre-wrap">
                  {item.complaintText || "No complaint text provided"}
                </p>
              </div>
            </div>

            {/* Metadata Row */}
            <div className="grid grid-cols-4 gap-3">
              <MetaCell label="Entity" value={item.entity} />
              <MetaCell label="Channel" value={item.serviceCenter || "—"} />
              <MetaCell label="Category" value={(item.category || "").replace(/_/g, " ")} />
              <MetaCell label="Sentiment" value={item.sentiment} />
            </div>

            {/* Dislike Traits */}
            {item.dislikeTraits.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-uae-black/40 mb-1.5">
                  Flagged Traits
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {item.dislikeTraits.map((t) => (
                    <span key={t} className="text-[10px] px-2 py-1 rounded bg-uae-gold/10 text-uae-gold font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* AI Summary */}
            {item.summary && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-uae-black/40 mb-1.5">
                  AI Analysis Summary
                </p>
                <p className="text-sm text-uae-black/60 leading-relaxed">{item.summary}</p>
              </div>
            )}

            {/* Code Violations */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-uae-red/60 mb-2">
                Matched Emirates Code Violations ({item.violations.length})
              </p>
              <div className="space-y-2">
                {item.violations.map((v, i) => (
                  <div
                    key={i}
                    className="px-4 py-3 rounded-lg border border-uae-red/10 bg-uae-red/[0.02]"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono font-bold text-uae-red">{v.code}</span>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", CONFIDENCE_STYLES[v.confidence] || CONFIDENCE_STYLES.medium)}>
                        {v.confidence}
                      </span>
                      <span className="text-[10px] text-uae-black/30">{v.pillar}</span>
                    </div>
                    <p className="text-xs font-medium text-uae-black/70 mb-0.5">{v.category}</p>
                    <p className="text-xs text-uae-black/50 leading-relaxed">{v.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-5 py-3 border-t border-uae-gray-100 bg-uae-gray-50/30 flex items-center justify-between">
            <button
              onClick={onDismiss}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-uae-black/40 hover:text-uae-black/60 hover:bg-uae-gray-100 transition-colors"
            >
              <XCircle size={14} />
              Dismiss Flag
            </button>
            <button
              onClick={onNotify}
              className="inline-flex items-center gap-2 h-9 px-5 rounded-lg bg-uae-red text-white text-xs font-medium hover:bg-uae-red/90 transition-colors"
            >
              <Send size={14} />
              Confirm &amp; Notify Entity
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-uae-gray-50 border border-uae-gray-100">
      <p className="text-[9px] uppercase tracking-wider text-uae-black/30 mb-0.5">{label}</p>
      <p className="text-xs font-medium text-uae-black capitalize">{value}</p>
    </div>
  )
}

/* ─── Notification Composer Modal ─── */

function generateNotificationText(item: InboxItem): string {
  const violationsList = item.violations
    .map((v) => `  - Code ${v.code} (${v.category}): ${v.explanation}`)
    .join("\n")

  return `GOVERNMENT SERVICES COMPLIANCE OFFICE
United Arab Emirates
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OFFICIAL NOTIFICATION OF NON-COMPLIANCE
Emirates Code for Government Services

Reference: GSCO/NC/${new Date().getFullYear()}/${String(Date.now()).slice(-6)}
Date: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}

To: ${item.entity}
${item.entityAr ? `    ${item.entityAr}` : ""}

Subject: Notification of Potential Non-Compliance with the Emirates Code for Government Services

Dear Director General,

Following a systematic analysis of citizen feedback received through the Government Services Monitoring System, the Compliance Office has identified potential non-compliance with the Emirates Code for Government Services at your entity.

COMPLAINT SUMMARY
━━━━━━━━━━━━━━━━
Classification: ${(item.category || "").replace(/_/g, " ").toUpperCase()}
Severity: ${(item.severity || "").toUpperCase()}
Service Channel: ${item.serviceCenter || "Not specified"}

IDENTIFIED VIOLATIONS
━━━━━━━━━━━━━━━━━━━━
${violationsList}

REQUIRED ACTION
━━━━━━━━━━━━━━
Pursuant to the provisions of the Emirates Code for Government Services, you are hereby required to:

1. Conduct an internal review of the identified non-compliance areas within 10 working days.
2. Submit a formal response and corrective action plan through the Compliance Portal within 20 working days from the date of this notification.
3. Provide supporting evidence of implemented corrective measures.

Failure to respond within the stipulated timeframe may result in escalation to the Government Services Council and imposition of appropriate measures in accordance with the Code.

This notification is issued in the interest of maintaining the highest standards of government service delivery in the United Arab Emirates.

Respectfully,

Government Services Compliance Office
Emirates Code Monitoring Division`
}

function NotificationComposer({
  item,
  onClose,
  onSent,
}: {
  item: InboxItem
  onClose: () => void
  onSent: (result: { caseNumber: string; entity: string; text: string; deadline: string }) => void
}) {
  const [text, setText] = useState(() => generateNotificationText(item))
  const [sending, setSending] = useState(false)

  async function handleSend() {
    setSending(true)

    const res = await fetch("/api/reviewer/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feedback_id: item.id,
        notification_text: text,
        violated_codes: JSON.stringify(item.violations.map((v) => ({
          code: v.code,
          confidence: v.confidence,
          explanation: v.explanation,
        }))),
        violation_summary: item.summary || `${item.category} violation — ${item.severity} severity`,
        entity_name_en: item.entity,
      }),
    })

    const data = await res.json()
    setSending(false)

    if (res.ok) {
      toast.success("Notification sent", {
        description: `Case ${data.caseNumber} created for ${item.entity}`,
      })
      onSent({
        caseNumber: data.caseNumber,
        entity: item.entity,
        text,
        deadline: data.deadline,
      })
    } else {
      toast.error("Failed to send notification")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-uae-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-xl shadow-2xl border border-uae-gray-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-uae-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-uae-red/10 flex items-center justify-center">
              <FileText size={16} className="text-uae-red" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-uae-black">Formal Notification</h2>
              <p className="text-[10px] text-uae-black/40">
                To: {item.entity} — {item.violations.length} violation{item.violations.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-uae-gray-50 transition-colors">
            <X size={18} className="text-uae-black/40" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={24}
            className="w-full px-4 py-3 text-xs font-mono leading-relaxed bg-uae-gray-50 border border-uae-gray-100 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-uae-gold/30 focus:border-uae-gold text-uae-black"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-uae-gray-100 bg-uae-gray-50/50 flex items-center justify-between">
          <p className="text-[10px] text-uae-black/30">
            A 20-day response deadline will be set upon sending.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg text-xs font-medium text-uae-black/50 hover:bg-uae-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="inline-flex items-center gap-2 h-9 px-5 rounded-lg bg-uae-red text-white text-xs font-medium hover:bg-uae-red/90 transition-colors disabled:opacity-50"
            >
              {sending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Send Notification
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Email Simulator Modal ─── */

function EmailSimulator({
  data,
  onClose,
}: {
  data: { caseNumber: string; entity: string; text: string; deadline: string }
  onClose: () => void
}) {
  const deadlineDate = new Date(data.deadline).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-uae-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl max-h-[80vh] bg-white rounded-xl shadow-2xl border border-uae-gray-100 flex flex-col overflow-hidden">
        {/* Simulated Email Header */}
        <div className="px-6 py-4 border-b border-uae-gray-100 bg-uae-gray-50/50">
          <div className="flex items-center gap-2 mb-3">
            <Mail size={16} className="text-uae-green" />
            <span className="text-xs font-semibold text-uae-green">Email Sent Successfully</span>
            <span className="text-[10px] text-uae-black/30 ml-auto">Simulated</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex gap-2">
              <span className="text-uae-black/40 w-12">From:</span>
              <span className="text-uae-black font-medium">compliance@government.ae</span>
            </div>
            <div className="flex gap-2">
              <span className="text-uae-black/40 w-12">To:</span>
              <span className="text-uae-black font-medium">director.general@{data.entity.toLowerCase().replace(/\s+/g, "")}.gov.ae</span>
            </div>
            <div className="flex gap-2">
              <span className="text-uae-black/40 w-12">Subject:</span>
              <span className="text-uae-black font-medium">
                [{data.caseNumber}] Official Notification of Non-Compliance — Emirates Code
              </span>
            </div>
          </div>
        </div>

        {/* Email Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <pre className="text-[11px] font-mono text-uae-black/70 leading-relaxed whitespace-pre-wrap">
            {data.text}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-uae-gray-100 bg-uae-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-uae-gold" />
            <span className="text-[10px] text-uae-black/40">
              Response deadline: <strong className="text-uae-black/60">{deadlineDate}</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 h-9 px-5 rounded-lg bg-uae-gold text-white text-xs font-medium hover:bg-uae-gold/90 transition-colors"
          >
            <CheckCircle2 size={14} />
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
