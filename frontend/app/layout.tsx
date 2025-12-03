import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import AppHeader from "@/components/app-header"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "エアコンリモコン",
  description: "モダンなエアコンリモコンアプリ",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-slate-950 text-white`}>
        <div className="min-h-screen bg-slate-950">
          <AppHeader />
          <main className="mx-auto w-full max-w-6xl px-4 py-10">
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl shadow-black/30 backdrop-blur">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
