"use client"

import { useState, useEffect } from "react"
import {
  MessageSquarePlus,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Send,
  RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"

const SERVICE_CHANNELS = [
  "Call Center",
  "Website",
  "Mobile App",
  "In Person",
  "Email",
]

const DISLIKE_TRAITS = [
  "Complex process",
  "Quality of Service",
  "Complaints Handling",
  "Employee Conduct",
  "Waiting Time",
  "Communication",
  "Accessibility",
  "Digital Experience",
  "Information Clarity",
]

interface AnalysisResult {
  classification: {
    sentiment: string
    is_complaint: boolean
    severity: string
    category: string
    summary: string
  }
  violations: Array<{
    code: string
    confidence: string
    explanation: string
  }>
  mode: string
}

type Step = "form" | "processing" | "confirmation"

export default function SubmitFeedbackPage() {
  const [entities, setEntities] = useState<string[]>([])
  const [fullForm, setFullForm] = useState(false)
  const [step, setStep] = useState<Step>("form")

  // Form state
  const [entity, setEntity] = useState("")
  const [channel, setChannel] = useState("")
  const [satisfied, setSatisfied] = useState<boolean | null>(null)
  const [comment, setComment] = useState("")
  const [selectedTraits, setSelectedTraits] = useState<string[]>([])

  // Result state
  const [result, setResult] = useState<{
    feedbackId: number
    analysis: AnalysisResult
  } | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/feedback")
      .then((r) => r.json())
      .then((data) => {
        if (data.entities) setEntities(data.entities)
      })
      .catch(() => {})
  }, [])

  function toggleTrait(trait: string) {
    setSelectedTraits((prev) =>
      prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!entity) return

    setError("")
    setStep("processing")

    try {
      // Step 1: Save feedback
      const feedbackType = satisfied === false ? "complaint" : satisfied === true ? "compliment" : "suggestion"
      const saveRes = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_name_en: entity,
          service_center_en: channel || null,
          feedback_type: feedbackType,
          dislike_traits: selectedTraits,
          dislike_comment: satisfied === false ? comment : null,
          general_comment: satisfied !== false ? comment : null,
        }),
      })

      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData.error || "Failed to save")

      // Step 2: Trigger AI analysis
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback_id: saveData.id }),
      })

      const analyzeData = await analyzeRes.json()

      // Minimum processing time for UX
      await new Promise((r) => setTimeout(r, 2000))

      if (!analyzeRes.ok) throw new Error(analyzeData.error || "Analysis failed")

      setResult({
        feedbackId: saveData.feedback_id,
        analysis: analyzeData,
      })
      setStep("confirmation")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setStep("form")
    }
  }

  function handleReset() {
    setStep("form")
    setEntity("")
    setChannel("")
    setSatisfied(null)
    setComment("")
    setSelectedTraits([])
    setResult(null)
    setError("")
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-uae-gold/10 flex items-center justify-center">
            <MessageSquarePlus size={20} className="text-uae-gold" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-uae-black">Submit Feedback</h1>
            <p className="text-sm text-uae-black/50">
              Share your experience with UAE government services
            </p>
          </div>
        </div>
      </div>

      {step === "form" && (
        <FormStep
          entities={entities}
          entity={entity}
          setEntity={setEntity}
          channel={channel}
          setChannel={setChannel}
          satisfied={satisfied}
          setSatisfied={setSatisfied}
          comment={comment}
          setComment={setComment}
          selectedTraits={selectedTraits}
          toggleTrait={toggleTrait}
          fullForm={fullForm}
          setFullForm={setFullForm}
          error={error}
          onSubmit={handleSubmit}
        />
      )}

      {step === "processing" && <ProcessingStep />}

      {step === "confirmation" && result && (
        <ConfirmationStep result={result} onReset={handleReset} />
      )}
    </div>
  )
}

/* ─── Form Step ─── */

