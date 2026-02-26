import { createFileRoute } from '@tanstack/react-router'
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Star,
} from 'lucide-react'
import { useState } from 'react'
import ItemCard from '../components/digest/ItemCard'
import QuickAddModal from '../components/digest/QuickAddModal'
import Topbar from '../components/layout/Topbar'
import { categories, digestItems } from '../lib/mock-data'

export const Route = createFileRoute('/')({
  component: DigestPage,
})

function DigestPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [starredOnly, setStarredOnly] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const filtered = digestItems.filter((item) => {
    if (activeCategory && !item.categories.some((c) => c.slug === activeCategory))
      return false
    if (starredOnly && !item.is_starred) return false
    if (unreadOnly && item.is_read) return false
    return true
  })

  const totalItems = digestItems.length
  const unreadCount = digestItems.filter((i) => !i.is_read).length
  const starredCount = digestItems.filter((i) => i.is_starred).length

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Daily Digest, Wed, Feb 26, 2026"
        showSearch
        showPipeline
      />

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-5 px-8 py-6">
          {/* Date nav */}
          <div className="flex items-center gap-3">
            <button className="flex items-center justify-center w-8 h-8 bg-[#E8E4DC] rounded-sm">
              <ChevronLeft className="w-4 h-4 text-[#555555]" />
            </button>
            <button className="flex items-center gap-2 bg-[#E8E4DC] px-3 py-1.5 rounded-sm">
              <Calendar className="w-3.5 h-3.5 text-[#555555]" />
              <span className="font-heading text-[13px] font-semibold text-[#1a1a1a]">
                Feb 26, 2026
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#555555]" />
            </button>
            <button className="flex items-center justify-center w-8 h-8 bg-[#E8E4DC] rounded-sm">
              <ChevronRight className="w-4 h-4 text-[#555555]" />
            </button>
          </div>

          {/* Stats bar */}
          <div className="flex gap-4">
            {[
              { label: 'TOTAL', value: String(totalItems), color: '#1a1a1a' },
              { label: 'UNREAD', value: String(unreadCount), color: '#C05A3C' },
              { label: 'STARRED', value: String(starredCount), color: '#1a1a1a' },
              { label: 'SOURCES', value: '24', color: '#4A7C59' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-2 bg-[#E8E4DC] px-3.5 py-2 rounded-sm flex-1"
              >
                <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
                  {stat.label}
                </span>
                <span
                  className="font-heading text-lg font-bold"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          {/* Filter bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-2.5 py-1 rounded-sm text-[12px] font-heading font-medium ${
                  !activeCategory
                    ? 'bg-[#1a1a1a] text-[#F5F3EF]'
                    : 'bg-[#E8E4DC] text-[#555555]'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() =>
                    setActiveCategory(activeCategory === cat.slug ? null : cat.slug)
                  }
                  className={`px-2.5 py-1 rounded-sm text-[12px] font-heading font-medium ${
                    activeCategory === cat.slug
                      ? 'bg-[#1a1a1a] text-[#F5F3EF]'
                      : 'bg-[#E8E4DC] text-[#555555]'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 bg-[#E8E4DC] px-2.5 py-1 rounded-sm text-[12px] font-heading text-[#555555]">
                Source
                <ChevronDown className="w-3 h-3" />
              </button>
              <button
                onClick={() => setStarredOnly(!starredOnly)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[12px] font-heading ${
                  starredOnly
                    ? 'bg-[#1a1a1a] text-[#F5F3EF]'
                    : 'bg-[#E8E4DC] text-[#555555]'
                }`}
              >
                <Star className="w-3 h-3" />
                Starred
              </button>
              <button
                onClick={() => setUnreadOnly(!unreadOnly)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[12px] font-heading ${
                  unreadOnly
                    ? 'bg-[#1a1a1a] text-[#F5F3EF]'
                    : 'bg-[#E8E4DC] text-[#555555]'
                }`}
              >
                Unread
              </button>
            </div>
          </div>

          {/* Items list */}
          <div className="flex flex-col border-t border-[#D1CCC4]">
            {filtered.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center py-4">
            <button className="flex items-center gap-2 bg-[#E8E4DC] px-5 py-2 rounded-sm">
              <span className="font-heading text-xs font-semibold tracking-[1px] text-[#1a1a1a]">
                LOAD MORE
              </span>
              <span className="font-heading text-xs font-medium text-[#888888]">
                1 / 8
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setQuickAddOpen(true)}
        className="fixed bottom-6 right-6 flex items-center justify-center w-12 h-12 bg-[#C05A3C] rounded-full shadow-lg z-10"
      >
        <Plus className="w-5 h-5 text-[#F5F3EF]" />
      </button>

      <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  )
}
