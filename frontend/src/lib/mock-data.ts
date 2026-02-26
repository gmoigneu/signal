import type {
  Category,
  ChannelSuggestion,
  DigestItem,
  PipelineRun,
  Source,
  WeeklyReview,
} from './types'

export const categories: Category[] = [
  { id: 'cat-1', name: 'Models & Research', slug: 'models-research', color: '#8B5CF6', sort_order: 1 },
  { id: 'cat-2', name: 'Coding Agents', slug: 'coding-agents', color: '#3B82F6', sort_order: 2 },
  { id: 'cat-3', name: 'Web Dev', slug: 'web-dev', color: '#10B981', sort_order: 3 },
  { id: 'cat-4', name: 'Industry', slug: 'industry', color: '#F59E0B', sort_order: 4 },
  { id: 'cat-5', name: 'Tools', slug: 'tools', color: '#EF4444', sort_order: 5 },
  { id: 'cat-6', name: 'Open Source', slug: 'open-source', color: '#6366F1', sort_order: 6 },
  { id: 'cat-7', name: 'Tutorials', slug: 'tutorials', color: '#EC4899', sort_order: 7 },
  { id: 'cat-8', name: 'Opinion', slug: 'opinion', color: '#14B8A6', sort_order: 8 },
]

export const sources: Source[] = [
  {
    id: 'src-1', name: 'The Verge', source_type: 'rss',
    config: { feed_url: 'https://theverge.com/rss/index.xml' },
    enabled: true, fetch_interval: '12 hours',
    last_fetched_at: '2026-02-26T10:00:00Z', last_error: null,
    error_count: 0, items_today: 5, total_items: 287,
  },
  {
    id: 'src-2', name: 'Fireship', source_type: 'youtube_channel',
    config: { channel_id: 'UCsBjURrPoezykLs9EqgamOA' },
    enabled: true, fetch_interval: '12 hours',
    last_fetched_at: '2026-02-26T08:00:00Z', last_error: null,
    error_count: 0, items_today: 2, total_items: 156,
  },
  {
    id: 'src-3', name: 'Hacker News', source_type: 'hackernews',
    config: { min_score: 50, keywords: ['AI', 'LLM', 'Claude'] },
    enabled: true, fetch_interval: '12 hours',
    last_fetched_at: '2026-02-25T18:00:00Z', last_error: null,
    error_count: 1, items_today: 8, total_items: 1203,
  },
  {
    id: 'src-4', name: 'r/MachineLearning', source_type: 'reddit',
    config: { subreddit: 'MachineLearning', sort: 'hot', limit: 25 },
    enabled: true, fetch_interval: '12 hours',
    last_fetched_at: '2026-02-26T06:00:00Z', last_error: null,
    error_count: 0, items_today: 4, total_items: 412,
  },
  {
    id: 'src-5', name: 'arXiv CS.AI', source_type: 'arxiv',
    config: { categories: ['cs.AI', 'cs.CL'], max_results: 20 },
    enabled: true, fetch_interval: '12 hours',
    last_fetched_at: '2026-02-26T06:00:00Z', last_error: null,
    error_count: 0, items_today: 15, total_items: 890,
  },
  {
    id: 'src-6', name: 'claude-code releases', source_type: 'github_releases',
    config: { owner: 'anthropics', repo: 'claude-code' },
    enabled: true, fetch_interval: '12 hours',
    last_fetched_at: '2026-02-26T06:00:00Z', last_error: null,
    error_count: 0, items_today: 0, total_items: 24,
  },
  {
    id: 'src-7', name: 'OpenAI Blog', source_type: 'rss',
    config: { feed_url: 'https://openai.com/blog/rss.xml' },
    enabled: true, fetch_interval: '12 hours',
    last_fetched_at: '2026-02-26T10:00:00Z', last_error: null,
    error_count: 0, items_today: 2, total_items: 142,
  },
  {
    id: 'src-8', name: '@svpino', source_type: 'twitter',
    config: { username: 'svpino', method: 'nitter' },
    enabled: true, fetch_interval: '12 hours',
    last_fetched_at: null, last_error: 'All Nitter instances failed',
    error_count: 5, items_today: 0, total_items: 0,
  },
]

