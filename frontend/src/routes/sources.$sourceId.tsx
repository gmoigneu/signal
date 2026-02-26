import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Play,
} from 'lucide-react'
import ItemCard from '../components/digest/ItemCard'
import Topbar from '../components/layout/Topbar'
import { digestItems, getSourceHealth, sources } from '../lib/mock-data'

export const Route = createFileRoute('/sources/$sourceId')({
  component: SourceDetailPage,
})

function SourceDetailPage() {
  const { sourceId } = Route.useParams()
  const source = sources.find((s) => s.id === sourceId) ?? sources[0]
  const health = getSourceHealth(source)
  const sourceItems = digestItems.filter((i) => i.source_id === source.id)

  const healthColors = {
    healthy: { bg: '#4A7C59', text: 'Healthy' },
    warning: { bg: '#D4A017', text: 'Warning' },
    error: { bg: '#B54A4A', text: 'Error' },
    stale: { bg: '#888888', text: 'Stale' },
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={source.name}
        rightContent={
          <div className="flex items-center gap-3">
            <Link
              to="/sources"
              className="flex items-center gap-1.5 text-[#555555] hover:text-[#1a1a1a]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-heading text-[11px] font-semibold tracking-[1px]">
                BACK
              </span>
            </Link>
            <button className="flex items-center gap-2 bg-[#E8E4DC] px-3.5 py-1.5 rounded-sm">
              <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
                EDIT
              </span>
            </button>
            <button className="flex items-center gap-2 bg-[#B54A4A] px-3.5 py-1.5 rounded-sm">
              <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#F5F3EF]">
                DELETE
              </span>
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 px-8 py-6">
          {/* Source info */}
          <div className="flex flex-col gap-4 border border-[#D1CCC4] rounded-sm p-5 bg-[#F5F3EF]">
            <div className="flex items-center gap-3">
              <span className="font-heading text-[11px] font-semibold tracking-[1px] px-2 py-0.5 rounded-sm bg-[#E8E4DC] text-[#555555]">
                {source.source_type.toUpperCase()}
              </span>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: healthColors[health].bg }}
                />
                <span className="text-[12px] text-[#555555]">
                  {healthColors[health].text}
                </span>
              </div>

              <div className="flex-1" />

              <div className="flex items-center justify-end w-9 h-5 bg-[#4A7C59] rounded-full p-0.5">
                <div className="w-4 h-4 bg-white rounded-full" />
              </div>

              <button className="flex items-center gap-2 bg-[#E8E4DC] px-3 py-1.5 rounded-sm">
                <Play className="w-3 h-3 text-[#555555]" />
                <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
                  TEST
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-[12px] text-[#888888]">
              <span className="font-heading tracking-wide">FEED URL:</span>
              <span className="text-[#555555]">
                {String(source.config.feed_url ?? source.config.channel_id ?? source.config.subreddit ?? 'N/A')}
              </span>
            </div>

            <div className="flex items-center gap-8">
              <div className="flex flex-col">
                <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#888888]">
                  TOTAL ITEMS
                </span>
                <span className="font-heading text-2xl font-bold text-[#1a1a1a]">
                  {source.total_items}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#888888]">
                  TODAY
                </span>
                <span className="font-heading text-2xl font-bold text-[#1a1a1a]">
                  {source.items_today}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#888888]">
                  LAST FETCHED
                </span>
                <span className="text-sm text-[#555555]">
                  {source.last_fetched_at
                    ? new Date(source.last_fetched_at).toLocaleString()
                    : 'Never'}
                </span>
              </div>
            </div>

            {source.last_error && (
              <div className="flex items-center gap-2 bg-[#B54A4A]/10 border border-[#B54A4A]/20 rounded-sm px-3 py-2">
                <span className="text-[12px] text-[#B54A4A]">
                  {source.last_error}
                </span>
              </div>
            )}
          </div>

          {/* Items from this source */}
          <div className="flex flex-col gap-3">
            <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#888888]">
              ITEMS FROM THIS SOURCE
            </span>
            <div className="flex flex-col border-t border-[#D1CCC4]">
              {sourceItems.length > 0 ? (
                sourceItems.map((item) => <ItemCard key={item.id} item={item} />)
              ) : (
                <div className="flex items-center justify-center py-12 text-[#888888] text-sm">
                  No items from this source yet.
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 py-4">
            <button className="flex items-center justify-center w-8 h-8 bg-[#E8E4DC] rounded-sm">
              <ChevronLeft className="w-4 h-4 text-[#555555]" />
            </button>
            {[1, 2, 3].map((page) => (
              <button
                key={page}
                className={`flex items-center justify-center w-8 h-8 rounded-sm text-sm ${
                  page === 1
                    ? 'bg-[#1a1a1a] text-[#F5F3EF]'
                    : 'bg-[#E8E4DC] text-[#555555]'
                }`}
              >
                {page}
              </button>
            ))}
            <span className="text-[#888888] text-sm">...</span>
            <button className="flex items-center justify-center w-8 h-8 bg-[#E8E4DC] rounded-sm text-sm text-[#555555]">
              24
            </button>
            <button className="flex items-center justify-center w-8 h-8 bg-[#E8E4DC] rounded-sm">
              <ChevronRight className="w-4 h-4 text-[#555555]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
