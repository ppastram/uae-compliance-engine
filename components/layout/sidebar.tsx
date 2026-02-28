"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRole, type Role } from "@/lib/role-context"
import {
  LayoutDashboard,
  MessageSquarePlus,
  Inbox,
  CheckCircle,
  Building2,
  FileText,
  BarChart3,
  FolderOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  label: string
  href: string
  icon: typeof LayoutDashboard
}

const navByRole: Record<Role, NavItem[]> = {
  citizen: [
    { label: "Submit Feedback", href: "/submit-feedback", icon: MessageSquarePlus },
  ],
  reviewer: [
    { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
    { label: "Reviewer Inbox", href: "/reviewer/inbox", icon: Inbox },
    { label: "Cases", href: "/reviewer/cases", icon: FolderOpen },
    { label: "Overview", href: "/reviewer", icon: CheckCircle },
  ],
  entity: [
    { label: "Entity Portal", href: "/entity", icon: Building2 },
  ],
}

export function Sidebar() {
  const { role, roleLabel } = useRole()
  const pathname = usePathname()
  const items = navByRole[role]

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-uae-gray-100 flex flex-col">
      {/* Logo / Brand */}
      <div className="p-6 border-b border-uae-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-uae-gold rounded-md flex items-center justify-center">
            <FileText size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-uae-black leading-tight">
              UAE Compliance
            </h1>
            <p className="text-[10px] text-uae-gray-200 uppercase tracking-wider">
              Monitoring Engine
            </p>
          </div>
        </div>
      </div>

      {/* Role Indicator */}
      <div className="px-6 py-3 border-b border-uae-gray-100">
        <p className="text-[10px] uppercase tracking-widest text-uae-gray-200">
          Viewing as
        </p>
        <p className="text-sm font-medium text-uae-black mt-0.5">{roleLabel}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-uae-gold/10 text-uae-gold"
                      : "text-uae-black/60 hover:bg-uae-gray-50 hover:text-uae-black"
                  )}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-uae-gray-100">
        <p className="text-[10px] text-uae-gray-200 text-center">
          Emirates Code Compliance v0.1
        </p>
      </div>
    </aside>
  )
}