export const digestItems: DigestItem[] = [
  {
    id: 'item-1', source_id: 'src-7', source_name: 'OpenAI Blog', source_type: 'rss',
    title: 'OpenAI releases GPT-5 with unprecedented reasoning capabilities',
    url: 'https://openai.com/blog/gpt-5',
    author: 'OpenAI', thumbnail_url: null,
    summary: 'The new model demonstrates significant improvements in multi-step reasoning, code generation, and mathematical analysis. Early benchmarks show a 40% improvement over GPT-4 on complex tasks.',
    published_at: '2026-02-26T14:30:00Z', fetched_at: '2026-02-26T15:00:00Z',
    is_read: false, is_starred: false, star_note: null,
    categories: [categories[0], categories[3]], extra: {},
  },
  {
    id: 'item-2', source_id: 'src-2', source_name: 'Fireship', source_type: 'youtube_channel',
    title: 'Claude Code just mass-replaced an army of developers',
    url: 'https://youtube.com/watch?v=example1',
    author: 'Fireship', thumbnail_url: 'https://images.unsplash.com/photo-1550949078-fbd850f36ec5?w=280&h=160&fit=crop',
    summary: "In today's video, we look at how Anthropic's latest coding agent handles complex refactoring tasks across multiple files, with live demos and performance benchmarks.",
    published_at: '2026-02-26T13:15:00Z', fetched_at: '2026-02-26T14:00:00Z',
    is_read: true, is_starred: true, star_note: 'Great overview of the multi-agent workflow',
    categories: [categories[1]], extra: {},
  },
  {
    id: 'item-3', source_id: 'src-3', source_name: 'Hacker News', source_type: 'hackernews',
    title: 'Show HN: Llama an open-source alternative to Vercel\'s v0 using local LLMs',
    url: 'https://news.ycombinator.com/item?id=example',
    author: null, thumbnail_url: null,
    summary: 'A self-hosted tool that generates React components from natural language descriptions using Ollama and open-source models. Supports Tailwind CSS output and integrates with VS Code.',
    published_at: '2026-02-26T11:00:00Z', fetched_at: '2026-02-26T12:00:00Z',
    is_read: false, is_starred: false, star_note: null,
    categories: [categories[1], categories[5]], extra: {},
  },
  {
    id: 'item-4', source_id: 'src-5', source_name: 'arXiv CS.AI', source_type: 'arxiv',
    title: 'Scaling test-time compute with reinforcement learning for mathematical reasoning',
    url: 'https://arxiv.org/abs/2602.12345',
    author: 'Chen et al.', thumbnail_url: null,
    summary: 'We present a novel approach to scaling inference-time computation that achieves state-of-the-art results on MATH and GSM8K datasets, with practical applications for real-world mathematical reasoning.',
    published_at: '2026-02-26T09:00:00Z', fetched_at: '2026-02-26T10:00:00Z',
    is_read: true, is_starred: false, star_note: null,
    categories: [categories[0]], extra: {},
  },
  {
    id: 'item-5', source_id: 'src-1', source_name: 'Simon Willison', source_type: 'rss',
    title: 'Building agents with tool-use patterns',
    url: 'https://simonwillison.net/2026/Feb/26/agent-patterns/',
    author: 'Simon Willison', thumbnail_url: null,
    summary: 'Simon walks through practical patterns for building AI agents that use tools reliably. Covers retry logic, error handling, and composability.',
    published_at: '2026-02-26T08:00:00Z', fetched_at: '2026-02-26T09:00:00Z',
    is_read: true, is_starred: true, star_note: 'Share in weekly review, good patterns reference',
    categories: [categories[1], categories[6]], extra: {},
  },
  {
    id: 'item-6', source_id: 'src-4', source_name: 'r/MachineLearning', source_type: 'reddit',
    title: 'New API features for structured outputs and function calling',
    url: 'https://reddit.com/r/MachineLearning/example',
    author: 'u/ml_researcher', thumbnail_url: null,
    summary: 'OpenAI announces structured output support with JSON schema validation, enhanced function calling with parameter resolution, and new fine-tuning options for tool use.',
    published_at: '2026-02-26T07:30:00Z', fetched_at: '2026-02-26T08:00:00Z',
    is_read: false, is_starred: false, star_note: null,
    categories: [categories[4]], extra: {},
  },
  {
    id: 'item-7', source_id: 'src-6', source_name: 'claude-code releases', source_type: 'github_releases',
    title: 'Claude Code v1.0.28',
    url: 'https://github.com/anthropics/claude-code/releases/tag/v1.0.28',
    author: 'Anthropic', thumbnail_url: null,
    summary: 'New release adds background agent support, improved file search, and fixes for TypeScript path resolution. Breaking change: hooks API updated.',
    published_at: '2026-02-26T06:00:00Z', fetched_at: '2026-02-26T06:30:00Z',
    is_read: false, is_starred: false, star_note: null,
    categories: [categories[1], categories[4]], extra: {},
  },
  {
    id: 'item-8', source_id: 'src-7', source_name: 'OpenAI Blog', source_type: 'rss',
    title: 'Safety research update: alignment techniques for reasoning models',
    url: 'https://openai.com/blog/safety-alignment-2026',
    author: 'OpenAI Safety Team', thumbnail_url: null,
    summary: 'Our latest research paper presents constitutional AI approaches for chain-of-thought reasoning, showing improved safety properties without sacrificing performance on standard benchmarks.',
    published_at: '2026-02-25T16:00:00Z', fetched_at: '2026-02-25T17:00:00Z',
    is_read: true, is_starred: false, star_note: null,
    categories: [categories[0]], extra: {},
  },
]

