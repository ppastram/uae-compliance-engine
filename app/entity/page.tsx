"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Building2,
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Shield,
  ArrowRight,
  Loader2,
  FileText,
  Timer,
  LogIn,
  Mail,
  Lock,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ─── Types ─── */

interface CaseItem {
  id: number
  caseNumber: string
  entity: string
  violatedCodes: Array<{ code: string; confidence: string; explanation: string }>
  violationSummary: string
  status: string
  notifiedAt: string | null
  deadline: string | null
  evidenceText: string | null
  evidenceSubmittedAt: string | null
  severity: string | null
  category: string | null
}

/* ─── Constants ─── */

const ENTITIES = [
  "Federal Authority for Identity & Citizenship",
  "Ministry of Health & Prevention",
  "Ministry of Interior",
  "Ministry of Human Resources",
  "Dubai Electricity & Water Authority",
  "Abu Dhabi Digital Authority",
  "Sharjah Municipality",
  "Ajman Government Services",
  "Roads & Transport Authority",
  "Dubai Municipality",
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  flagged: { label: "Under Review", color: "text-uae-gold", bg: "bg-uae-gold/10" },
  notified: { label: "Awaiting Response", color: "text-uae-red", bg: "bg-uae-red/10" },
  evidence_submitted: { label: "Evidence Submitted", color: "text-uae-green", bg: "bg-uae-green/10" },
  compliant: { label: "Compliant", color: "text-uae-green", bg: "bg-uae-green/10" },
  non_compliant: { label: "Non-Compliant", color: "text-uae-red", bg: "bg-uae-red/10" },
  penalty: { label: "Penalty Applicable", color: "text-uae-red", bg: "bg-uae-red/15" },
}

/* ─── Page ─── */

export default function EntityPortalPage() {
  const [loggedInEntity, setLoggedInEntity] = useState<string | null>(null)

  if (!loggedInEntity) {
    return <EntityLoginScreen onLogin={setLoggedInEntity} />
  }

  return <EntityDashboard entity={loggedInEntity} onLogout={() => setLoggedInEntity(null)} />
}

/* ─── Login Screen ─── */

function EntityLoginScreen({ onLogin }: { onLogin: (entity: string) => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [entity, setEntity] = useState("")
  const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address")
      return
    }
    if (!password) {
      setError("Please enter your password")
      return
    }
    if (!entity) {
      setError("Please select your entity")
      return
    }

    onLogin(entity)
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-uae-gold/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building2 size={28} className="text-uae-gold" />
          </div>
          <h1 className="text-xl font-semibold text-uae-black">Entity Portal</h1>
          <p className="text-sm text-uae-black/40 mt-1">
            Sign in to manage compliance notifications
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-uae-gray-100 shadow-sm p-6 space-y-4">
          {/* Entity Selector */}
          <div>
            <label className="block text-xs font-medium text-uae-black/60 mb-1.5">Entity</label>
            <select
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-uae-gray-100 bg-white text-sm text-uae-black focus:outline-none focus:ring-2 focus:ring-uae-gold/30 focus:border-uae-gold"
            >
              <option value="">Select your entity...</option>
              {ENTITIES.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-uae-black/60 mb-1.5">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-uae-black/25" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@entity.gov.ae"
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-uae-gray-100 text-sm text-uae-black placeholder:text-uae-black/20 focus:outline-none focus:ring-2 focus:ring-uae-gold/30 focus:border-uae-gold"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-uae-black/60 mb-1.5">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-uae-black/25" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-uae-gray-100 text-sm text-uae-black placeholder:text-uae-black/20 focus:outline-none focus:ring-2 focus:ring-uae-gold/30 focus:border-uae-gold"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-uae-red">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full h-10 rounded-lg bg-uae-gold text-white text-sm font-medium hover:bg-uae-gold/90 transition-colors flex items-center justify-center gap-2"
          >
            <LogIn size={15} />
            Sign In
          </button>

          {/* Note */}
          <p className="text-[10px] text-uae-black/25 text-center pt-1">
            {/* TODO: Production Feature — Real authentication */}
            Demo mode — any valid email and password will be accepted
          </p>
        </form>
      </div>
    </div>
  )
}

/* ─── Entity Dashboard ─── */

