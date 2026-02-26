export interface Category {
  id: string
  name: string
  slug: string
  color: string
  sort_order: number
}

export interface Source {
  id: string
  name: string
  source_type: SourceType
  config: Record<string, unknown>
  enabled: boolean
  fetch_interval: string
  last_fetched_at: string | null
  last_error: string | null
  error_count: number
  items_today: number
  total_items: number
}

export type SourceType =
  | 'rss'
  | 'hackernews'
  | 'reddit'
  | 'arxiv'
  | 'github_releases'
  | 'youtube_channel'
  | 'youtube_search'
  | 'bluesky'
  | 'twitter'
  | 'manual'

export type HealthStatus = 'healthy' | 'warning' | 'error' | 'stale'

export interface DigestItem {
  id: string
  source_id: string
  source_name: string
  source_type: SourceType
  title: string
  url: string
  author: string | null
  summary: string | null
  thumbnail_url: string | null
  published_at: string
  fetched_at: string
  is_read: boolean
  is_starred: boolean
  star_note: string | null
  categories: Category[]
  extra: Record<string, unknown>
}

export interface PipelineRun {
  id: string
  started_at: string
  completed_at: string | null
  status: 'running' | 'completed' | 'failed' | 'warning'
  items_fetched: number
  items_new: number
  items_summarized: number
  errors: number
  trigger: 'scheduled' | 'manual'
}

export interface WeeklyReview {
  id: string
  week_start: string
  week_end: string
  title: string | null
  markdown: string
  item_count: number
  generated_at: string
}

export interface ChannelSuggestion {
  id: string
  channel_id: string
  channel_name: string
  channel_url: string
  subscriber_count: number | null
  video_count: number | null
  appearance_count: number
  sample_videos: { title: string; views: string }[]
  status: 'pending' | 'accepted' | 'dismissed'
}
