"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Shield,
  FileText,
  Send,
  MessageSquare,
  Building2,
  File,
  Timer,
  XCircle,
  Loader2,
  Gavel,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

/* ─── Types ─── */

interface CaseDetail {
  id: number
  caseNumber: string
  entity: string
  entityAr: string | null
  serviceCenter: string | null
  violatedCodes: Array<{
    code: string
    confidence: string
    explanation: string
    pillar: string
    category: string
    ruleDescription: string
  }>
  violationSummary: string
  notificationText: string | null
  status: string
  notifiedAt: string | null
  deadline: string | null
  evidenceText: string | null
  evidenceFiles: string[]
  evidenceSubmittedAt: string | null
  reviewerNotes: string | null
  resolvedAt: string | null
  complaintText: string | null
  severity: string | null
  category: string | null
  feedbackDate: string | null
}

/* ─── Constants ─── */

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  flagged: { label: "Under Review", color: "text-uae-gold", bg: "bg-uae-gold/10" },
  notified: { label: "Notified", color: "text-uae-red", bg: "bg-uae-red/10" },
  evidence_submitted: { label: "Evidence Submitted", color: "text-blue-600", bg: "bg-blue-50" },
  compliant: { label: "Compliant", color: "text-uae-green", bg: "bg-uae-green/10" },
  non_compliant: { label: "Non-Compliant", color: "text-uae-red", bg: "bg-uae-red/10" },
  penalty: { label: "Penalty Applicable", color: "text-white", bg: "bg-uae-red" },
}

/* ─── Page ─── */