function FormStep({
  entities,
  entity,
  setEntity,
  channel,
  setChannel,
  satisfied,
  setSatisfied,
  comment,
  setComment,
  selectedTraits,
  toggleTrait,
  fullForm,
  setFullForm,
  error,
  onSubmit,
}: {
  entities: string[]
  entity: string
  setEntity: (v: string) => void
  channel: string
  setChannel: (v: string) => void
  satisfied: boolean | null
  setSatisfied: (v: boolean | null) => void
  comment: string
  setComment: (v: string) => void
  selectedTraits: string[]
  toggleTrait: (t: string) => void
  fullForm: boolean
  setFullForm: (v: boolean) => void
  error: string
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="bg-white rounded-xl border border-uae-gray-100 shadow-sm overflow-hidden">
        {/* Form Header */}
        <div className="px-6 py-4 border-b border-uae-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-uae-black">
              {fullForm ? "Detailed Feedback Form" : "Quick Feedback"}
            </h2>
            <p className="text-xs text-uae-black/40 mt-0.5">
              All submissions are confidential
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFullForm(!fullForm)}
            className="text-xs font-medium text-uae-gold hover:text-uae-gold/80 transition-colors"
          >
            {fullForm ? "Switch to Quick Submit" : "Switch to Full Form"}
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Entity Dropdown */}
          <div>
            <label className="block text-xs font-medium text-uae-black/70 mb-1.5">
              Government Entity <span className="text-uae-red">*</span>
            </label>
            <div className="relative">
              <select
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
                required
                className="w-full h-10 pl-3 pr-10 text-sm bg-white border border-uae-gray-100 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-uae-gold/30 focus:border-uae-gold transition-colors text-uae-black"
              >
                <option value="">Select entity...</option>
                {entities.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-uae-black/30 pointer-events-none"
              />
            </div>
          </div>

          {/* Service Channel */}
          <div>
            <label className="block text-xs font-medium text-uae-black/70 mb-1.5">
              Service Channel
            </label>
            <div className="relative">
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full h-10 pl-3 pr-10 text-sm bg-white border border-uae-gray-100 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-uae-gold/30 focus:border-uae-gold transition-colors text-uae-black"
              >
                <option value="">Select channel...</option>
                {SERVICE_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-uae-black/30 pointer-events-none"
              />
            </div>
          </div>

          {/* Satisfaction Toggle */}
          <div>
            <label className="block text-xs font-medium text-uae-black/70 mb-2">
              Overall Satisfaction
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSatisfied(satisfied === true ? null : true)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 h-11 rounded-lg border text-sm font-medium transition-all",
                  satisfied === true
                    ? "border-uae-green bg-uae-green/5 text-uae-green"
                    : "border-uae-gray-100 text-uae-black/40 hover:border-uae-gray-200 hover:text-uae-black/60"
                )}
              >
                <ThumbsUp size={16} />
                Satisfied
              </button>
              <button
                type="button"
                onClick={() => setSatisfied(satisfied === false ? null : false)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 h-11 rounded-lg border text-sm font-medium transition-all",
                  satisfied === false
                    ? "border-uae-red bg-uae-red/5 text-uae-red"
                    : "border-uae-gray-100 text-uae-black/40 hover:border-uae-gray-200 hover:text-uae-black/60"
                )}
              >
                <ThumbsDown size={16} />
                Unsatisfied
              </button>
            </div>
          </div>

          {/* Dislike Traits — Full Form Only */}
          {fullForm && (
            <div>
              <label className="block text-xs font-medium text-uae-black/70 mb-2">
                Areas of Concern
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DISLIKE_TRAITS.map((trait) => {
                  const isSelected = selectedTraits.includes(trait)
                  return (
                    <button
                      key={trait}
                      type="button"
                      onClick={() => toggleTrait(trait)}
                      className={cn(
                        "px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left",
                        isSelected
                          ? "border-uae-gold bg-uae-gold/5 text-uae-gold"
                          : "border-uae-gray-100 text-uae-black/50 hover:border-uae-gray-200"
                      )}
                    >
                      {trait}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Comment */}
          <div>
            <label className="block text-xs font-medium text-uae-black/70 mb-1.5">
              Your Feedback
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="Share your experience... (Arabic or English)"
              className="w-full px-3 py-2.5 text-sm bg-white border border-uae-gray-100 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-uae-gold/30 focus:border-uae-gold transition-colors text-uae-black placeholder:text-uae-black/25"
            />
            <p className="text-[10px] text-uae-black/30 mt-1">
              You may write in Arabic or English. Your feedback is confidential.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-uae-red/5 border border-uae-red/20">
              <AlertTriangle size={14} className="text-uae-red shrink-0" />
              <p className="text-xs text-uae-red">{error}</p>
            </div>
          )}
        </div>

        {/* Form Footer */}
        <div className="px-6 py-4 border-t border-uae-gray-100 bg-uae-gray-50/50 flex justify-end">
          <button
            type="submit"
            disabled={!entity}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-lg bg-uae-gold text-white text-sm font-medium hover:bg-uae-gold/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={15} />
            Submit Feedback
          </button>
        </div>
      </div>
    </form>
  )
}

