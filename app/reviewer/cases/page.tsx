"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  FolderOpen,
  Shield,
  Timer,
  ArrowRight,
  Loader2,
  Filter,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CaseItem {
  id: number
  caseNumber: string
  entity: string
  violatedCodes: Array<{ code: string }>
  violationSummary: string
  status: string
  notifiedAt: string | null
  deadline: string | null
  evidenceText: string | null
  evidenceSubmittedAt: string | null
  severity: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  flagged: { label: "Flagged", color: "text-uae-gold", bg: "bg-uae-gold/10" },
  notified: { label: "Notified", color: "text-uae-red", bg: "bg-uae-red/10" },
  evidence_submitted: { label: "Evidence Submitted", color: "text-blue-600", bg: "bg-blue-50" },
  compliant: { label: "Compliant", color: "text-uae-green", bg: "bg-uae-green/10" },
  non_compliant: { label: "Non-Compliant", color: "text-uae-red", bg: "bg-uae-red/10" },
  penalty: { label: "Penalty", color: "text-white", bg: "bg-uae-red" },
}

const ALL_STATUSES = Object.keys(STATUS_CONFIG)

export default function ReviewerCasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string>("all")

  useEffect(() => {
    fetch("/api/cases")
      .then((r) => r.json())
      .then((d) => { setCases(d.cases || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (activeFilter === "all") return cases
    return cases.filter((c) => c.status === activeFilter)
  }, [cases, activeFilter])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: cases.length }
    for (const c of cases) {
      counts[c.status] = (counts[c.status] || 0) + 1
    }
    return counts
  }, [cases])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 size={28} className="text-uae-gold animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-uae-gold/10 flex items-center justify-center">
          <FolderOpen size={20} className="text-uae-gold" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-uae-black">All Cases</h1>
          <p className="text-sm text-uae-black/50">{cases.length} total cases</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <Filter size={14} className="text-uae-black/30 shrink-0" />
        <button
          onClick={() => setActiveFilter("all")}
          className={cn(
            "text-xs font-medium px-3 py-1.5 rounded-full transition-colors shrink-0",
            activeFilter === "all"
              ? "bg-uae-black text-white"
              : "bg-uae-gray-50 text-uae-black/50 hover:bg-uae-gray-100"
          )}
        >
          All ({statusCounts.all || 0})
        </button>
        {ALL_STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s]
          const count = statusCounts[s] || 0
          if (count === 0) return null
          return (
            <button
              key={s}
              onClick={() => setActiveFilter(s)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-full transition-colors shrink-0",
                activeFilter === s
                  ? "bg-uae-black text-white"
                  : "bg-uae-gray-50 text-uae-black/50 hover:bg-uae-gray-100"
              )}
            >
              {cfg.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-xl border border-uae-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-uae-gray-100 bg-uae-gray-50/50">
              <th className="text-left px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-uae-black/40">Case</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-uae-black/40">Entity</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-uae-black/40">Status</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-uae-black/40">Violations</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-uae-black/40">Deadline</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-uae-gray-100">
            {filtered.map((c) => {
              const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.flagged
              const dl = c.deadline ? getDeadlineLabel(c.deadline) : null
              return (
                <tr key={c.id} className="hover:bg-uae-gray-50/30 transition-colors group">
                  <td className="px-5 py-3">
                    <p className="text-xs font-mono font-bold text-uae-black">{c.caseNumber}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-xs text-uae-black truncate max-w-[200px]">{c.entity}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded", st.bg, st.color)}>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <Shield size={11} className="text-uae-red/50" />
                      <span className="text-xs font-mono text-uae-black/60">{c.violatedCodes.length}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {dl ? (
                      <span className={cn("text-[10px] font-bold font-mono px-2 py-1 rounded", dl.bg, dl.color)}>
                        {dl.label}
                      </span>
                    ) : (
                      <span className="text-[10px] text-uae-black/30">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={`/reviewer/verify/${c.id}`}
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-uae-gold opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Review <ArrowRight size={11} />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-sm text-uae-black/40">No cases match this filter.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function getDeadlineLabel(deadline: string): { label: string; color: string; bg: string } {
  const diffDays = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, color: "text-white", bg: "bg-uae-red" }
  if (diffDays <= 5) return { label: `${diffDays}d left`, color: "text-uae-red", bg: "bg-uae-red/10" }
  if (diffDays <= 10) return { label: `${diffDays}d left`, color: "text-uae-gold", bg: "bg-uae-gold/10" }
  return { label: `${diffDays}d left`, color: "text-uae-green", bg: "bg-uae-green/10" }
}
