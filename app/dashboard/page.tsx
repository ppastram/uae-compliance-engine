"use client"

import { useState, useEffect, useMemo } from "react"
import {
  BarChart3,
  MessageSquare,
  AlertTriangle,
  Shield,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Loader2,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts"

/* ─── Types ─── */

interface DashboardData {
  kpis: {
    totalFeedback: number
    totalComplaints: number
    totalWithViolations: number
    complianceRate: number
  }
  sentimentDistribution: Array<{ name: string; value: number }>
  weeklyVolume: Array<{ week: string; total: number; complaints: number }>
  entityBreakdown: Array<{
    entity: string
    total: number
    complaints: number
    violations: number
    complianceScore: number
  }>
  topCategories: Array<{ category: string; count: number }>
  topViolatedCodes: Array<{
    code: string
    count: number
    description: string
    pillar: string
    category: string
  }>
  recentFlagged: Array<{
    id: number
    feedbackId: number
    entity: string
    severity: string
    category: string
    summary: string | null
    excerpt: string
    date: string
    violationCount: number
  }>
}

/* ─── Constants ─── */

const UAE_GOLD = "#CA9A2C"
const UAE_GREEN = "#006B48"
const UAE_RED = "#C8102E"
const UAE_BLACK = "#232528"

const SENTIMENT_COLORS: Record<string, string> = {
  positive: UAE_GREEN,
  negative: UAE_RED,
  neutral: "#CCCCCC",
}

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-uae-gray-50 text-uae-black/60",
  medium: "bg-uae-gold/10 text-uae-gold",
  high: "bg-uae-red/10 text-uae-red",
  critical: "bg-uae-red/20 text-uae-red font-semibold",
}

/* ─── Page ─── */

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 size={32} className="text-uae-gold animate-spin mx-auto mb-3" />
          <p className="text-sm text-uae-black/40">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-sm text-uae-red">Failed to load dashboard data.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-uae-black">Intelligence Dashboard</h1>
          <p className="text-xs text-uae-black/40 mt-0.5">
            Emirates Code Compliance Monitoring — Real-time Overview
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-uae-black/40">
          <Clock size={13} />
          <span>Last updated: {new Date().toLocaleString("en-AE")}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Total Feedback"
          value={data.kpis.totalFeedback}
          icon={MessageSquare}
          color="text-uae-gold"
          bgColor="bg-uae-gold/10"
        />
        <KpiCard
          label="Complaints Detected"
          value={data.kpis.totalComplaints}
          icon={AlertTriangle}
          color="text-uae-red"
          bgColor="bg-uae-red/10"
          subtitle={`${Math.round((data.kpis.totalComplaints / data.kpis.totalFeedback) * 100)}% of total`}
        />
        <KpiCard
          label="Code Violations"
          value={data.kpis.totalWithViolations}
          icon={Shield}
          color="text-uae-red"
          bgColor="bg-uae-red/10"
          subtitle="Flagged for review"
        />
        <KpiCard
          label="Compliance Rate"
          value={`${data.kpis.complianceRate}%`}
          icon={TrendingUp}
          color="text-uae-green"
          bgColor="bg-uae-green/10"
          subtitle="Without violations"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2">
          <SentimentDonut data={data.sentimentDistribution} />
        </div>
        <div className="col-span-3">
          <VolumeChart data={data.weeklyVolume} />
        </div>
      </div>

      {/* Analysis Row */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3">
          <EntityTable data={data.entityBreakdown} />
        </div>
        <div className="col-span-2">
          <CategoryChart data={data.topCategories} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-4">
        <ViolatedCodesTable data={data.topViolatedCodes} />
        <RecentFlagged data={data.recentFlagged} />
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
  bgColor,
  subtitle,
}: {
  label: string
  value: number | string
  icon: typeof MessageSquare
  color: string
  bgColor: string
  subtitle?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-uae-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-uae-black/50 uppercase tracking-wider">
          {label}
        </p>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", bgColor)}>
          <Icon size={16} className={color} />
        </div>
      </div>
      <p className="text-2xl font-bold text-uae-black tracking-tight">{value}</p>
      {subtitle && (
        <p className="text-[11px] text-uae-black/35 mt-1">{subtitle}</p>
      )}
    </div>
  )
}

/* ─── Sentiment Donut ─── */

