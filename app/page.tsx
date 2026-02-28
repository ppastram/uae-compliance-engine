"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useRole } from "@/lib/role-context"

const roleRoutes = {
  citizen: "/submit-feedback",
  reviewer: "/dashboard",
  entity: "/entity",
}

export default function HomePage() {
  const { role } = useRole()
  const router = useRouter()

  useEffect(() => {
    router.replace(roleRoutes[role])
  }, [role, router])

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-uae-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-uae-black/60">Redirecting...</p>
      </div>
    </div>
  )
}
