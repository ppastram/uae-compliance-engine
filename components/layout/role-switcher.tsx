"use client"

import { useRouter } from "next/navigation"
import { useRole, type Role } from "@/lib/role-context"
import { Users, Shield, Building2 } from "lucide-react"

const roleDefaultRoute: Record<Role, string> = {
  citizen: "/submit-feedback",
  reviewer: "/dashboard",
  entity: "/entity",
}

const roles: { value: Role; label: string; icon: typeof Users }[] = [
  { value: "citizen", label: "Citizen", icon: Users },
  { value: "reviewer", label: "Reviewer", icon: Shield },
  { value: "entity", label: "Entity", icon: Building2 },
]

export function RoleSwitcher() {
  const { role, setRole } = useRole()
  const router = useRouter()

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-uae-black/90 text-white rounded-lg shadow-2xl p-3 backdrop-blur-sm">
      <p className="text-[10px] uppercase tracking-widest text-uae-gray-200 mb-2 text-center">
        Role Switcher
      </p>
      <div className="flex gap-1">
        {roles.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => { setRole(value); router.push(roleDefaultRoute[value]) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              role === value
                ? "bg-uae-gold text-white"
                : "bg-white/10 text-uae-gray-200 hover:bg-white/20"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
