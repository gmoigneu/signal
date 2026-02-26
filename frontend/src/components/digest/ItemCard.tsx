import {
  ExternalLink,
  FileText,
  Github,
  MessageSquare,
  Newspaper,
  Rss,
  Star,
  Youtube,
} from 'lucide-react'
import { useState } from 'react'
import type { DigestItem } from '../../lib/types'

const sourceTypeConfig: Record<
  string,
  { icon: typeof Rss; color: string; bg: string }
> = {
  rss: { icon: Rss, color: '#555555', bg: '#E8E4DC' },
  youtube_channel: { icon: Youtube, color: '#F5F3EF', bg: '#B54A4A' },
  youtube_search: { icon: Youtube, color: '#F5F3EF', bg: '#B54A4A' },
  hackernews: { icon: Newspaper, color: '#555555', bg: '#E8E4DC' },
  reddit: { icon: MessageSquare, color: '#555555', bg: '#E8E4DC' },
  arxiv: { icon: FileText, color: '#555555', bg: '#E8E4DC' },
  github_releases: { icon: Github, color: '#555555', bg: '#E8E4DC' },
  bluesky: { icon: MessageSquare, color: '#555555', bg: '#E8E4DC' },
  twitter: { icon: MessageSquare, color: '#555555', bg: '#E8E4DC' },
  manual: { icon: FileText, color: '#555555', bg: '#E8E4DC' },
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function ItemCard({ item }: { item: DigestItem }) {
  const [starred, setStarred] = useState(item.is_starred)
  const config = sourceTypeConfig[item.source_type] ?? sourceTypeConfig.rss
  const Icon = config.icon
  const isUnread = !item.is_read

  return (
    <div
      className={`flex gap-3.5 p-4 ${
        isUnread
          ? 'border-l-[3px] border-l-[#C05A3C] bg-[#F5F3EF]'
          : 'border-b border-[#D1CCC4] bg-[#F5F3EF] opacity-75'
      }`}
    >
      <div
        className="flex items-center justify-center w-7 h-7 rounded-sm flex-shrink-0 mt-0.5"
        style={{ backgroundColor: config.bg }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
      </div>

      {item.thumbnail_url && (
        <div className="w-[140px] h-[80px] rounded-sm overflow-hidden flex-shrink-0">
          <img
            src={item.thumbnail_url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#888888] font-heading tracking-wide">
            {item.source_name}
          </span>
          <span className="text-[11px] text-[#888888]">{formatTime(item.published_at)}</span>
        </div>

        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-sm font-semibold leading-snug hover:underline ${
            isUnread ? 'text-[#1a1a1a]' : 'text-[#555555]'
          }`}
        >
          {item.title}
        </a>

        {item.summary && (
          <p className="text-[13px] leading-relaxed text-[#888888] line-clamp-2">
            {item.summary}
          </p>
        )}

        {starred && item.star_note && (
          <p className="text-[12px] italic text-[#888888] flex items-center gap-1 mt-0.5">
            <FileText className="w-3 h-3" />
            {item.star_note}
          </p>
        )}

        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5">
            {item.categories.map((cat) => (
              <span
                key={cat.id}
                className="px-2 py-0.5 rounded-sm text-[11px] font-medium text-white"
                style={{ backgroundColor: cat.color }}
              >
                {cat.name}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStarred(!starred)}
              className="flex items-center gap-1 text-[11px]"
            >
              <Star
                className={`w-4 h-4 ${starred ? 'fill-[#C05A3C] text-[#C05A3C]' : 'text-[#888888]'}`}
              />
            </button>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#888888] hover:text-[#1a1a1a]"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
