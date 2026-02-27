import { createFileRoute } from "@tanstack/react-router";
import {
	Check,
	ChevronDown,
	Loader2,
	Play,
	Plus,
	Power,
	Search,
	Trash2,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Topbar from "../components/layout/Topbar";
import {
	createSource,
	deleteSource,
	getSourceHealth,
	getSources,
	updateSource,
} from "../lib/api";
import type { Source, SourceType } from "../lib/types";

export const Route = createFileRoute("/sources/")({
	component: SourcesPage,
});

const sourceTypeLabels: Record<SourceType, string> = {
	rss: "RSS",
	hackernews: "HN",
	reddit: "Reddit",
	arxiv: "arXiv",
	github_releases: "GitHub",
	youtube_channel: "YouTube",
	youtube_search: "YT Search",
	bluesky: "Bluesky",
	twitter: "Twitter",
	manual: "Manual",
};

const sourceTypeIcons: Record<string, { label: string; icon: string }> = {
	rss: { label: "RSS", icon: "rss" },
	youtube_channel: { label: "YouTube", icon: "youtube" },
	youtube_search: { label: "YT Search", icon: "search" },
	hackernews: { label: "Hacker News", icon: "newspaper" },
	reddit: { label: "Reddit", icon: "message-square" },
	github_releases: { label: "GitHub", icon: "github" },
	arxiv: { label: "arXiv", icon: "file-text" },
	bluesky: { label: "Bluesky", icon: "cloud" },
	twitter: { label: "Twitter", icon: "at-sign" },
};

const healthDotColors = {
	healthy: "#4A7C59",
	warning: "#D4A017",
	error: "#B54A4A",
	stale: "#888888",
};

function getSourceValue(source: Source): string {
	const c = source.config;
	if (source.source_type === "rss") return (c.feed_url as string) || "";
	if (source.source_type === "reddit") return (c.subreddit as string) || "";
	if (source.source_type === "youtube_channel")
		return (c.channel_handle as string) || "";
	if (source.source_type === "bluesky") return (c.handle as string) || "";
	if (source.source_type === "twitter") return (c.username as string) || "";
	return "";
}

function buildConfig(
	sourceType: string,
	value: string,
): Record<string, unknown> {
	const config: Record<string, unknown> = {};
	if (sourceType === "rss") config.feed_url = value;
	else if (sourceType === "reddit") config.subreddit = value;
	else if (sourceType === "hackernews") {
		/* no config needed */
	} else if (sourceType === "youtube_channel") config.channel_handle = value;
	else if (sourceType === "bluesky") config.handle = value;
	else if (sourceType === "twitter") {
		config.username = value;
		config.method = "nitter";
	} else config.feed_url = value;
	return config;
}

function SourcesPage() {
	const [panelOpen, setPanelOpen] = useState(false);
	const [selectedType, setSelectedType] = useState<string>("rss");
	const [sources, setSources] = useState<Source[]>([]);
	const [loading, setLoading] = useState(true);

	// Filter state
	const [filterType, setFilterType] = useState<string>("all");
	const [filterHealth, setFilterHealth] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
	const [healthDropdownOpen, setHealthDropdownOpen] = useState(false);

	// Form state (add panel)
	const [formName, setFormName] = useState("");
	const [formUrl, setFormUrl] = useState("");
	const [saving, setSaving] = useState(false);

	// Edit panel state
	const [editSource, setEditSource] = useState<Source | null>(null);
	const [editName, setEditName] = useState("");
	const [editUrl, setEditUrl] = useState("");
	const [editSaving, setEditSaving] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);

	const filterRowRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				filterRowRef.current &&
				!filterRowRef.current.contains(e.target as Node)
			) {
				setTypeDropdownOpen(false);
				setHealthDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const loadSources = async () => {
		try {
			const data = await getSources();
			setSources(data);
		} catch (e) {
			console.error("Failed to load sources:", e);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadSources();
	}, []);

	const handleSave = async () => {
		if (!formName.trim()) return;
		setSaving(true);
		try {
			const config: Record<string, unknown> = {};
			if (selectedType === "rss") config.feed_url = formUrl;
			else if (selectedType === "reddit") config.subreddit = formUrl;
			else if (selectedType === "hackernews") {
				/* no config needed — filters by categories */
			} else if (selectedType === "youtube_channel")
				config.channel_handle = formUrl;
			else if (selectedType === "bluesky") config.handle = formUrl;
			else if (selectedType === "twitter") {
				config.username = formUrl;
				config.method = "nitter";
			} else config.feed_url = formUrl;

			await createSource({ name: formName, source_type: selectedType, config });
			setPanelOpen(false);
			setFormName("");
			setFormUrl("");
			await loadSources();
		} catch (e) {
			console.error("Failed to create source:", e);
		} finally {
			setSaving(false);
		}
	};

	const openEditPanel = (source: Source) => {
		setEditSource(source);
		setEditName(source.name);
		setEditUrl(getSourceValue(source));
		setConfirmDelete(false);
	};

	const closeEditPanel = () => {
		setEditSource(null);
		setConfirmDelete(false);
	};

	const handleEditSave = async () => {
		if (!editSource || !editName.trim()) return;
		setEditSaving(true);
		try {
			const data: { name?: string; config?: Record<string, unknown> } = {};
			if (editName !== editSource.name) data.name = editName;
			const newConfig = buildConfig(editSource.source_type, editUrl);
			if (JSON.stringify(newConfig) !== JSON.stringify(editSource.config))
				data.config = newConfig;
			if (data.name || data.config) {
				await updateSource(editSource.id, data);
			}
			closeEditPanel();
			await loadSources();
		} catch (e) {
			console.error("Failed to update source:", e);
		} finally {
			setEditSaving(false);
		}
	};

	const handleToggleEnabled = async (source: Source) => {
		try {
			const updated = await updateSource(source.id, {
				enabled: !source.enabled,
			});
			setEditSource(updated);
			await loadSources();
		} catch (e) {
			console.error("Failed to toggle source:", e);
		}
	};

	const handleDelete = async () => {
		if (!editSource) return;
		try {
			await deleteSource(editSource.id);
			closeEditPanel();
			await loadSources();
		} catch (e) {
			console.error("Failed to delete source:", e);
		}
	};

	const filteredSources = sources.filter((source) => {
		if (filterType !== "all" && source.source_type !== filterType) return false;
		if (filterHealth !== "all" && getSourceHealth(source) !== filterHealth)
			return false;
		if (
			searchQuery &&
			!source.name.toLowerCase().includes(searchQuery.toLowerCase())
		)
			return false;
		return true;
	});

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
					<div ref={filterRowRef} className="flex items-center gap-3">
						<div className="relative">
							<button
								type="button"
								onClick={() => {
									setTypeDropdownOpen(!typeDropdownOpen);
									setHealthDropdownOpen(false);
								}}
								className="flex items-center gap-2 bg-[#E8E4DC] px-3 py-1.5 rounded-sm"
							>
								<span className="text-[13px] text-[#555555]">
									{filterType === "all"
										? "All types"
										: sourceTypeLabels[filterType as SourceType] || filterType}
								</span>
								<ChevronDown className="w-3 h-3 text-[#555555]" />
							</button>
							{typeDropdownOpen && (
								<div className="absolute top-full left-0 mt-1 bg-[#F5F3EF] border border-[#D1CCC4] rounded-sm shadow-md z-10 min-w-[140px]">
									<button
										type="button"
										onClick={() => {
											setFilterType("all");
											setTypeDropdownOpen(false);
										}}
										className={`block w-full text-left px-3 py-1.5 text-[13px] ${filterType === "all" ? "bg-[#E8E4DC] text-[#1a1a1a]" : "text-[#555555]"} hover:bg-[#E8E4DC]`}
									>
										All types
									</button>
									{Object.entries(sourceTypeLabels).map(([key, label]) => (
										<button
											type="button"
											key={key}
											onClick={() => {
												setFilterType(key);
												setTypeDropdownOpen(false);
											}}
											className={`block w-full text-left px-3 py-1.5 text-[13px] ${filterType === key ? "bg-[#E8E4DC] text-[#1a1a1a]" : "text-[#555555]"} hover:bg-[#E8E4DC]`}
										>
											{label}
										</button>
									))}
								</div>
							)}
						</div>
						<div className="relative">
							<button
								type="button"
								onClick={() => {
									setHealthDropdownOpen(!healthDropdownOpen);
									setTypeDropdownOpen(false);
								}}
								className="flex items-center gap-2 bg-[#E8E4DC] px-3 py-1.5 rounded-sm"
							>
								<span className="text-[13px] text-[#555555]">
									{filterHealth === "all"
										? "All"
										: filterHealth.charAt(0).toUpperCase() +
											filterHealth.slice(1)}
								</span>
								<ChevronDown className="w-3 h-3 text-[#555555]" />
							</button>
							{healthDropdownOpen && (
								<div className="absolute top-full left-0 mt-1 bg-[#F5F3EF] border border-[#D1CCC4] rounded-sm shadow-md z-10 min-w-[120px]">
									{["all", "healthy", "warning", "error", "stale"].map(
										(status) => (
											<button
												type="button"
												key={status}
												onClick={() => {
													setFilterHealth(status);
													setHealthDropdownOpen(false);
												}}
												className={`flex items-center gap-2 w-full text-left px-3 py-1.5 text-[13px] ${filterHealth === status ? "bg-[#E8E4DC] text-[#1a1a1a]" : "text-[#555555]"} hover:bg-[#E8E4DC]`}
											>
												{status !== "all" && (
													<div
														className="w-2 h-2 rounded-full"
														style={{
															backgroundColor:
																healthDotColors[
																	status as keyof typeof healthDotColors
																],
														}}
													/>
												)}
												{status.charAt(0).toUpperCase() + status.slice(1)}
											</button>
										),
									)}
								</div>
							)}
						</div>
						<div className="flex items-center gap-2 bg-[#E8E4DC] px-3 py-1.5 rounded-sm flex-1">
							<Search className="w-3.5 h-3.5 text-[#888888]" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Find sources..."
								className="bg-transparent text-[13px] text-[#1a1a1a] outline-none placeholder:text-[#888888] w-full"
							/>
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
								<span className="w-12 font-heading text-[11px] font-semibold tracking-[1px] text-[#888888]">
									STATUS
								</span>
								<span className="flex-1 font-heading text-[11px] font-semibold tracking-[1px] text-[#888888]">
									SOURCE
								</span>
								<span className="w-24 font-heading text-[11px] font-semibold tracking-[1px] text-[#888888]">
									TYPE
								</span>
							</div>

							{filteredSources.map((source) => {
								const health = getSourceHealth(source);
								return (
									<button
										type="button"
										key={source.id}
										onClick={() => openEditPanel(source)}
										className={`flex items-center px-4 py-3 border-b border-[#D1CCC4] w-full text-left hover:bg-[#E8E4DC]/50 transition-colors ${!source.enabled ? "opacity-50" : ""}`}
									>
										<div className="w-12 flex items-center justify-center">
											<div
												className="w-2 h-2 rounded-full"
												style={{ backgroundColor: healthDotColors[health] }}
											/>
										</div>
										<div className="flex flex-col flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<span className="text-sm font-medium text-[#1a1a1a] truncate">
													{source.name}
												</span>
												{!source.enabled && (
													<span className="text-[10px] font-heading font-semibold tracking-[0.5px] px-1.5 py-0.5 rounded-sm bg-[#D1CCC4] text-[#555555]">
														DISABLED
													</span>
												)}
											</div>
											<span className="text-[11px] text-[#888888] truncate">
												{source.last_error
													? source.last_error
													: source.last_fetched_at
														? `Last fetched: ${new Date(source.last_fetched_at).toLocaleDateString()} · ${source.items_today} today · ${source.total_items} total`
														: "Never fetched"}
											</span>
										</div>
										<span
											className={`w-24 shrink-0 text-[11px] font-heading font-semibold tracking-[0.5px] px-2 py-0.5 rounded-sm text-center ${
												health === "error"
													? "bg-[#B54A4A] text-white"
													: health === "warning"
														? "bg-[#D4A017] text-white"
														: health === "stale"
															? "bg-[#888888] text-white"
															: "bg-[#4A7C59] text-white"
											}`}
										>
											{sourceTypeLabels[source.source_type]}
										</span>
									</button>
								);
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
									<span className="font-heading text-[11px] font-bold text-[#F5F3EF]">
										1
									</span>
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
												? "bg-[#E8E4DC] border-2 border-[#1a1a1a]"
												: "bg-[#E8E4DC]"
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
									<span className="font-heading text-[11px] font-bold text-[#888888]">
										2
									</span>
								</div>
								<span className="font-heading text-xs font-semibold tracking-[1px] text-[#888888]">
									CONFIGURE {selectedType.toUpperCase().replace("_", " ")}
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
								{selectedType === "hackernews" ? (
									<p className="text-[13px] text-[#555555]">
										Scans the HN front page and filters by your categories.
									</p>
								) : (
									<div className="flex flex-col gap-1">
										<label className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
											{selectedType === "rss"
												? "FEED URL"
												: selectedType === "reddit"
													? "SUBREDDIT"
													: selectedType === "bluesky"
														? "HANDLE"
														: selectedType === "twitter"
															? "USERNAME"
															: "URL / VALUE"}
										</label>
										<input
											type="text"
											value={formUrl}
											onChange={(e) => setFormUrl(e.target.value)}
											placeholder={
												selectedType === "rss"
													? "https://example.com/rss.xml"
													: "Enter value"
											}
											className="bg-[#E8E4DC] px-3 py-2 rounded-sm text-sm text-[#1a1a1a] outline-none placeholder:text-[#888888]"
										/>
									</div>
								)}
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

			{/* Edit Source Panel */}
			{editSource && (
				<>
					<div
						className="absolute inset-0 bg-[#1a1a1a]/40 z-20"
						onClick={closeEditPanel}
					/>
					<div className="absolute right-0 top-0 h-full w-[440px] bg-[#F5F3EF] border-l border-[#D1CCC4] z-30 flex flex-col">
						<div className="flex items-center justify-between h-12 px-6 border-b border-[#D1CCC4]">
							<span className="font-heading text-sm font-semibold text-[#1a1a1a]">
								Edit Source
							</span>
							<button type="button" onClick={closeEditPanel}>
								<X className="w-4 h-4 text-[#555555]" />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
							{/* Source info header */}
							<div className="flex items-center justify-between">
								<span
									className={`text-[11px] font-heading font-semibold tracking-[0.5px] px-2 py-0.5 rounded-sm ${
										editSource.enabled
											? "bg-[#4A7C59] text-white"
											: "bg-[#D1CCC4] text-[#555555]"
									}`}
								>
									{sourceTypeLabels[editSource.source_type]} ·{" "}
									{editSource.enabled ? "ENABLED" : "DISABLED"}
								</span>
							</div>

							{/* Name field */}
							<div className="flex flex-col gap-1">
								<span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
									SOURCE NAME
								</span>
								<input
									type="text"
									value={editName}
									onChange={(e) => setEditName(e.target.value)}
									className="bg-[#E8E4DC] px-3 py-2 rounded-sm text-sm text-[#1a1a1a] outline-none placeholder:text-[#888888]"
								/>
							</div>

							{/* Config field (unless HN) */}
							{editSource.source_type === "hackernews" ? (
								<p className="text-[13px] text-[#555555]">
									Scans the HN front page and filters by your categories.
								</p>
							) : (
								<div className="flex flex-col gap-1">
									<span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
										{editSource.source_type === "rss"
											? "FEED URL"
											: editSource.source_type === "reddit"
												? "SUBREDDIT"
												: editSource.source_type === "bluesky"
													? "HANDLE"
													: editSource.source_type === "twitter"
														? "USERNAME"
														: "URL / VALUE"}
									</span>
									<input
										type="text"
										value={editUrl}
										onChange={(e) => setEditUrl(e.target.value)}
										className="bg-[#E8E4DC] px-3 py-2 rounded-sm text-sm text-[#1a1a1a] outline-none placeholder:text-[#888888]"
									/>
								</div>
							)}

							<div className="h-px bg-[#D1CCC4]" />

							{/* Stats */}
							<div className="flex flex-col gap-2">
								<span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
									STATS
								</span>
								<div className="text-[13px] text-[#555555] flex flex-col gap-1">
									<span>
										{editSource.total_items} items total ·{" "}
										{editSource.items_today} today
									</span>
									<span>
										{editSource.last_fetched_at
											? `Last fetched: ${new Date(editSource.last_fetched_at).toLocaleString()}`
											: "Never fetched"}
									</span>
									{editSource.last_error && (
										<span className="text-[#B54A4A]">
											Error: {editSource.last_error}
										</span>
									)}
								</div>
							</div>

							<div className="h-px bg-[#D1CCC4]" />

							{/* Danger zone */}
							<div className="flex flex-col gap-3">
								<span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
									ACTIONS
								</span>
								<button
									type="button"
									onClick={() => handleToggleEnabled(editSource)}
									className="flex items-center gap-2 px-3 py-2 rounded-sm bg-[#E8E4DC] hover:bg-[#D1CCC4] transition-colors w-full"
								>
									<Power className="w-3.5 h-3.5 text-[#555555]" />
									<span className="text-[13px] text-[#555555]">
										{editSource.enabled ? "Disable source" : "Enable source"}
									</span>
								</button>
								{!confirmDelete ? (
									<button
										type="button"
										onClick={() => setConfirmDelete(true)}
										className="flex items-center gap-2 px-3 py-2 rounded-sm bg-[#E8E4DC] hover:bg-[#B54A4A]/10 transition-colors w-full"
									>
										<Trash2 className="w-3.5 h-3.5 text-[#B54A4A]" />
										<span className="text-[13px] text-[#B54A4A]">
											Delete source
										</span>
									</button>
								) : (
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={handleDelete}
											className="flex items-center gap-2 px-3 py-2 rounded-sm bg-[#B54A4A] flex-1"
										>
											<Trash2 className="w-3.5 h-3.5 text-white" />
											<span className="text-[13px] text-white font-semibold">
												Confirm delete
											</span>
										</button>
										<button
											type="button"
											onClick={() => setConfirmDelete(false)}
											className="flex items-center gap-2 px-3 py-2 rounded-sm bg-[#E8E4DC]"
										>
											<span className="text-[13px] text-[#555555]">Cancel</span>
										</button>
									</div>
								)}
							</div>
						</div>

						<div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-[#D1CCC4]">
							<button
								type="button"
								onClick={closeEditPanel}
								className="flex items-center gap-2 bg-[#E8E4DC] px-4 py-2 rounded-sm"
							>
								<span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
									CANCEL
								</span>
							</button>
							<button
								type="button"
								onClick={handleEditSave}
								disabled={editSaving}
								className="flex items-center gap-2 bg-[#1a1a1a] px-4 py-2 rounded-sm disabled:opacity-50"
							>
								{editSaving ? (
									<Loader2 className="w-3.5 h-3.5 animate-spin text-[#F5F3EF]" />
								) : (
									<Check className="w-3.5 h-3.5 text-[#F5F3EF]" />
								)}
								<span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#F5F3EF]">
									SAVE CHANGES
								</span>
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
