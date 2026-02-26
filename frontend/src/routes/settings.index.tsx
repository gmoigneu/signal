import { createFileRoute } from '@tanstack/react-router'
import { Plus, X, Zap } from 'lucide-react'
import Topbar from '../components/layout/Topbar'
import { categories, pipelineRuns } from '../lib/mock-data'

export const Route = createFileRoute('/settings/')({
  component: SettingsPage,
})

const defaultKeywords = [
  'agentic coding',
  'AI coding agent',
  'Claude Code',
  'Cursor AI',
  'AI developer tools',
  'LLM coding',
  'AI pair programming',
  'coding with AI 2026',
  'AI software engineering',
  'vibe coding',
]

function SettingsPage() {
  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    completed: { bg: '#4A7C59', text: '#fff', label: 'Completed' },
    warning: { bg: '#D4A017', text: '#fff', label: 'Warning' },
    failed: { bg: '#B54A4A', text: '#fff', label: 'Failed' },
    running: { bg: '#3B82F6', text: '#fff', label: 'Running' },
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Settings" />

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 px-8 py-6">
          {/* Pipeline section */}
          <div className="flex flex-col gap-4 border border-[#D1CCC4] rounded-sm p-5 bg-[#F5F3EF]">
            <div className="flex items-center justify-between">
              <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#1a1a1a]">
                PIPELINE
              </span>
              <button className="flex items-center gap-2 bg-[#C05A3C] px-3.5 py-1.5 rounded-sm">
                <Zap className="w-3.5 h-3.5 text-[#F5F3EF]" />
                <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#F5F3EF]">
                  RUN NOW
                </span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#888888]">
                SCHEDULE
              </span>
              <div className="flex items-center gap-2">
                <div className="bg-[#E8E4DC] px-3 py-1.5 rounded-sm text-sm text-[#1a1a1a]">
                  6:00 AM
                </div>
                <span className="text-[#888888] text-xs">and</span>
                <div className="bg-[#E8E4DC] px-3 py-1.5 rounded-sm text-sm text-[#1a1a1a]">
                  6:00 PM
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#4A7C59]" />
                <span className="text-sm text-[#555555]">Idle</span>
              </div>
              <span className="text-[12px] text-[#888888]">
                Last run: Feb 26, 2026 at 6:00 AM
              </span>
              <span className="text-[12px] text-[#888888]">
                Next run: Feb 26, 2026 at 6:00 PM
              </span>
            </div>
          </div>

          {/* YouTube search keywords */}
          <div className="flex flex-col gap-4 border border-[#D1CCC4] rounded-sm p-5 bg-[#F5F3EF]">
            <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#1a1a1a]">
              YOUTUBE SEARCH KEYWORDS
            </span>

            <div className="flex flex-wrap gap-2">
              {defaultKeywords.map((keyword) => (
                <div
                  key={keyword}
                  className="flex items-center gap-1.5 bg-[#E8E4DC] px-2.5 py-1 rounded-sm"
                >
                  <span className="text-[12px] text-[#555555]">{keyword}</span>
                  <X className="w-3 h-3 text-[#888888] cursor-pointer" />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add a keyword..."
                className="flex-1 bg-[#E8E4DC] px-3 py-1.5 rounded-sm text-sm text-[#1a1a1a] outline-none placeholder:text-[#888888]"
              />
              <button className="flex items-center gap-1.5 bg-[#1a1a1a] px-3 py-1.5 rounded-sm">
                <Plus className="w-3.5 h-3.5 text-[#F5F3EF]" />
                <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#F5F3EF]">
                  ADD
                </span>
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-col gap-4 border border-[#D1CCC4] rounded-sm p-5 bg-[#F5F3EF]">
            <div className="flex items-center justify-between">
              <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#1a1a1a]">
                CATEGORIES
              </span>
              <button className="flex items-center gap-1.5 bg-[#1a1a1a] px-3 py-1.5 rounded-sm">
                <Plus className="w-3.5 h-3.5 text-[#F5F3EF]" />
                <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#F5F3EF]">
                  ADD CATEGORY
                </span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <span
                  key={cat.id}
                  className="px-3 py-1 rounded-sm text-[12px] font-medium text-white"
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.name}
                </span>
              ))}
            </div>
          </div>

          {/* Pipeline history */}
          <div className="flex flex-col gap-4 border border-[#D1CCC4] rounded-sm p-5 bg-[#F5F3EF]">
            <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#1a1a1a]">
              PIPELINE HISTORY
            </span>

            {/* Header */}
            <div className="flex items-center gap-4 border-b border-[#D1CCC4] pb-2">
              <span className="flex-1 font-heading text-[11px] font-semibold tracking-[1px] text-[#888888]">
                TIMESTAMP
              </span>
              <span className="w-24 font-heading text-[11px] font-semibold tracking-[1px] text-[#888888]">
                STATUS
              </span>
              <span className="w-16 font-heading text-[11px] font-semibold tracking-[1px] text-[#888888] text-right">
                FETCHED
              </span>
              <span className="w-16 font-heading text-[11px] font-semibold tracking-[1px] text-[#888888] text-right">
                NEW
              </span>
              <span className="w-16 font-heading text-[11px] font-semibold tracking-[1px] text-[#888888] text-right">
                ERRORS
              </span>
            </div>

            {pipelineRuns.map((run) => {
              const status = statusColors[run.status] ?? statusColors.completed
              return (
                <div
                  key={run.id}
                  className="flex items-center gap-4 py-2 border-b border-[#D1CCC4] last:border-b-0"
                >
                  <span className="flex-1 text-sm text-[#555555]">
                    {new Date(run.started_at).toLocaleString()}
                  </span>
                  <div className="w-24 flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: status.bg }}
                    />
                    <span className="text-[12px] text-[#555555]">{status.label}</span>
                  </div>
                  <span className="w-16 text-sm text-[#555555] text-right">
                    {run.items_fetched}
                  </span>
                  <span className="w-16 text-sm text-[#555555] text-right">
                    {run.items_new}
                  </span>
                  <span
                    className={`w-16 text-sm text-right ${
                      run.errors > 0 ? 'text-[#B54A4A] font-medium' : 'text-[#555555]'
                    }`}
                  >
                    {run.errors}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
