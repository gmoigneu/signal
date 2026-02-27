import type {
	Category,
	ChannelSuggestion,
	DigestItem,
	HealthStatus,
	PipelineRun,
	Source,
	WeeklyReview,
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`, {
		headers: { "Content-Type": "application/json", ...init?.headers },
		...init,
	});
	if (!res.ok) {
		throw new Error(`API error ${res.status}: ${await res.text()}`);
	}
	return res.json() as Promise<T>;
}

// --- Items ---

export interface PaginatedItems {
	items: DigestItem[];
	total_items: number;
	page: number;
	items_per_page: number;
	total_pages: number;
}

export interface ItemStats {
	today_count: number;
	unread_count: number;
	starred_count: number;
	sources_healthy: number;
	sources_total: number;
}

export interface ItemFilters {
	date?: string;
	source_id?: string;
	category?: string;
	is_starred?: boolean;
	is_read?: boolean;
	search?: string;
	page?: number;
	items_per_page?: number;
}

export async function getItems(
	filters: ItemFilters = {},
): Promise<PaginatedItems> {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(filters)) {
		if (value !== undefined && value !== null) {
			params.set(key, String(value));
		}
	}
	return fetchJson<PaginatedItems>(`/api/items?${params}`);
}

export async function getItemStats(date?: string): Promise<ItemStats> {
	const params = date ? `?date=${date}` : "";
	return fetchJson<ItemStats>(`/api/items/stats${params}`);
}

export async function updateItem(
	id: string,
	data: {
		is_read?: boolean;
		is_starred?: boolean;
		star_note?: string;
		category_ids?: string[];
	},
): Promise<DigestItem> {
	return fetchJson<DigestItem>(`/api/items/${id}`, {
		method: "PATCH",
		body: JSON.stringify(data),
	});
}

export async function addManualItem(data: {
	title: string;
	url: string;
	content_raw?: string;
	source_name?: string;
}): Promise<DigestItem> {
	return fetchJson<DigestItem>("/api/items/manual", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

// --- Sources ---

export async function getSources(): Promise<Source[]> {
	return fetchJson<Source[]>("/api/sources");
}

export async function getSource(id: string): Promise<Source> {
	return fetchJson<Source>(`/api/sources/${id}`);
}

export async function createSource(data: {
	name: string;
	source_type: string;
	config: Record<string, unknown>;
	enabled?: boolean;
}): Promise<Source> {
	return fetchJson<Source>("/api/sources", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export async function updateSource(
	id: string,
	data: { name?: string; config?: Record<string, unknown>; enabled?: boolean },
): Promise<Source> {
	return fetchJson<Source>(`/api/sources/${id}`, {
		method: "PATCH",
		body: JSON.stringify(data),
	});
}

export async function deleteSource(id: string): Promise<void> {
	await fetchJson(`/api/sources/${id}`, { method: "DELETE" });
}

export async function testSource(id: string): Promise<{ items: DigestItem[] }> {
	return fetchJson(`/api/sources/${id}/test`, { method: "POST" });
}

// --- Categories ---

export async function getCategories(): Promise<Category[]> {
	return fetchJson<Category[]>("/api/categories");
}

export async function createCategory(data: {
	name: string;
	slug: string;
	color?: string;
}): Promise<Category> {
	return fetchJson<Category>("/api/categories", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

// --- Pipeline ---

export interface PipelineStatus {
	is_running: boolean;
	last_run_at: string | null;
	last_run_status: string | null;
	last_run_items_new: number | null;
	next_run_at: string | null;
}

export async function triggerPipeline(): Promise<{ status: string }> {
	return fetchJson("/api/pipeline/run", { method: "POST" });
}

export async function getPipelineStatus(): Promise<PipelineStatus> {
	return fetchJson<PipelineStatus>("/api/pipeline/status");
}

export async function getPipelineRuns(): Promise<PipelineRun[]> {
	return fetchJson<PipelineRun[]>("/api/pipeline/runs");
}

// --- Reviews ---

export async function getReviews(): Promise<WeeklyReview[]> {
	return fetchJson<WeeklyReview[]>("/api/reviews");
}

export async function getReview(id: string): Promise<WeeklyReview> {
	return fetchJson<WeeklyReview>(`/api/reviews/${id}`);
}

export async function generateReview(data: {
	week_start: string;
	week_end: string;
	title?: string;
}): Promise<WeeklyReview> {
	return fetchJson<WeeklyReview>("/api/reviews/generate", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export async function updateReview(
	id: string,
	data: { markdown?: string; title?: string },
): Promise<WeeklyReview> {
	return fetchJson<WeeklyReview>(`/api/reviews/${id}`, {
		method: "PATCH",
		body: JSON.stringify(data),
	});
}

// --- Discovery ---

export async function getDiscoveryChannels(): Promise<ChannelSuggestion[]> {
	return fetchJson<ChannelSuggestion[]>("/api/discovery/channels");
}

export async function acceptChannel(id: string): Promise<{ status: string }> {
	return fetchJson(`/api/discovery/channels/${id}/accept`, { method: "POST" });
}

export async function dismissChannel(id: string): Promise<{ status: string }> {
	return fetchJson(`/api/discovery/channels/${id}/dismiss`, { method: "POST" });
}

export async function refreshDiscovery(): Promise<{
	suggestions_updated: number;
}> {
	return fetchJson("/api/discovery/refresh", { method: "POST" });
}

// --- Settings ---

export interface AppSettings {
	pipeline_cron: string;
	youtube_keywords: string[];
}

export async function getSettings(): Promise<AppSettings> {
	return fetchJson<AppSettings>("/api/settings");
}

export async function updateSettings(
	data: Partial<AppSettings>,
): Promise<AppSettings> {
	return fetchJson<AppSettings>("/api/settings", {
		method: "PATCH",
		body: JSON.stringify(data),
	});
}

// --- Utilities ---

export function getSourceHealth(source: Source): HealthStatus {
	if (source.error_count >= 3) return "error";
	if (source.error_count > 0) return "warning";
	if (!source.last_fetched_at) return "stale";
	const lastFetched = new Date(source.last_fetched_at);
	const hoursAgo = (Date.now() - lastFetched.getTime()) / (1000 * 60 * 60);
	if (hoursAgo > 48) return "stale";
	return "healthy";
}