export const pipelineRuns: PipelineRun[] = [
  {
    id: 'run-1', started_at: '2026-02-26T06:00:00Z',
    completed_at: '2026-02-26T06:03:22Z', status: 'completed',
    items_fetched: 142, items_new: 33, items_summarized: 33, errors: 0, trigger: 'scheduled',
  },
  {
    id: 'run-2', started_at: '2026-02-25T18:00:00Z',
    completed_at: '2026-02-25T18:02:45Z', status: 'completed',
    items_fetched: 98, items_new: 22, items_summarized: 22, errors: 0, trigger: 'scheduled',
  },
  {
    id: 'run-3', started_at: '2026-02-25T06:00:00Z',
    completed_at: '2026-02-25T06:04:10Z', status: 'warning',
    items_fetched: 105, items_new: 18, items_summarized: 18, errors: 2, trigger: 'scheduled',
  },
  {
    id: 'run-4', started_at: '2026-02-24T18:00:00Z',
    completed_at: '2026-02-24T18:01:55Z', status: 'failed',
    items_fetched: 0, items_new: 0, items_summarized: 0, errors: 5, trigger: 'scheduled',
  },
  {
    id: 'run-5', started_at: '2026-02-24T06:00:00Z',
    completed_at: '2026-02-24T06:03:00Z', status: 'completed',
    items_fetched: 127, items_new: 29, items_summarized: 29, errors: 0, trigger: 'scheduled',
  },
]

