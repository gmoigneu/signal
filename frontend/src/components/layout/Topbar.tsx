import { Activity, Play, Search } from 'lucide-react'

interface TopbarProps {
  title: string
  rightContent?: React.ReactNode
  showSearch?: boolean
  showPipeline?: boolean
}

export default function Topbar({
  title,
  rightContent,
  showSearch = false,
  showPipeline = false,
}: TopbarProps) {
  return (
    <div className="flex items-center justify-between h-12 px-6 border-b border-[#D1CCC4] bg-[#F5F3EF]">
      <span className="font-heading text-sm font-semibold text-[#1a1a1a]">
        {title}
      </span>

      <div className="flex items-center gap-3">
        {showSearch && (
          <div className="flex items-center gap-2 bg-[#E8E4DC] px-3 py-1.5 rounded-sm w-[280px]">
            <Search className="w-3.5 h-3.5 text-[#888888]" />
            <span className="text-[13px] text-[#888888]">Search items...</span>
          </div>
        )}

        {showPipeline && (
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-[#C05A3C] px-3.5 py-1.5 rounded-sm">
              <Play className="w-3.5 h-3.5 text-[#F5F3EF]" />
              <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#F5F3EF]">
                RUN PIPELINE
              </span>
            </button>
            <div className="flex items-center gap-1.5 bg-[#E8E4DC] px-2.5 py-1 rounded-sm">
              <Activity className="w-3.5 h-3.5 text-[#555555]" />
              <span className="font-heading text-xs font-semibold text-[#1a1a1a]">
                142
              </span>
            </div>
          </div>
        )}

        {rightContent}
      </div>
    </div>
  )
}
