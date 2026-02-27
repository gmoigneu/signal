import { createFileRoute } from '@tanstack/react-router'
import { Loader2, RefreshCw, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import {
  acceptChannel,
  dismissChannel,
  getDiscoveryChannels,
  refreshDiscovery,
} from '../lib/api'
import type { ChannelSuggestion } from '../lib/types'

export const Route = createFileRoute('/discovery/')({
  component: DiscoveryPage,
})

function formatSubscribers(count: number | null) {
  if (!count) return 'N/A'
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M subscribers`
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K subscribers`
  return `${count} subscribers`
}

function DiscoveryPage() {
  const [suggestions, setSuggestions] = useState<ChannelSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadSuggestions = async () => {
    try {
      const data = await getDiscoveryChannels()
      setSuggestions(data)
    } catch (e) {
      console.error('Failed to load suggestions:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSuggestions()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshDiscovery()
      await loadSuggestions()
    } catch (e) {
      console.error('Failed to refresh:', e)
    } finally {
      setRefreshing(false)
    }
  }

  const handleAccept = async (id: string) => {
    try {
      await acceptChannel(id)
      setSuggestions((prev) => prev.filter((s) => s.id !== id))
    } catch (e) {
      console.error('Failed to accept channel:', e)
    }
  }

  const handleDismiss = async (id: string) => {
    try {
      await dismissChannel(id)
      setSuggestions((prev) => prev.filter((s) => s.id !== id))
    } catch (e) {
      console.error('Failed to dismiss channel:', e)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="YouTube Discovery"
        rightContent={
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-[#E8E4DC] px-3.5 py-1.5 rounded-sm disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#555555]" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-[#555555]" />
            )}
            <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
              REFRESH SCAN
            </span>
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-5 px-8 py-6">
          <p className="text-[13px] text-[#888888]">
            Suggested channels based on your keyword searches
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#888888]" />
            </div>
          ) : suggestions.length > 0 ? (
            <div className="flex flex-col gap-4">
              {suggestions.map((channel) => (
                <div
                  key={channel.id}
                  className="flex flex-col gap-4 border border-[#D1CCC4] rounded-sm p-5 bg-[#F5F3EF]"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#1a1a1a] rounded-sm flex-shrink-0" />

                    <div className="flex flex-col gap-1 flex-1">
                      <span className="text-sm font-semibold text-[#1a1a1a]">
                        {channel.channel_name}
                      </span>
                      <span className="text-[12px] text-[#888888]">
                        {formatSubscribers(channel.subscriber_count)} &middot;{' '}
                        Appeared in {channel.appearance_count} keyword searches
                      </span>
                    </div>
                  </div>

                  {channel.sample_videos.length > 0 && (
                    <div className="flex flex-col gap-1.5 ml-16">
                      <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#888888]">
                        SAMPLE VIDEOS
                      </span>
                      {channel.sample_videos.map((video, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[12px] text-[#555555]">
                            &bull; {video.title || video}
                          </span>
                          {video.views && (
                            <span className="text-[11px] text-[#888888]">
                              ({video.views})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 ml-16">
                    <button
                      onClick={() => handleAccept(channel.id)}
                      className="flex items-center gap-2 bg-[#C05A3C] px-3 py-1.5 rounded-sm"
                    >
                      <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#F5F3EF]">
                        ADD TO SOURCES
                      </span>
                    </button>
                    <button
                      onClick={() => handleDismiss(channel.id)}
                      className="flex items-center gap-2 bg-[#E8E4DC] px-3 py-1.5 rounded-sm"
                    >
                      <X className="w-3.5 h-3.5 text-[#555555]" />
                      <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
                        DISMISS
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[#888888] py-8 text-center">
              No channel suggestions yet. Run the pipeline with YouTube search sources to discover new channels.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