export default function VerifyCasePage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.caseId as string

  const [caseData, setCaseData] = useState<CaseDetail | null>(null)
  const [loading, setLoading] = useState(true)

  // Review form
  const [rejectReason, setRejectReason] = useState("")
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadCase = useCallback(() => {
    fetch(`/api/cases/${caseId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setLoading(false); return }
        setCaseData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [caseId])

  useEffect(() => { loadCase() }, [loadCase])

  async function handleAccept() {
    setSubmitting(true)
    const res = await fetch(`/api/cases/${caseId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    })
    setSubmitting(false)
    if (res.ok) {
      toast.success("Case closed — marked as compliant")
      loadCase()
    } else {
      toast.error("Failed to close case")
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error("Please specify a reason for rejection")
      return
    }
    setSubmitting(true)
    const res = await fetch(`/api/cases/${caseId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", reviewer_notes: rejectReason }),
    })
    setSubmitting(false)
    if (res.ok) {
      toast.success("Rejection note saved")
      setShowRejectForm(false)
      loadCase()
    } else {
      toast.error("Failed to save rejection")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 size={28} className="text-uae-gold animate-spin" />
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <p className="text-sm text-uae-red">Case not found.</p>
      </div>
    )
  }

  const st = STATUS_CONFIG[caseData.status] || STATUS_CONFIG.flagged
  const canVerify = caseData.status === "evidence_submitted"
  const isDeadlineExpired = caseData.deadline && new Date(caseData.deadline) < new Date()
  const isPenalty = caseData.status === "penalty" || (isDeadlineExpired && !caseData.evidenceText && caseData.status === "notified")

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.push("/reviewer/cases")}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-uae-black/40 hover:text-uae-black/60 mb-4 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Cases
      </button>

      {/* Case Header */}
      <div className="bg-white rounded-xl border border-uae-gray-100 shadow-sm p-5 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-lg font-bold font-mono text-uae-black">{caseData.caseNumber}</h1>
              <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded", st.bg, st.color)}>
                {st.label}
              </span>
            </div>
            <p className="text-sm text-uae-black/50">{caseData.entity}</p>
          </div>
          {caseData.deadline && (
            <DeadlineWidget deadline={caseData.deadline} />
          )}
        </div>
      </div>

      {/* Penalty Banner */}
      {isPenalty && (
        <div className="bg-uae-red rounded-xl shadow-sm p-5 mb-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Gavel size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Penalty Applicable</h3>
            <p className="text-xs text-white/80 mt-1 leading-relaxed">
              The 20-day response deadline has expired with no evidence submitted.
              This case is eligible for escalation to the Government Services Council
              and imposition of penalties under the Emirates Code.
            </p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-uae-gray-100 shadow-sm p-5 mb-5">
        <h2 className="text-sm font-semibold text-uae-black mb-5">Case Timeline</h2>
        <div className="relative">
          <TimelineStep
            step={1}
            title="Original Complaint"
            date={caseData.feedbackDate}
            status="completed"
            isLast={false}
          >
            <div className="space-y-2">
              <div className="flex gap-3 text-xs">
                <span className="text-uae-black/40">Entity:</span>
                <span className="text-uae-black font-medium">{caseData.entity}</span>
              </div>
              {caseData.serviceCenter && (
                <div className="flex gap-3 text-xs">
                  <span className="text-uae-black/40">Channel:</span>
                  <span className="text-uae-black">{caseData.serviceCenter}</span>
                </div>
              )}
              {caseData.complaintText && (
                <div className="px-3 py-2 rounded-lg bg-uae-gray-50 border border-uae-gray-100">
                  <p className="text-xs text-uae-black/60 leading-relaxed whitespace-pre-wrap">
                    {caseData.complaintText}
                  </p>
                </div>
              )}
            </div>
          </TimelineStep>

          <TimelineStep
            step={2}
            title="AI Analysis"
            date={caseData.feedbackDate}
            status="completed"
            isLast={false}
          >
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <MiniMeta label="Severity" value={caseData.severity || "—"} />
                <MiniMeta label="Category" value={(caseData.category || "—").replace(/_/g, " ")} />
                <MiniMeta label="Violations" value={`${caseData.violatedCodes.length} codes`} />
              </div>
              <div className="space-y-1.5">
                {caseData.violatedCodes.map((v, i) => (
                  <div key={i} className="flex items-start gap-2 px-2.5 py-1.5 rounded bg-uae-red/[0.03] border border-uae-red/10">
                    <span className="text-[10px] font-mono font-bold text-uae-red shrink-0 mt-px">{v.code}</span>
                    <div className="min-w-0">
                      <span className="text-[10px] text-uae-black/40">{v.category}</span>
                      <p className="text-[11px] text-uae-black/50 truncate">{v.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TimelineStep>

          <TimelineStep
            step={3}
            title="Notification Sent"
            date={caseData.notifiedAt}
            status={caseData.notifiedAt ? "completed" : "pending"}
            isLast={false}
          >
            {caseData.notificationText ? (
              <pre className="text-[10px] font-mono text-uae-black/50 leading-relaxed whitespace-pre-wrap bg-uae-gray-50 border border-uae-gray-100 rounded-lg p-3 max-h-40 overflow-y-auto">
                {caseData.notificationText}
              </pre>
            ) : (
              <p className="text-xs text-uae-black/30 italic">No notification sent yet.</p>
            )}
          </TimelineStep>

          <TimelineStep
            step={4}
            title="Entity Response"
            date={caseData.evidenceSubmittedAt}
            status={
              caseData.evidenceText
                ? "completed"
                : isPenalty
                  ? "failed"
                  : caseData.notifiedAt
                    ? "current"
                    : "pending"
            }
            isLast={false}
          >
            {caseData.evidenceText ? (
              <div className="space-y-2">
                <div className="px-3 py-2 rounded-lg bg-uae-gray-50 border border-uae-gray-100">
                  <p className="text-xs text-uae-black/60 leading-relaxed whitespace-pre-wrap">
                    {caseData.evidenceText}
                  </p>
                </div>
                {caseData.evidenceFiles.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-uae-black/40 font-medium">Attached files:</p>
                    {caseData.evidenceFiles.map((f) => (
                      <div key={f} className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-uae-gray-50 border border-uae-gray-100">
                        <File size={12} className="text-uae-gold" />
                        <span className="text-[11px] text-uae-black/60">{f}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : isPenalty ? (
              <div className="px-3 py-2 rounded-lg bg-uae-red/5 border border-uae-red/20">
                <p className="text-xs text-uae-red font-medium">
                  No response received — deadline expired.
                </p>
              </div>
            ) : (
              <p className="text-xs text-uae-black/30 italic">Awaiting entity response...</p>
            )}
          </TimelineStep>

          <TimelineStep
            step={5}
            title="Verification & Resolution"
            date={caseData.resolvedAt}
            status={
              caseData.resolvedAt
                ? "completed"
                : canVerify
                  ? "current"
                  : "pending"
            }
            isLast={true}
          >
            {caseData.resolvedAt ? (
              <div className="px-3 py-2 rounded-lg bg-uae-green/5 border border-uae-green/20">
                <p className="text-xs text-uae-green font-medium">
                  Case closed as {caseData.status === "compliant" ? "Compliant" : caseData.status}.
                </p>
                {caseData.reviewerNotes && (
                  <p className="text-[11px] text-uae-green/70 mt-1">{caseData.reviewerNotes}</p>
                )}
              </div>
            ) : caseData.reviewerNotes ? (
              <div className="px-3 py-2 rounded-lg bg-uae-gold/5 border border-uae-gold/20">
                <p className="text-[10px] text-uae-gold font-medium uppercase tracking-wider mb-0.5">Reviewer Note</p>
                <p className="text-xs text-uae-black/60">{caseData.reviewerNotes}</p>
              </div>
            ) : (
              <p className="text-xs text-uae-black/30 italic">
                {canVerify ? "Ready for reviewer assessment." : "Pending prior steps."}
              </p>
            )}
          </TimelineStep>
        </div>
      </div>

      {/* Review Actions */}
      {canVerify && (
        <div className="bg-white rounded-xl border border-uae-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-uae-gray-100 flex items-center gap-2">
            <Gavel size={14} className="text-uae-gold" />
            <h2 className="text-sm font-semibold text-uae-black">Review Decision</h2>
          </div>

          <div className="p-5">
            {showRejectForm ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-uae-black/70 mb-1.5">
                    Rejection Reason <span className="text-uae-red">*</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={4}
                    placeholder="Specify why the evidence is insufficient and what additional information or action is required..."
                    className="w-full px-3 py-2.5 text-sm bg-white border border-uae-gray-100 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-uae-gold/30 focus:border-uae-gold transition-colors text-uae-black placeholder:text-uae-black/20"
                  />
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => setShowRejectForm(false)}
                    className="h-9 px-4 rounded-lg text-xs font-medium text-uae-black/50 hover:bg-uae-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 h-9 px-5 rounded-lg bg-uae-red text-white text-xs font-medium hover:bg-uae-red/90 transition-colors disabled:opacity-50"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                    Confirm Rejection
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAccept}
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-uae-green text-white text-sm font-medium hover:bg-uae-green/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Accept — Close Case
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-lg border border-uae-red/20 text-uae-red text-sm font-medium hover:bg-uae-red/5 transition-colors"
                >
                  <XCircle size={16} />
                  Reject — Specify Reason
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Timeline Step ─── */

type StepStatus = "completed" | "current" | "pending" | "failed"

function TimelineStep({
  step,
  title,
  date,
  status,
  isLast,
  children,
}: {
  step: number
  title: string
  date: string | null
  status: StepStatus
  isLast: boolean
  children: React.ReactNode
}) {
  const iconColor = {
    completed: "text-uae-green",
    current: "text-uae-gold",
    pending: "text-uae-black/15",
    failed: "text-uae-red",
  }[status]

  const lineColor = status === "completed" ? "bg-uae-green/30" : "bg-uae-gray-100"

  const Icon = {
    completed: CheckCircle2,
    current: Clock,
    pending: Circle,
    failed: AlertTriangle,
  }[status]

  return (
    <div className="flex gap-4">
      {/* Vertical line + icon */}
      <div className="flex flex-col items-center shrink-0">
        <div className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
          status === "completed" && "bg-uae-green/10",
          status === "current" && "bg-uae-gold/10",
          status === "failed" && "bg-uae-red/10",
          status === "pending" && "bg-uae-gray-50"
        )}>
          <Icon size={15} className={iconColor} />
        </div>
        {!isLast && (
          <div className={cn("w-px flex-1 min-h-[20px]", lineColor)} />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
        <div className="flex items-center gap-2 mb-2">
          <h3 className={cn(
            "text-xs font-semibold",
            status === "pending" ? "text-uae-black/30" : "text-uae-black"
          )}>
            {title}
          </h3>
          {date && (
            <span className="text-[10px] text-uae-black/30">{formatDate(date)}</span>
          )}
        </div>
        <div className={cn(status === "pending" && "opacity-40")}>
          {children}
        </div>
      </div>
    </div>
  )
}

/* ─── Deadline Widget ─── */

function DeadlineWidget({ deadline }: { deadline: string }) {
  const diffDays = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  let color: string, bg: string, label: string

  if (diffDays < 0) {
    color = "text-white"; bg = "bg-uae-red"; label = `${Math.abs(diffDays)}d overdue`
  } else if (diffDays <= 5) {
    color = "text-uae-red"; bg = "bg-uae-red/10"; label = `${diffDays}d left`
  } else if (diffDays <= 10) {
    color = "text-uae-gold"; bg = "bg-uae-gold/10"; label = `${diffDays}d left`
  } else {
    color = "text-uae-green"; bg = "bg-uae-green/10"; label = `${diffDays}d left`
  }

  return (
    <div className={cn("px-3 py-2 rounded-lg text-center", bg)}>
      <Timer size={14} className={cn("mx-auto mb-0.5", color)} />
      <p className={cn("text-sm font-bold font-mono", color)}>{label}</p>
    </div>
  )
}

/* ─── Helpers ─── */

function MiniMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2.5 py-1.5 rounded bg-uae-gray-50 border border-uae-gray-100">
      <p className="text-[9px] uppercase tracking-wider text-uae-black/30">{label}</p>
      <p className="text-[11px] font-medium text-uae-black capitalize">{value}</p>
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    })
  } catch { return iso }
}