export const weeklyReviews: WeeklyReview[] = [
  {
    id: 'review-1',
    week_start: '2026-02-17',
    week_end: '2026-02-23',
    title: 'AI Intelligence Review: Feb 18 \u2013 22, 2026',
    item_count: 15,
    generated_at: '2026-02-24T09:00:00Z',
    markdown: `# AI Intelligence Review: Feb 18 \u2013 22, 2026

Based on 15 starred items from 24 sources.

## Executive summary

This week saw significant developments in AI reasoning capabilities, with OpenAI's GPT-5 release dominating the conversation. The coding agent space heated up as Anthropic, Cursor, and GitHub all shipped major updates. Open-source alternatives continue to gain traction, particularly in self-hosted AI coding assistants.

## Key developments

### Models & research
- OpenAI released GPT-5 with a 40% improvement on complex reasoning benchmarks. The model introduces chain-of-thought verification and a new API tier.
- A new RLHF paper on scaling test-time compute achieved state-of-the-art results on MATH benchmarks with 10x fewer parameters.

### Coding agents
- Claude Code launched background agent capabilities, enabling parallel code exploration, review, and refactoring in detached sessions.
- Windsurf announced cascading AI workflows for multi-file refactoring across large codebases.

### Open source
- Show HN: Self-hosted v0 alternative using local LLMs gained 800+ points. Uses Ollama and supports Tailwind output.
- Meta released LLaMA 4 weights for commercial use, with improved function calling capabilities.

## Trends to watch

1. Reasoning-focused models: GPT-5's breakthrough in multi-step reasoning signals a broader shift towards inference-time compute.
2. Agent-native toolchains: Both Cursor and Claude Code are converging on multi-agent architectures for code tasks, likely to become standard by mid-2026.
3. AI code generation in self-hosted environments: signal for local-first and privacy-focused AI coding tools.

## Action items

- [ ] Evaluate GPT-5 API for production workloads
- [ ] Test Claude Code's background agent feature for refactoring tasks
- [ ] Review LLaMA 4 licensing for internal use
`,
  },
  {
    id: 'review-2',
    week_start: '2026-02-10',
    week_end: '2026-02-16',
    title: 'AI Intelligence Review: Feb 10\u201316, 2026',
    item_count: 12,
    generated_at: '2026-02-17T09:00:00Z',
    markdown: '# AI Intelligence Review: Feb 10\u201316\n\n12 starred items reviewed.',
  },
  {
    id: 'review-3',
    week_start: '2026-02-03',
    week_end: '2026-02-09',
    title: 'AI Intelligence Review: Feb 3\u20139, 2026',
    item_count: 9,
    generated_at: '2026-02-10T09:00:00Z',
    markdown: '# AI Intelligence Review: Feb 3\u20139\n\n9 starred items reviewed.',
  },
]

export const channelSuggestions: ChannelSuggestion[] = [
  {
    id: 'ch-1', channel_id: 'UC1234', channel_name: 'Two Minute Papers',
    channel_url: 'https://youtube.com/@TwoMinutePapers',
    subscriber_count: 1640000, video_count: 890, appearance_count: 12,
    sample_videos: [
      { title: 'OpenAI O3 Is Scary Good', views: '524K views' },
      { title: 'This AI Generates Entire 3D Worlds', views: '892K views' },
      { title: 'Google Gemini Just Changed Everything', views: '376K views' },
      { title: 'Best vs Worst AI Running: Who Wins?', views: '87K views' },
    ],
    status: 'pending',
  },
  {
    id: 'ch-2', channel_id: 'UC5678', channel_name: 'Yannic Kilcher',
    channel_url: 'https://youtube.com/@YannicKilcher',
    subscriber_count: 445000, video_count: 620, appearance_count: 7,
    sample_videos: [
      { title: 'Claude 4: Paper Explained', views: '198K views' },
      { title: 'Is Meta AI better at coding?', views: '156K views' },
      { title: 'The Truth About Scaling Laws', views: '62K views' },
    ],
    status: 'pending',
  },
  {
    id: 'ch-3', channel_id: 'UC9012', channel_name: 'Matt Wolfe',
    channel_url: 'https://youtube.com/@MattWolfe',
    subscriber_count: 890000, video_count: 450, appearance_count: 5,
    sample_videos: [
      { title: 'Every AI Tool You Need in 2026', views: '1.2M views' },
      { title: '11 Insane AI Coding Agents', views: '389K views' },
      { title: 'Try to Break My Entire Workflow', views: '234K views' },
      { title: 'Best Electric Models That Beat GPT-5', views: '156K views' },
      { title: 'The Cheapest AI Coding Setup That Actually Works', views: '92K views' },
    ],
    status: 'pending',
  },
]

export function getSourceHealth(source: Source): 'healthy' | 'warning' | 'error' | 'stale' {
  if (source.error_count >= 3) return 'error'
  if (source.error_count >= 1) return 'warning'
  if (!source.last_fetched_at) return 'stale'
  const lastFetched = new Date(source.last_fetched_at).getTime()
  const now = Date.now()
  if (now - lastFetched > 48 * 60 * 60 * 1000) return 'stale'
  return 'healthy'
}
