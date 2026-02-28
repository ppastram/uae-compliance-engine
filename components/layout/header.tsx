"use client"

import { useRole } from "@/lib/role-context"
import { Bell } from "lucide-react"

export function Header() {
  const { roleLabel } = useRole()

  return (
    <header className="h-14 bg-white border-b border-uae-gray-100 flex items-center justify-between px-6">
      <div>
        <h2 className="text-sm font-semibold text-uae-black">
          Government Services Compliance Engine
        </h2>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-uae-gray-50 transition-colors">
          <Bell size={18} className="text-uae-black/60" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-uae-red rounded-full" />
        </button>
        <div className="h-8 w-px bg-uae-gray-100" />
        <div className="text-right">
          <p className="text-xs font-medium text-uae-black">{roleLabel}</p>
          <p className="text-[10px] text-uae-gray-200">Demo User</p>
        </div>
      </div>
    </header>
  )
}
