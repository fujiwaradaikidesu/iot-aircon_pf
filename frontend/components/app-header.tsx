"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  { href: "/", label: "リモコン" },
  { href: "/schedule", label: "スケジュール" },
]

export default function AppHeader() {
  const pathname = usePathname()

  return (
    <header className="border-b border-white/10 bg-gradient-to-r from-gray-900 via-slate-900 to-gray-800">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">Smart Climate</p>
          <h1 className="text-2xl font-semibold">Aircon Controller</h1>
        </div>

        <nav className="flex items-center gap-3 rounded-full bg-white/10 p-1 backdrop-blur">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative inline-flex items-center rounded-full px-6 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-white text-gray-900 shadow-lg shadow-black/10"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute inset-0 -z-10 rounded-full bg-white blur-xl opacity-70" />
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