function SentimentDonut({ data }: { data: Array<{ name: string; value: number }> }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <DashboardCard title="Sentiment Distribution" subtitle="AI-classified feedback">
      <div className="flex items-center gap-6">
        <div className="w-44 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={72}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={SENTIMENT_COLORS[entry.name] || "#CCCCCC"}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ payload }) => {
                  if (!payload?.length) return null
                  const d = payload[0]
                  return (
                    <div className="bg-white shadow-lg border border-uae-gray-100 rounded-lg px-3 py-2 text-xs">
                      <p className="font-medium text-uae-black capitalize">{d.name}</p>
                      <p className="text-uae-black/50">{d.value} ({Math.round(((d.value as number) / total) * 100)}%)</p>
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-3">
          {data.map((entry) => {
            const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0
            return (
              <div key={entry.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: SENTIMENT_COLORS[entry.name] || "#CCCCCC" }}
                    />
                    <span className="text-xs font-medium text-uae-black capitalize">
                      {entry.name}
                    </span>
                  </div>
                  <span className="text-xs text-uae-black/50 font-mono">{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-uae-gray-50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: SENTIMENT_COLORS[entry.name] || "#CCCCCC",
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </DashboardCard>
  )
}

/* ─── Volume Line Chart ─── */

function VolumeChart({ data }: { data: Array<{ week: string; total: number; complaints: number }> }) {
  return (
    <DashboardCard title="Feedback Volume" subtitle="Weekly trend over time">
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: "#CCCCCC" }}
              tickFormatter={(v) => {
                const d = new Date(v)
                return `${d.getDate()}/${d.getMonth() + 1}`
              }}
              interval={Math.max(0, Math.floor(data.length / 8))}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#CCCCCC" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ payload, label }) => {
                if (!payload?.length) return null
                return (
                  <div className="bg-white shadow-lg border border-uae-gray-100 rounded-lg px-3 py-2 text-xs">
                    <p className="font-medium text-uae-black/50 mb-1">Week of {label}</p>
                    {payload.map((p) => (
                      <p key={p.dataKey as string} style={{ color: p.color }}>
                        {p.dataKey === "total" ? "Total" : "Complaints"}: {p.value}
                      </p>
                    ))}
                  </div>
                )
              }}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke={UAE_GOLD}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: UAE_GOLD }}
            />
            <Line
              type="monotone"
              dataKey="complaints"
              stroke={UAE_RED}
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 4"
              activeDot={{ r: 3, fill: UAE_RED }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-5 mt-2 justify-center">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 rounded-full bg-uae-gold" />
          <span className="text-[10px] text-uae-black/40">Total Feedback</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 rounded-full bg-uae-red border-dashed" style={{ borderTop: "1.5px dashed #C8102E", height: 0 }} />
          <span className="text-[10px] text-uae-black/40">Complaints</span>
        </div>
      </div>
    </DashboardCard>
  )
}

/* ─── Entity Table ─── */

type SortField = "entity" | "total" | "complaints" | "violations" | "complianceScore"