/* ─── Processing Step ─── */

function ProcessingStep() {
  const [phaseIndex, setPhaseIndex] = useState(0)

  const phases = [
    { label: "Saving your feedback...", icon: FileText },
    { label: "Analyzing with AI engine...", icon: Shield },
    { label: "Checking Emirates Code compliance...", icon: CheckCircle2 },
  ]

  useEffect(() => {
    const t1 = setTimeout(() => setPhaseIndex(1), 800)
    const t2 = setTimeout(() => setPhaseIndex(2), 1600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <div className="bg-white rounded-xl border border-uae-gray-100 shadow-sm p-12">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-uae-gold/10 flex items-center justify-center mb-6">
          <Loader2 size={28} className="text-uae-gold animate-spin" />
        </div>
        <h2 className="text-lg font-semibold text-uae-black mb-6">Processing Feedback</h2>
        <div className="space-y-3 w-full max-w-xs">
          {phases.map((phase, i) => {
            const Icon = phase.icon
            const state = i < phaseIndex ? "done" : i === phaseIndex ? "active" : "pending"
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-500",
                  state === "done" && "bg-uae-green/5",
                  state === "active" && "bg-uae-gold/5",
                  state === "pending" && "opacity-30"
                )}
              >
                {state === "done" ? (
                  <CheckCircle2 size={16} className="text-uae-green shrink-0" />
                ) : state === "active" ? (
                  <Loader2 size={16} className="text-uae-gold animate-spin shrink-0" />
                ) : (
                  <Icon size={16} className="text-uae-black/30 shrink-0" />
                )}
                <span
                  className={cn(
                    "text-sm",
                    state === "done" && "text-uae-green font-medium",
                    state === "active" && "text-uae-gold font-medium",
                    state === "pending" && "text-uae-black/40"
                  )}
                >
                  {phase.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─── Confirmation Step ─── */

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-uae-gray-50 text-uae-black/60 border-uae-gray-100",
  medium: "bg-uae-gold/5 text-uae-gold border-uae-gold/20",
  high: "bg-uae-red/5 text-uae-red border-uae-red/20",
  critical: "bg-uae-red/10 text-uae-red border-uae-red/30",
}

const SENTIMENT_CONFIG: Record<string, { label: string; color: string }> = {
  positive: { label: "Positive", color: "text-uae-green" },
  negative: { label: "Negative", color: "text-uae-red" },
  neutral: { label: "Neutral", color: "text-uae-black/50" },
}

function ConfirmationStep({
  result,
  onReset,
}: {
  result: { feedbackId: number; analysis: AnalysisResult }
  onReset: () => void
}) {
  const { classification, violations, mode } = result.analysis
  const sentiment = SENTIMENT_CONFIG[classification.sentiment] || SENTIMENT_CONFIG.neutral

  return (
    <div className="space-y-4">
      {/* Success Header */}
      <div className="bg-white rounded-xl border border-uae-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-uae-green/10 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} className="text-uae-green" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-uae-black">Feedback Submitted</h2>
            <p className="text-sm text-uae-black/50 mt-0.5">
              Your feedback has been recorded and analyzed.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-uae-gray-50 border border-uae-gray-100">
              <FileText size={14} className="text-uae-black/40" />
              <span className="text-xs font-mono font-medium text-uae-black">
                Feedback ID: #{result.feedbackId}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Analysis Summary */}
      <div className="bg-white rounded-xl border border-uae-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-uae-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-uae-gold" />
            <h3 className="text-sm font-semibold text-uae-black">AI Analysis</h3>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-uae-black/30 font-medium">
            {mode} mode
          </span>
        </div>

        <div className="p-6 space-y-4">
          {/* Classification Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="px-3 py-2.5 rounded-lg bg-uae-gray-50 border border-uae-gray-100">
              <p className="text-[10px] uppercase tracking-wider text-uae-black/40 mb-1">Sentiment</p>
              <p className={cn("text-sm font-semibold", sentiment.color)}>
                {sentiment.label}
              </p>
            </div>
            <div className="px-3 py-2.5 rounded-lg bg-uae-gray-50 border border-uae-gray-100">
              <p className="text-[10px] uppercase tracking-wider text-uae-black/40 mb-1">Type</p>
              <p className="text-sm font-semibold text-uae-black">
                {classification.is_complaint ? "Complaint" : "Feedback"}
              </p>
            </div>
            <div
              className={cn(
                "px-3 py-2.5 rounded-lg border",
                SEVERITY_STYLES[classification.severity] || SEVERITY_STYLES.low
              )}
            >
              <p className="text-[10px] uppercase tracking-wider opacity-60 mb-1">Severity</p>
              <p className="text-sm font-semibold capitalize">{classification.severity}</p>
            </div>
          </div>

          {/* Category */}
          <div className="px-3 py-2.5 rounded-lg bg-uae-gray-50 border border-uae-gray-100">
            <p className="text-[10px] uppercase tracking-wider text-uae-black/40 mb-1">Category</p>
            <p className="text-sm text-uae-black capitalize">
              {classification.category.replace(/_/g, " ")}
            </p>
          </div>

          {/* Summary */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-uae-black/40 mb-1">Summary</p>
            <p className="text-sm text-uae-black/70 leading-relaxed">
              {classification.summary}
            </p>
          </div>

          {/* Code Violations */}
          {violations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={13} className="text-uae-red" />
                <p className="text-[10px] uppercase tracking-wider text-uae-red font-medium">
                  Emirates Code Violations Detected ({violations.length})
                </p>
              </div>
              <div className="space-y-2">
                {violations.map((v, i) => (
                  <div
                    key={i}
                    className="px-3 py-2.5 rounded-lg border border-uae-red/10 bg-uae-red/[0.02]"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-semibold text-uae-red">
                        Code {v.code}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-medium",
                          v.confidence === "high"
                            ? "bg-uae-red/10 text-uae-red"
                            : v.confidence === "medium"
                              ? "bg-uae-gold/10 text-uae-gold"
                              : "bg-uae-gray-50 text-uae-black/50"
                        )}
                      >
                        {v.confidence} confidence
                      </span>
                    </div>
                    <p className="text-xs text-uae-black/60 leading-relaxed">
                      {v.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 h-10 px-6 rounded-lg border border-uae-gray-100 bg-white text-sm font-medium text-uae-black/60 hover:bg-uae-gray-50 transition-colors"
        >
          <RotateCcw size={15} />
          Submit Another
        </button>
      </div>
    </div>
  )
}
