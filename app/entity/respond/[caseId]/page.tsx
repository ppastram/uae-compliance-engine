"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Shield,
  Timer,
  FileText,
  Upload,
  X,
  Send,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  Building2,
  File,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

/* ─── Types ─── */

interface HistoryEvent {
  type: "evidence_submitted" | "rejected" | "accepted"
  date: string
  text?: string
  files?: string[]
  notes?: string
}

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
  history: HistoryEvent[]
}

/* ─── Constants ─── */

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  flagged: { label: "Under Review", color: "text-uae-gold", bg: "bg-uae-gold/10" },
  notified: { label: "Awaiting Response", color: "text-uae-red", bg: "bg-uae-red/10" },
  evidence_submitted: { label: "Evidence Submitted", color: "text-uae-green", bg: "bg-uae-green/10" },
  compliant: { label: "Compliant", color: "text-uae-green", bg: "bg-uae-green/10" },
  non_compliant: { label: "Non-Compliant", color: "text-uae-red", bg: "bg-uae-red/10" },
  penalty: { label: "Penalty Applicable", color: "text-white", bg: "bg-uae-red" },
}

/* ─── Page ─── */

export default function EntityRespondPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.caseId as string

  const [caseData, setCaseData] = useState<CaseDetail | null>(null)
  const [loading, setLoading] = useState(true)

  // Response form
  const [responseText, setResponseText] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const loadCase = useCallback(() => {
    fetch(`/api/cases/${caseId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setLoading(false); return }
        setCaseData(d)
        if (d.evidenceText) setResponseText(d.evidenceText)
        if (d.evidenceFiles?.length) setUploadedFiles(d.evidenceFiles)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [caseId])

  useEffect(() => { loadCase() }, [loadCase])

  function simulateUpload() {
    const fileNames = [
      "corrective_action_plan.pdf",
      "staff_training_records.pdf",
      "updated_SOP_v2.pdf",
      "customer_satisfaction_survey.xlsx",
      "process_improvement_report.docx",
      "compliance_audit_report.pdf",
    ]
    const available = fileNames.filter((f) => !uploadedFiles.includes(f))
    if (available.length > 0) {
      setUploadedFiles((prev) => [...prev, available[0]])
    }
  }

  async function handleSubmit() {
    if (!responseText.trim()) {
      toast.error("Please provide your response and evidence")
      return
    }

    setSubmitting(true)

    const res = await fetch(`/api/cases/${caseId}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evidence_text: responseText,
        evidence_files: uploadedFiles,
      }),
    })

    setSubmitting(false)

    if (res.ok) {
      setSubmitted(true)
      toast.success("Evidence submitted successfully")
    } else {
      toast.error("Failed to submit evidence")
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

  const status = STATUS_CONFIG[caseData.status] || STATUS_CONFIG.flagged
  const deadline = caseData.deadline ? getDeadlineInfo(caseData.deadline) : null
  const isRejected = caseData.status === "notified" && !!caseData.reviewerNotes
  const canRespond = caseData.status === "notified" && !submitted
  const alreadySubmitted = (caseData.status === "evidence_submitted" || submitted) && !isRejected

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-uae-black/40 hover:text-uae-black/60 mb-4 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Portal
      </button>

      {/* Case Header */}
      <div className="bg-white rounded-xl border border-uae-gray-100 shadow-sm overflow-hidden mb-4">
        <div className="px-6 py-4 border-b border-uae-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-lg font-bold font-mono text-uae-black">{caseData.caseNumber}</h1>
                <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded", status.bg, status.color)}>
                  {status.label}
                </span>
              </div>
              <p className="text-sm text-uae-black/50">{caseData.entity}</p>
              {caseData.entityAr && (
                <p className="text-sm text-uae-black/30 mt-0.5" dir="rtl">{caseData.entityAr}</p>
              )}
            </div>

            {/* Deadline Widget */}
            {deadline && (
              <div className={cn("px-4 py-3 rounded-xl text-center min-w-[120px]", deadline.bg)}>
                <Timer size={20} className={cn("mx-auto mb-1", deadline.color)} />
                <p className={cn("text-lg font-black font-mono", deadline.color)}>
                  {deadline.value}
                </p>
                <p className={cn("text-[10px] font-semibold uppercase tracking-wider", deadline.color)}>
                  {deadline.sublabel}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Meta Row */}
        <div className="grid grid-cols-4 gap-px bg-uae-gray-100">
          <MetaCell label="Notified" value={caseData.notifiedAt ? formatDate(caseData.notifiedAt) : "—"} icon={Clock} />
          <MetaCell label="Deadline" value={caseData.deadline ? formatDate(caseData.deadline) : "—"} icon={Timer} />
          <MetaCell label="Severity" value={caseData.severity || "—"} icon={AlertTriangle} />
          <MetaCell label="Violations" value={`${caseData.violatedCodes.length} codes`} icon={Shield} />
        </div>
      </div>

      {/* Notification Letter */}
      {caseData.notificationText && (
        <div className="bg-white rounded-xl border border-uae-gray-100 shadow-sm overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-uae-gray-100 flex items-center gap-2">
            <FileText size={14} className="text-uae-red" />
            <h2 className="text-sm font-semibold text-uae-black">Official Notification Received</h2>
          </div>
          <div className="p-5">
            <pre className="text-[11px] font-mono text-uae-black/60 leading-relaxed whitespace-pre-wrap bg-uae-gray-50 border border-uae-gray-100 rounded-lg p-4 max-h-60 overflow-y-auto">
              {caseData.notificationText}
            </pre>
          </div>
        </div>
      )}

      {/* Violated Rules */}
      <div className="bg-white rounded-xl border border-uae-gray-100 shadow-sm overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-uae-gray-100 flex items-center gap-2">
          <Shield size={14} className="text-uae-red" />
          <h2 className="text-sm font-semibold text-uae-black">
            Identified Violations ({caseData.violatedCodes.length})
          </h2>
        </div>
        <div className="p-5 space-y-3">
          {caseData.violatedCodes.map((v, i) => (
            <div key={i} className="px-4 py-3 rounded-lg border border-uae-red/10 bg-uae-red/[0.02]">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-mono font-bold text-uae-red">{v.code}</span>
                <span className="text-[10px] text-uae-black/30">{v.pillar}</span>
              </div>
              <p className="text-xs font-medium text-uae-black/70 mb-1">{v.category}</p>
              {v.ruleDescription && (
                <p className="text-[11px] text-uae-black/40 leading-relaxed mb-1.5">
                  {v.ruleDescription.slice(0, 200)}
                  {v.ruleDescription.length > 200 ? "..." : ""}
                </p>
              )}
              <p className="text-xs text-uae-black/50 leading-relaxed">{v.explanation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Evidence Submitted Confirmation */}
      {alreadySubmitted && (
        <div className="bg-uae-green/5 rounded-xl border border-uae-green/20 shadow-sm p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-uae-green/10 flex items-center justify-center shrink-0">
              <CheckCircle2 size={24} className="text-uae-green" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-uae-green">Evidence Submitted</h3>
              <p className="text-xs text-uae-green/70 mt-1">
                Your response and supporting evidence have been submitted for review by the
                Government Services Compliance Office. You will be notified of the outcome.
              </p>
              {caseData.evidenceSubmittedAt && (
                <p className="text-[10px] text-uae-green/50 mt-2">
                  Submitted: {formatDate(caseData.evidenceSubmittedAt)}
                </p>
              )}
            </div>
          </div>

          {/* Show submitted response */}
          {(responseText || caseData.evidenceText) && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-white border border-uae-green/10">
              <p className="text-[10px] uppercase tracking-wider text-uae-black/40 mb-1">Your Response</p>
              <p className="text-xs text-uae-black/60 leading-relaxed whitespace-pre-wrap">
                {responseText || caseData.evidenceText}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Penalty Banner */}
      {caseData.status === "penalty" && (
        <div className="bg-uae-red rounded-xl shadow-sm p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <AlertTriangle size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Penalty Applicable</h3>
              <p className="text-xs text-white/80 mt-1 leading-relaxed">
                The response deadline has expired without submission of evidence or corrective
                action plan. This case has been escalated to the Government Services Council.
                Penalties may be applied in accordance with the Emirates Code for Government Services.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Previous Submission History */}
      {caseData.history && caseData.history.length > 0 && (
        <div className="bg-white rounded-xl border border-uae-gray-100 shadow-sm overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-uae-gray-100 flex items-center gap-2">
            <Clock size={14} className="text-uae-black/40" />
            <h2 className="text-sm font-semibold text-uae-black">Submission History</h2>
          </div>
          <div className="p-5 space-y-3">
            {caseData.history.map((evt, idx) => {
              if (evt.type === "evidence_submitted") {
                const round = caseData.history.filter((e, j) => e.type === "evidence_submitted" && j <= idx).length
                return (
                  <div key={idx} className="px-4 py-3 rounded-lg border border-uae-gray-100 bg-uae-gray-50/50">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Send size={12} className="text-uae-gold" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-uae-black/40">
                        Submission Round {round}
                      </span>
                      <span className="text-[10px] text-uae-black/30">{formatDate(evt.date)}</span>
                    </div>
                    {evt.text && (
                      <p className="text-xs text-uae-black/50 leading-relaxed whitespace-pre-wrap line-clamp-3">
                        {evt.text}
                      </p>
                    )}
                    {evt.files && evt.files.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {evt.files.map((f) => (
                          <span key={f} className="inline-flex items-center gap-1 text-[10px] text-uae-black/40 bg-white px-2 py-0.5 rounded border border-uae-gray-100">
                            <File size={10} className="text-uae-gold" />
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }
              if (evt.type === "rejected") {
                return (
                  <div key={idx} className="px-4 py-3 rounded-lg border border-uae-red/15 bg-uae-red/[0.02]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertTriangle size={12} className="text-uae-red" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-uae-red">
                        Rejected
                      </span>
                      <span className="text-[10px] text-uae-black/30">{formatDate(evt.date)}</span>
                    </div>
                    <p className="text-xs text-uae-black/60 leading-relaxed whitespace-pre-wrap">{evt.notes}</p>
                  </div>
                )
              }
              if (evt.type === "accepted") {
                return (
                  <div key={idx} className="px-4 py-3 rounded-lg border border-uae-green/15 bg-uae-green/[0.02]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <CheckCircle2 size={12} className="text-uae-green" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-uae-green">
                        Accepted
                      </span>
                      <span className="text-[10px] text-uae-black/30">{formatDate(evt.date)}</span>
                    </div>
                    <p className="text-xs text-uae-black/60 leading-relaxed">{evt.notes}</p>
                  </div>
                )
              }
              return null
            })}
          </div>
        </div>
      )}

      {/* Rejection Banner — evidence was rejected, resubmission required */}
      {isRejected && !submitted && (
        <div className="bg-uae-red/5 rounded-xl border border-uae-red/20 shadow-sm p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-uae-red/10 flex items-center justify-center shrink-0">
              <AlertTriangle size={24} className="text-uae-red" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-uae-red">Evidence Rejected — Resubmission Required</h3>
              <p className="text-xs text-uae-black/60 mt-1 leading-relaxed">
                Your previously submitted evidence has been reviewed and was not accepted.
                Please review the reason below and resubmit with adequate corrective evidence within the new deadline.
              </p>
              <div className="mt-3 px-4 py-3 rounded-lg bg-white border border-uae-red/10">
                <p className="text-[10px] uppercase tracking-wider text-uae-black/40 mb-1">Reviewer Feedback</p>
                <p className="text-xs text-uae-black/70 leading-relaxed whitespace-pre-wrap">
                  {caseData.reviewerNotes}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Response Form — only for notified cases */}
      {canRespond && (
        <div className="bg-white rounded-xl border border-uae-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-uae-gray-100 flex items-center gap-2">
            <Send size={14} className="text-uae-gold" />
            <h2 className="text-sm font-semibold text-uae-black">Submit Response &amp; Evidence</h2>
          </div>

          <div className="p-5 space-y-4">
            {/* Response Text */}
            <div>
              <label className="block text-xs font-medium text-uae-black/70 mb-1.5">
                Response &amp; Corrective Action Plan <span className="text-uae-red">*</span>
              </label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={8}
                placeholder={"Describe the corrective actions taken to address the identified non-compliance...\n\n1. Internal review findings\n2. Corrective measures implemented\n3. Timeline for full compliance\n4. Preventive measures to avoid recurrence"}
                className="w-full px-3 py-2.5 text-sm bg-white border border-uae-gray-100 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-uae-gold/30 focus:border-uae-gold transition-colors text-uae-black placeholder:text-uae-black/20"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-xs font-medium text-uae-black/70 mb-1.5">
                Supporting Documents
              </label>

              {/* Uploaded files */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {uploadedFiles.map((f) => (
                    <div
                      key={f}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-uae-gray-50 border border-uae-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <File size={14} className="text-uae-gold" />
                        <span className="text-xs text-uae-black font-medium">{f}</span>
                      </div>
                      <button
                        onClick={() => setUploadedFiles((prev) => prev.filter((p) => p !== f))}
                        className="p-1 rounded hover:bg-uae-gray-100 transition-colors"
                      >
                        <X size={12} className="text-uae-black/30" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload zone */}
              <button
                type="button"
                onClick={simulateUpload}
                className="w-full py-6 rounded-lg border-2 border-dashed border-uae-gray-200 hover:border-uae-gold/40 hover:bg-uae-gold/[0.02] transition-colors flex flex-col items-center gap-2"
              >
                <Upload size={20} className="text-uae-black/20" />
                <span className="text-xs text-uae-black/40">
                  Click to upload supporting documents
                </span>
                <span className="text-[10px] text-uae-black/20">
                  PDF, DOCX, XLSX up to 10MB — Simulated for demo
                </span>
              </button>
            </div>
          </div>

          {/* Submit Footer */}
          <div className="px-5 py-3 border-t border-uae-gray-100 bg-uae-gray-50/30 flex items-center justify-between">
            <p className="text-[10px] text-uae-black/30">
              Your response will be reviewed by the Compliance Office.
            </p>
            <button
              onClick={handleSubmit}
              disabled={submitting || !responseText.trim()}
              className="inline-flex items-center gap-2 h-10 px-6 rounded-lg bg-uae-gold text-white text-sm font-medium hover:bg-uae-gold/90 transition-colors disabled:opacity-40"
            >
              {submitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              Submit Evidence
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Meta Cell ─── */

function MetaCell({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Clock }) {
  return (
    <div className="bg-white px-4 py-3">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon size={11} className="text-uae-black/25" />
        <p className="text-[9px] uppercase tracking-wider text-uae-black/30">{label}</p>
      </div>
      <p className="text-xs font-medium text-uae-black capitalize">{value}</p>
    </div>
  )
}

/* ─── Helpers ─── */

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function getDeadlineInfo(deadline: string): {
  value: string
  sublabel: string
  color: string
  bg: string
} {
  const now = new Date()
  const dl = new Date(deadline)
  const diffMs = dl.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return {
      value: `${Math.abs(diffDays)}`,
      sublabel: "days overdue",
      color: "text-white",
      bg: "bg-uae-red",
    }
  }
  if (diffDays <= 5) {
    return {
      value: `${diffDays}`,
      sublabel: "days left",
      color: "text-uae-red",
      bg: "bg-uae-red/10",
    }
  }
  if (diffDays <= 10) {
    return {
      value: `${diffDays}`,
      sublabel: "days left",
      color: "text-uae-gold",
      bg: "bg-uae-gold/10",
    }
  }
  return {
    value: `${diffDays}`,
    sublabel: "days left",
    color: "text-uae-green",
    bg: "bg-uae-green/10",
  }
}