function EntityTable({
  data,
}: {
  data: Array<{
    entity: string
    total: number
    complaints: number
    violations: number
    complianceScore: number
  }>
}) {
  const [sortField, setSortField] = useState<SortField>("violations")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })
  }, [data, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  function SortHeader({ field, children }: { field: SortField; children: React.ReactNode }) {
    const isActive = sortField === field
    return (
      <button
        onClick={() => toggleSort(field)}
        className="flex items-center gap-1 group"
      >
        <span>{children}</span>
        {isActive ? (
          sortDir === "asc" ? (
            <ChevronUp size={12} className="text-uae-gold" />
          ) : (
            <ChevronDown size={12} className="text-uae-gold" />
          )
        ) : (
          <ArrowUpDown size={11} className="text-uae-black/20 group-hover:text-uae-black/40" />
        )}
      </button>
    )
  }

  return (
    <DashboardCard title="Entity Breakdown" subtitle="Performance by government entity">
      <div className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-uae-gray-100">
              {(
                [
                  ["entity", "Entity"],
                  ["total", "Total"],
                  ["complaints", "Complaints"],
                  ["violations", "Violations"],
                  ["complianceScore", "Compliance"],
                ] as [SortField, string][]
              ).map(([field, label]) => (
                <th
                  key={field}
                  className={cn(
                    "pb-2 text-[10px] font-semibold uppercase tracking-wider text-uae-black/40",
                    field === "entity" ? "text-left" : "text-right"
                  )}
                >
                  <SortHeader field={field}>{label}</SortHeader>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.entity}
                className="border-b border-uae-gray-50 last:border-0 hover:bg-uae-gray-50/50 transition-colors cursor-pointer"
              >
                <td className="py-2.5 text-xs font-medium text-uae-black pr-4">
                  {row.entity}
                </td>
                <td className="py-2.5 text-xs text-uae-black/60 text-right font-mono">
                  {row.total}
                </td>
                <td className="py-2.5 text-xs text-right font-mono">
                  <span className={row.complaints > 0 ? "text-uae-red" : "text-uae-black/40"}>
                    {row.complaints}
                  </span>
                </td>
                <td className="py-2.5 text-xs text-right font-mono">
                  <span className={row.violations > 0 ? "text-uae-red font-medium" : "text-uae-black/40"}>
                    {row.violations}
                  </span>
                </td>
                <td className="py-2.5 text-right">
                  <CompliancePill score={row.complianceScore} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  )
}

function CompliancePill({ score }: { score: number }) {
  const color =
    score >= 95 ? "text-uae-green bg-uae-green/10" :
    score >= 90 ? "text-uae-gold bg-uae-gold/10" :
    "text-uae-red bg-uae-red/10"
  return (
    <span className={cn("inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono", color)}>
      {score}%
    </span>
  )
}

/* ─── Category Bar Chart ─── */

function CategoryChart({ data }: { data: Array<{ category: string; count: number }> }) {
  const formatted = data.map((d) => ({
    ...d,
    label: d.category
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .slice(0, 25),
  }))

  return (
    <DashboardCard title="Top Complaint Categories" subtitle="By frequency">
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={formatted}
            layout="vertical"
            margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "#CCCCCC" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 10, fill: "#232528" }}
              width={130}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null
                const d = payload[0].payload
                return (
                  <div className="bg-white shadow-lg border border-uae-gray-100 rounded-lg px-3 py-2 text-xs">
                    <p className="font-medium text-uae-black">{d.label}</p>
                    <p className="text-uae-black/50">{d.count} complaints</p>
                  </div>
                )
              }}
            />
            <Bar dataKey="count" fill={UAE_GOLD} radius={[0, 4, 4, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </DashboardCard>
  )
}

/* ─── Violated Codes Table ─── */

function ViolatedCodesTable({
  data,
}: {
  data: Array<{
    code: string
    count: number
    description: string
    pillar: string
    category: string
  }>
}) {
  return (
    <DashboardCard title="Top Violated Emirates Codes" subtitle="Most frequently flagged rules">
      <div className="space-y-2">
        {data.map((row, i) => (
          <div
            key={row.code}
            className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-uae-gray-50/50 transition-colors"
          >
            <span className="text-xs font-bold text-uae-black/20 w-4 mt-0.5 text-right shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-mono font-bold text-uae-red">
                  {row.code}
                </span>
                <span className="text-[10px] text-uae-black/30">
                  {row.category}
                </span>
              </div>
              <p className="text-[11px] text-uae-black/50 leading-relaxed truncate">
                {row.description}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-bold font-mono text-uae-red">
                {row.count}
              </span>
              <p className="text-[9px] text-uae-black/30 uppercase">flags</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  )
}

/* ─── Recent Flagged ─── */

function RecentFlagged({
  data,
}: {
  data: Array<{
    id: number
    feedbackId: number
    entity: string
    severity: string
    category: string
    summary: string | null
    excerpt: string
    date: string
    violationCount: number
  }>
}) {
  return (
    <DashboardCard title="Recent Flagged Items" subtitle="Latest compliance alerts">
      <div className="space-y-2">
        {data.map((item) => (
          <div
            key={item.id}
            className="px-3 py-2.5 rounded-lg border border-uae-gray-100 hover:border-uae-red/20 hover:bg-uae-red/[0.01] transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded",
                    SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.medium
                  )}
                >
                  {item.severity}
                </span>
                <span className="text-[10px] text-uae-black/30 font-mono">
                  #{item.feedbackId}
                </span>
              </div>
              <span className="text-[10px] text-uae-black/30">{item.date}</span>
            </div>
            <p className="text-xs font-medium text-uae-black mb-0.5">{item.entity}</p>
            <p className="text-[11px] text-uae-black/45 leading-relaxed line-clamp-2">
              {item.summary || item.excerpt || "Flagged for compliance review"}
            </p>
            <div className="flex items-center gap-1 mt-1.5">
              <Shield size={10} className="text-uae-red/50" />
              <span className="text-[10px] text-uae-red/60">
                {item.violationCount} code violation{item.violationCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  )
}

/* ─── Shared Card Wrapper ─── */

function DashboardCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-uae-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-uae-gray-100">
        <h3 className="text-sm font-semibold text-uae-black">{title}</h3>
        {subtitle && (
          <p className="text-[10px] text-uae-black/35 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}
