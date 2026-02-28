"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export type Role = "citizen" | "reviewer" | "entity"

interface RoleContextType {
  role: Role
  setRole: (role: Role) => void
  roleLabel: string
}

const roleLabels: Record<Role, string> = {
  citizen: "Citizen",
  reviewer: "Government Reviewer",
  entity: "Entity Representative",
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("reviewer")

  return (
    <RoleContext.Provider value={{ role, setRole, roleLabel: roleLabels[role] }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = useContext(RoleContext)
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider")
  }
  return context
}
