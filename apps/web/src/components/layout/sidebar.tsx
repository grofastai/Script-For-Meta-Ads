'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/generate', label: 'Generate Script' },
  { href: '/hooks', label: 'Hook Bank' },
  { href: '/campaigns', label: 'Campaigns' },
  { href: '/competitors', label: 'Competitors' },
  { href: '/content-calendar', label: 'Content Calendar' },
  { href: '/settings', label: 'Settings' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 min-h-screen border-r bg-white flex flex-col">
      <div className="p-4 border-b">
        <span className="font-bold text-lg">ScriptSite</span>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'block px-3 py-2 rounded-md text-sm font-medium transition-colors',
              pathname === item.href
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
