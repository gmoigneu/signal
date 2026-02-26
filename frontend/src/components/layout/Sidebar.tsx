import { Link, useRouterState } from '@tanstack/react-router'
import {
  Compass,
  Newspaper,
  PanelLeftClose,
  Rss,
  Settings,
  SquareCheck,
  Zap,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: Newspaper, label: 'DIGEST' },
  { to: '/sources', icon: Rss, label: 'SOURCES' },
  { to: '/review', icon: SquareCheck, label: 'REVIEW' },
  { to: '/discovery', icon: Compass, label: 'DISCOVER' },
  { to: '/settings', icon: Settings, label: 'SETTINGS' },
] as const

export default function Sidebar() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  function isActive(to: string) {
    if (to === '/') return currentPath === '/' || currentPath.startsWith('/digest')
    return currentPath.startsWith(to)
  }

  return (
    <aside className="flex flex-col justify-between w-[220px] min-w-[220px] h-screen bg-[#1a1a1a] px-4 py-6">
      <div className="flex flex-col gap-8">
        <Link to="/" className="flex items-center gap-2.5">
          <Zap className="w-5 h-5 text-[#C05A3C]" />
          <span className="font-heading text-lg font-bold tracking-[2px] text-[#F5F3EF]">
            SIGNAL
          </span>
        </Link>

        <nav className="flex flex-col">
          {navItems.map((item) => {
            const active = isActive(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3.5 px-2 py-3.5 border-t ${
                  active
                    ? 'border-t-2 border-[#C05A3C]'
                    : 'border-[#3a3a3a]'
                }`}
              >
                <item.icon
                  className={`w-5 h-5 ${active ? 'text-[#C05A3C]' : 'text-[#666666]'}`}
                />
                <span
                  className={`font-heading text-[13px] tracking-[1px] ${
                    active
                      ? 'font-semibold text-[#F5F3EF]'
                      : 'font-medium text-[#666666]'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#4A7C59]" />
          <span className="font-heading text-[11px] font-medium text-[#888888]">
            Last run: 2h ago
          </span>
        </div>
        <button className="flex items-center justify-center w-5 h-5">
          <PanelLeftClose className="w-3.5 h-3.5 text-[#666666]" />
        </button>
      </div>
    </aside>
  )
}
