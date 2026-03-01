"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Inbox,
  FileCheck,
  AlertTriangle,
  Scale,
  ArrowRight,
  Loader2,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface OverviewData {
  pendingReviews: number
  activeCases: number
  needsVerification: number
  penaltyCases: number
  totalCases: number
}

export default function ReviewerOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/reviewer/overview")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 size={28} className="text-uae-gold animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const cards = [
    {
      label: "Pending Reviews",
      description: "Flagged complaints awaiting reviewer assessment",
      value: data.pendingReviews,
      icon: Inbox,
      color: "text-uae-gold",
      bg: "bg-uae-gold/10",
      borderHover: "hover:border-uae-gold/30",
      href: "/reviewer/inbox",
      urgent: data.pendingReviews > 0,
    },
    {
      label: "Active Cases",
      description: "Notifications sent, awaiting entity response",
      value: data.activeCases,
      icon: FileCheck,
      color: "text-uae-gold",
      bg: "bg-uae-gold/10",
      borderHover: "hover:border-uae-gold/30",
      href: "/reviewer/cases?status=notified",
      urgent: false,
    },
    {
      label: "Needs Verification",
      description: "Entity evidence submitted, ready for review",
      value: data.needsVerification,
      icon: Shield,
      color: "text-uae-green",
      bg: "bg-uae-green/10",
      borderHover: "hover:border-uae-green/30",
      href: "/reviewer/cases?status=evidence_submitted",
      urgent: data.needsVerification > 0,
    },
    {
      label: "Penalty Applicable",
      description: "Deadline expired without entity response",
      value: data.penaltyCases,
      icon: AlertTriangle,
      color: "text-uae-red",
      bg: "bg-uae-red/10",
      borderHover: "hover:border-uae-red/30",
      href: "/reviewer/cases?status=penalty",
      urgent: data.penaltyCases > 0,
    },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-uae-gold/10 flex items-center justify-center">
            <Scale size={20} className="text-uae-gold" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-uae-black">Reviewer Console</h1>
            <p className="text-sm text-uae-black/50">
              Compliance monitoring and case management
            </p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={cn(
              "bg-white rounded-xl border border-uae-gray-100 shadow-sm p-5 transition-all group",
              card.borderHover
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", card.bg)}>
                <card.icon size={18} className={card.color} />
              </div>
              {card.urgent && (
                <span className="w-2.5 h-2.5 rounded-full bg-uae-red animate-pulse" />
              )}
            </div>
            <p className="text-3xl font-bold text-uae-black mb-1">{card.value}</p>
            <p className="text-sm font-medium text-uae-black">{card.label}</p>
            <p className="text-xs text-uae-black/40 mt-0.5">{card.description}</p>
            <div className="flex items-center gap-1 mt-3 text-xs font-medium text-uae-gold opacity-0 group-hover:opacity-100 transition-opacity">
              <span>View details</span>
              <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-uae-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-uae-black/40 uppercase tracking-wider">Total Cases</p>
            <p className="text-lg font-bold text-uae-black mt-0.5">{data.totalCases}</p>
          </div>
          <Link
            href="/reviewer/inbox"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-uae-gold text-white text-sm font-medium hover:bg-uae-gold/90 transition-colors"
          >
            <Inbox size={15} />
            Open Inbox
          </Link>
        </div>
      </div>
    </div>
  )
}
