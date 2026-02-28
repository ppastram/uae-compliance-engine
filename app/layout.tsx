import type { Metadata } from "next"
import { Toaster } from "sonner"
import { RoleProvider } from "@/lib/role-context"
import { DisclaimerBanner } from "@/components/layout/disclaimer-banner"
import { RoleSwitcher } from "@/components/layout/role-switcher"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import "./globals.css"

export const metadata: Metadata = {
  title: "UAE Compliance Engine",
  description: "Emirates Code Government Services Compliance Monitoring System",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <RoleProvider>
          <div className="min-h-screen flex flex-col">
            <DisclaimerBanner />
            <div className="flex flex-1">
              <Sidebar />
              <div className="flex-1 flex flex-col">
                <Header />
                <main className="flex-1 bg-uae-gray-50 p-6">
                  {children}
                </main>
              </div>
            </div>
            <RoleSwitcher />
          </div>
          <Toaster position="top-right" richColors />
        </RoleProvider>
      </body>
    </html>
  )
}