function EntityDashboard({ entity, onLogout }: { entity: string; onLogout: () => void }) {
  const [cases, setCases] = useState<CaseItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/cases?entity=${encodeURIComponent(entity)}`)
      .then((r) => r.json())
      .then((d) => { setCases(d.cases || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [entity])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 size={28} className="text-uae-gold animate-spin" />
      </div>
    )
  }

  const activeNotifications = cases.filter((c) => c.status === "notified").length
  const pendingResponse = cases.filter((c) => c.status === "notified" || c.status === "flagged").length
  const resolvedCases = cases.filter((c) => ["compliant", "non_compliant"].includes(c.status)).length
  const penaltyCases = cases.filter((c) => c.status === "penalty").length

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-uae-gold/10 flex items-center justify-center">
            <Building2 size={20} className="text-uae-gold" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-uae-black">Entity Portal</h1>
            <p className="text-sm text-uae-black/50">{entity}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 h-9 px-4 rounded-lg border border-uae-gray-100 text-xs font-medium text-uae-black/50 hover:bg-uae-gray-50 transition-colors"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Active Notifications"
          value={activeNotifications}
          icon={Bell}
          color="text-uae-red"
          bg="bg-uae-red/10"
        />
        <KpiCard
          label="Pending Responses"
          value={pendingResponse}
          icon={Clock}
          color="text-uae-gold"
          bg="bg-uae-gold/10"
        />
        <KpiCard
          label="Resolved Cases"
          value={resolvedCases}
          icon={CheckCircle2}
          color="text-uae-green"
          bg="bg-uae-green/10"
        />
        <KpiCard
          label="Penalties"
          value={penaltyCases}
          icon={AlertTriangle}
          color="text-uae-red"
          bg="bg-uae-red/15"
          urgent={penaltyCases > 0}
        />
      </div>

      {/* Cases List */}
      <div className="bg-white rounded-xl border border-uae-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-uae-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-uae-gold" />
            <h2 className="text-sm font-semibold text-uae-black">Your Cases</h2>
          </div>
          <span className="text-xs text-uae-black/40">{cases.length} total</span>
        </div>

        {cases.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 size={32} className="text-uae-green mx-auto mb-2" />
            <p className="text-sm text-uae-black/50">No compliance cases for your entity.</p>
          </div>
        ) : (
          <div className="divide-y divide-uae-gray-100">
            {cases.map((c) => (
              <CaseRow key={c.id} caseItem={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── KPI Card ─── */

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  urgent,
}: {
  label: string
  value: number
  icon: typeof Bell
  color: string
  bg: string
  urgent?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-uae-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-uae-black/50 uppercase tracking-wider">{label}</p>
        <div className="relative">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", bg)}>
            <Icon size={16} className={color} />
          </div>
          {urgent && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-uae-red rounded-full animate-pulse" />
          )}
        </div>
      </div>
      <p className="text-2xl font-bold text-uae-black">{value}</p>
    </div>
  )
}

/* ─── Case Row ─── */

function CaseRow({ caseItem }: { caseItem: CaseItem }) {
  const status = STATUS_CONFIG[caseItem.status] || STATUS_CONFIG.flagged
  const deadline = caseItem.deadline ? getDeadlineInfo(caseItem.deadline) : null
  const needsResponse = caseItem.status === "notified"

  return (
    <Link
      href={`/entity/respond/${caseItem.id}`}
      className={cn(
        "flex items-center gap-4 px-5 py-4 hover:bg-uae-gray-50/30 transition-colors group",
        caseItem.status === "penalty" && "bg-uae-red/[0.02]"
      )}
    >
      {/* Case Number */}
      <div className="w-32 shrink-0">
        <p className="text-xs font-mono font-bold text-uae-black">{caseItem.caseNumber}</p>
      </div>

      {/* Status Badge */}
      <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded shrink-0", status.bg, status.color)}>
        {status.label}
      </span>

      {/* Violated Codes */}
      <div className="flex-1 flex items-center gap-1.5 min-w-0 overflow-hidden">
        {caseItem.violatedCodes.slice(0, 4).map((v) => (
          <span
            key={v.code}
            className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-uae-red/5 text-uae-red/70 shrink-0"
          >
            {v.code}
          </span>
        ))}
        {caseItem.violatedCodes.length > 4 && (
          <span className="text-[10px] text-uae-black/30">
            +{caseItem.violatedCodes.length - 4}
          </span>
        )}
      </div>

      {/* Deadline */}
      {deadline ? (
        <div className={cn("flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-lg", deadline.bg)}>
          <Timer size={12} className={deadline.color} />
          <span className={cn("text-xs font-bold font-mono", deadline.color)}>
            {deadline.label}
          </span>
        </div>
      ) : (
        <div className="w-24 shrink-0" />
      )}

      {/* Arrow */}
      <ArrowRight
        size={16}
        className={cn(
          "shrink-0 transition-all",
          needsResponse
            ? "text-uae-red group-hover:translate-x-0.5"
            : "text-uae-black/20 group-hover:text-uae-black/40 group-hover:translate-x-0.5"
        )}
      />
    </Link>
  )
}

/* ─── Deadline Helpers ─── */

function getDeadlineInfo(deadline: string): { label: string; color: string; bg: string } {
  const now = new Date()
  const dl = new Date(deadline)
  const diffMs = dl.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return {
      label: `${Math.abs(diffDays)}d overdue`,
      color: "text-white",
      bg: "bg-uae-red",
    }
  }
  if (diffDays <= 5) {
    return {
      label: `${diffDays}d left`,
      color: "text-uae-red",
      bg: "bg-uae-red/10",
    }
  }
  if (diffDays <= 10) {
    return {
      label: `${diffDays}d left`,
      color: "text-uae-gold",
      bg: "bg-uae-gold/10",
    }
  }
  return {
    label: `${diffDays}d left`,
    color: "text-uae-green",
    bg: "bg-uae-green/10",
  }
}
