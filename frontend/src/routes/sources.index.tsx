import { createFileRoute } from '@tanstack/react-router'
import {
  Check,
  ChevronDown,
  Loader2,
  Play,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import { createSource, getSourceHealth, getSources } from '../lib/api'
import type { Source, SourceType } from '../lib/types'

export const Route = createFileRoute('/sources/')({
  component: SourcesPage,
})

const sourceTypeLabels: Record<SourceType, string> = {
  rss: 'RSS',
  hackernews: 'HN',
  reddit: 'Reddit',
  arxiv: 'arXiv',
  github_releases: 'GitHub',
  youtube_channel: 'YouTube',
  youtube_search: 'YT Search',
  bluesky: 'Bluesky',
  twitter: 'Twitter',
  manual: 'Manual',
}

const sourceTypeIcons: Record<string, { label: string; icon: string }> = {
  rss: { label: 'RSS', icon: 'rss' },
  youtube_channel: { label: 'YouTube', icon: 'youtube' },
  youtube_search: { label: 'YT Search', icon: 'search' },
  hackernews: { label: 'Hacker News', icon: 'newspaper' },
  reddit: { label: 'Reddit', icon: 'message-square' },
  github_releases: { label: 'GitHub', icon: 'github' },
  arxiv: { label: 'arXiv', icon: 'file-text' },
  bluesky: { label: 'Bluesky', icon: 'cloud' },
  twitter: { label: 'Twitter', icon: 'at-sign' },
}

const healthDotColors = {
  healthy: '#4A7C59',
  warning: '#D4A017',
  error: '#B54A4A',
  stale: '#888888',
}

function SourcesPage() {
  const [panelOpen, setPanelOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('rss')
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [formName, setFormName] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const loadSources = async () => {
    try {
      const data = await getSources()
      setSources(data)
    } catch (e) {
      console.error('Failed to load sources:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSources()
  }, [])

  const handleSave = async () => {
    if (!formName.trim()) return
    setSaving(true)
    try {
      const config: Record<string, unknown> = {}
      if (selectedType === 'rss') config.feed_url = formUrl
      else if (selectedType === 'reddit') config.subreddit = formUrl
      else if (selectedType === 'hackernews') config.keywords = formUrl.split(',').map((s) => s.trim())
      else if (selectedType === 'youtube_channel') config.channel_handle = formUrl
      else if (selectedType === 'bluesky') config.handle = formUrl
      else if (selectedType === 'twitter') { config.username = formUrl; config.method = 'nitter' }
      else config.feed_url = formUrl

      await createSource({ name: formName, source_type: selectedType, config })
      setPanelOpen(false)
      setFormName('')
      setFormUrl('')
      await loadSources()
    } catch (e) {
      console.error('Failed to create source:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full relative">
      <Topbar
        title="Sources"
        rightContent={
          <button
            onClick={() => setPanelOpen(true)}
            className="flex items-center gap-2 bg-[#1a1a1a] px-3.5 py-1.5 rounded-sm"
          >
            <Plus className="w-3.5 h-3.5 text-[#F5F3EF]" />
            <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#F5F3EF]">
              ADD SOURCE
            </span>
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-5 px-8 py-6">
          {/* Filter row */}
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-[#E8E4DC] px-3 py-1.5 rounded-sm">
              <span className="text-[13px] text-[#555555]">All types</span>
              <ChevronDown className="w-3 h-3 text-[#555555]" />
            </button>
            <button className="flex items-center gap-2 bg-[#E8E4DC] px-3 py-1.5 rounded-sm">
              <span className="text-[13px] text-[#555555]">All</span>
              <ChevronDown className="w-3 h-3 text-[#555555]" />
            </button>
            <div className="flex items-center gap-2 bg-[#E8E4DC] px-3 py-1.5 rounded-sm flex-1">
              <Search className="w-3.5 h-3.5 text-[#888888]" />
              <span className="text-[13px] text-[#888888]">Find sources...</span>
            </div>
          </div>

          {/* Source list */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#888888]" />
            </div>
          ) : (
            <div className="flex flex-col border-t border-[#D1CCC4]">
              <div className="flex items-center px-4 py-2.5 border-b border-[#D1CCC4]">
                <span className="flex-1 font-heading text-[11px] font-semibold tracking-[1px] text-[#888888]">
                  STATUS
                </span>
                <span className="flex-1 font-heading text-[11px] font-semibold tracking-[1px] text-[#888888]">
                  SOURCE
                </span>
                <span className="w-24 font-heading text-[11px] font-semibold tracking-[1px] text-[#888888]">
                  TYPE
                </span>
              </div>

              {sources.map((source) => {
                const health = getSourceHealth(source)
                return (
                  <div
                    key={source.id}
                    className="flex items-center px-4 py-3 border-b border-[#D1CCC4]"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: healthDotColors[health] }}
                      />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-sm font-medium text-[#1a1a1a]">
                        {source.name}
                      </span>
                      <span className="text-[11px] text-[#888888]">
                        {source.last_error
                          ? source.last_error
                          : source.last_fetched_at
                            ? `Last fetched: ${new Date(source.last_fetched_at).toLocaleDateString()} · ${source.items_today} today · ${source.total_items} total`
                            : 'Never fetched'}
                      </span>
                    </div>
                    <span
                      className={`w-24 text-[11px] font-heading font-semibold tracking-[0.5px] px-2 py-0.5 rounded-sm text-center ${
                        health === 'error'
                          ? 'bg-[#B54A4A] text-white'
                          : health === 'warning'
                            ? 'bg-[#D4A017] text-white'
                            : health === 'stale'
                              ? 'bg-[#888888] text-white'
                              : 'bg-[#4A7C59] text-white'
                      }`}
                    >
                      {sourceTypeLabels[source.source_type]}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Source Panel */}
      {panelOpen && (
        <>
          <div
            className="absolute inset-0 bg-[#1a1a1a]/40 z-20"
            onClick={() => setPanelOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[440px] bg-[#F5F3EF] border-l border-[#D1CCC4] z-30 flex flex-col">
            <div className="flex items-center justify-between h-12 px-6 border-b border-[#D1CCC4]">
              <span className="font-heading text-sm font-semibold text-[#1a1a1a]">
                Add Source
              </span>
              <button onClick={() => setPanelOpen(false)}>
                <X className="w-4 h-4 text-[#555555]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-5 h-5 bg-[#1a1a1a] rounded-sm">
                  <span className="font-heading text-[11px] font-bold text-[#F5F3EF]">1</span>
                </div>
                <span className="font-heading text-xs font-semibold tracking-[1px] text-[#1a1a1a]">
                  SELECT SOURCE TYPE
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {Object.entries(sourceTypeIcons).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedType(key)}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-sm ${
                      selectedType === key
                        ? 'bg-[#E8E4DC] border-2 border-[#1a1a1a]'
                        : 'bg-[#E8E4DC]'
                    }`}
                  >
                    <span className="text-[12px] font-heading font-medium text-[#555555]">
                      {val.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="h-px bg-[#D1CCC4]" />

              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-5 h-5 bg-[#E8E4DC] rounded-sm">
                  <span className="font-heading text-[11px] font-bold text-[#888888]">2</span>
                </div>
                <span className="font-heading text-xs font-semibold tracking-[1px] text-[#888888]">
                  CONFIGURE {selectedType.toUpperCase().replace('_', ' ')}
                </span>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
                    SOURCE NAME
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Enter source name"
                    className="bg-[#E8E4DC] px-3 py-2 rounded-sm text-sm text-[#1a1a1a] outline-none placeholder:text-[#888888]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
                    {selectedType === 'rss' ? 'FEED URL' : selectedType === 'reddit' ? 'SUBREDDIT' : selectedType === 'bluesky' ? 'HANDLE' : selectedType === 'twitter' ? 'USERNAME' : 'URL / VALUE'}
                  </label>
                  <input
                    type="text"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder={selectedType === 'rss' ? 'https://example.com/rss.xml' : 'Enter value'}
                    className="bg-[#E8E4DC] px-3 py-2 rounded-sm text-sm text-[#1a1a1a] outline-none placeholder:text-[#888888]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-[#D1CCC4]">
              <button className="flex items-center gap-2 bg-[#E8E4DC] px-4 py-2 rounded-sm">
                <Play className="w-3.5 h-3.5 text-[#555555]" />
                <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
                  TEST
                </span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-[#1a1a1a] px-4 py-2 rounded-sm disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F5F3EF]" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-[#F5F3EF]" />
                )}
                <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#F5F3EF]">
                  SAVE SOURCE
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
