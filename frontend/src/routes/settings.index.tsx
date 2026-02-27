import { createFileRoute } from "@tanstack/react-router";
import { Check, Loader2, Plus, X, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Topbar from "../components/layout/Topbar";
import {
	type AppSettings,
	getCategories,
	getPipelineRuns,
	getPipelineStatus,
	getSettings,
	type PipelineStatus,
	triggerPipeline,
	updateSettings,
} from "../lib/api";
import type { Category, PipelineRun } from "../lib/types";

export const Route = createFileRoute("/settings/")({
	component: SettingsPage,
});

type PipelineButtonState = "idle" | "running" | "completed";

function SettingsPage() {
	const [settings, setSettings] = useState<AppSettings | null>(null);
	const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(
		null,
	);
	const [pipelineRuns, setPipelineRuns] = useState<PipelineRun[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState(true);
	const [buttonState, setButtonState] = useState<PipelineButtonState>("idle");
	const [completedItemsNew, setCompletedItemsNew] = useState(0);
	const [newKeyword, setNewKeyword] = useState("");
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const stopPolling = useCallback(() => {
		if (pollRef.current) {
			clearInterval(pollRef.current);
			pollRef.current = null;
		}
	}, []);

	const startPolling = useCallback(() => {
		stopPolling();
		pollRef.current = setInterval(async () => {
			try {
				const status = await getPipelineStatus();
				setPipelineStatus(status);

				if (!status.is_running) {
					stopPolling();
					// Refresh runs table
					const runsRes = await getPipelineRuns();
					setPipelineRuns(runsRes);
					// Show completed state
					setCompletedItemsNew(status.last_run_items_new ?? 0);
					setButtonState("completed");
					// Reset after 5 seconds
					resetRef.current = setTimeout(() => {
						setButtonState("idle");
					}, 5000);
				}
			} catch (e) {
				console.error("Failed to poll pipeline status:", e);
			}
		}, 2000);
	}, [stopPolling]);

	useEffect(() => {
		const init = async () => {
			try {
				const [settingsRes, statusRes, runsRes, catsRes] = await Promise.all([
					getSettings(),
					getPipelineStatus(),
					getPipelineRuns(),
					getCategories(),
				]);
				setSettings(settingsRes);
				setPipelineStatus(statusRes);
				setPipelineRuns(runsRes);
				setCategories(catsRes);

				// If pipeline is already running, start polling
				if (statusRes.is_running) {
					setButtonState("running");
					startPolling();
				}
			} catch (e) {
				console.error("[Pipeline] Failed to load settings:", e);
			} finally {
				setLoading(false);
			}
		};
		init();
		return () => {
			stopPolling();
			if (resetRef.current) clearTimeout(resetRef.current);
		};
	}, [startPolling, stopPolling]);

	const handleRunPipeline = async () => {
		setButtonState("running");
		try {
			const res = await triggerPipeline();
			if (res.status === "already_running") {
				// Already running — just start polling
			}
			startPolling();
		} catch (e) {
			console.error("[Pipeline] Failed to trigger pipeline:", e);
			setButtonState("idle");
		}
	};

	const handleRemoveKeyword = async (keyword: string) => {
		if (!settings) return;
		const updated = settings.youtube_keywords.filter((k) => k !== keyword);
		try {
			const res = await updateSettings({ youtube_keywords: updated });
			setSettings(res);
		} catch (e) {
			console.error("Failed to update keywords:", e);
		}
	};

	const handleAddKeyword = async () => {
		if (!settings || !newKeyword.trim()) return;
		const updated = [...settings.youtube_keywords, newKeyword.trim()];
		try {
			const res = await updateSettings({ youtube_keywords: updated });
			setSettings(res);
			setNewKeyword("");
		} catch (e) {
			console.error("Failed to add keyword:", e);
		}
	};

	const statusColors: Record<
		string,
		{ bg: string; text: string; label: string }
	> = {
		completed: { bg: "#4A7C59", text: "#fff", label: "Completed" },
		warning: { bg: "#D4A017", text: "#fff", label: "Warning" },
		failed: { bg: "#B54A4A", text: "#fff", label: "Failed" },
		running: { bg: "#3B82F6", text: "#fff", label: "Running" },
	};

	if (loading) {
		return (
			<div className="flex flex-col h-full">
				<Topbar title="Settings" />
				<div className="flex items-center justify-center flex-1">
					<Loader2 className="w-6 h-6 animate-spin text-[#888888]" />
				</div>
			</div>
		);
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
							<button
								type="button"
								onClick={handleRunPipeline}
								disabled={buttonState !== "idle"}
								className={`flex items-center gap-2 px-3.5 py-1.5 rounded-sm transition-colors duration-300 disabled:cursor-default ${
									buttonState === "completed"
										? "bg-[#4A7C59]"
										: buttonState === "running"
											? "bg-[#3B82F6]"
											: "bg-[#C05A3C] disabled:opacity-50"
								}`}
							>
								{buttonState === "completed" ? (
									<Check className="w-3.5 h-3.5 text-[#F5F3EF]" />
								) : buttonState === "running" ? (
									<Loader2 className="w-3.5 h-3.5 animate-spin text-[#F5F3EF]" />
								) : (
									<Zap className="w-3.5 h-3.5 text-[#F5F3EF]" />
								)}
								<span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#F5F3EF]">
									{buttonState === "completed"
										? `COMPLETED! (${completedItemsNew} items)`
										: buttonState === "running"
											? "RUNNING..."
											: "RUN NOW"}
								</span>
							</button>
						</div>

						<div className="flex items-center gap-4">
							<span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#888888]">
								SCHEDULE
							</span>
							<div className="bg-[#E8E4DC] px-3 py-1.5 rounded-sm text-sm text-[#1a1a1a]">
								{settings?.pipeline_cron ?? "Not set"}
							</div>
						</div>

						<div className="flex items-center gap-6">
							<div className="flex items-center gap-2">
								<div
									className="w-2 h-2 rounded-full"
									style={{
										backgroundColor: pipelineStatus?.is_running
											? "#3B82F6"
											: "#4A7C59",
									}}
								/>
								<span className="text-sm text-[#555555]">
									{pipelineStatus?.is_running ? "Running" : "Idle"}
								</span>
							</div>
							{pipelineStatus?.last_run_at && (
								<span className="text-[12px] text-[#888888]">
									Last run:{" "}
									{new Date(pipelineStatus.last_run_at).toLocaleString()}
									{pipelineStatus.last_run_status &&
										` (${pipelineStatus.last_run_status})`}
								</span>
							)}
						</div>
					</div>

					{/* YouTube search keywords */}
					<div className="flex flex-col gap-4 border border-[#D1CCC4] rounded-sm p-5 bg-[#F5F3EF]">
						<span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#1a1a1a]">
							YOUTUBE SEARCH KEYWORDS
						</span>

						<div className="flex flex-wrap gap-2">
							{(settings?.youtube_keywords ?? []).map((keyword) => (
								<div
									key={keyword}
									className="flex items-center gap-1.5 bg-[#E8E4DC] px-2.5 py-1 rounded-sm"
								>
									<span className="text-[12px] text-[#555555]">{keyword}</span>
									<button
										type="button"
										onClick={() => handleRemoveKeyword(keyword)}
									>
										<X className="w-3 h-3 text-[#888888] cursor-pointer" />
									</button>
								</div>
							))}
						</div>

						<div className="flex items-center gap-2">
							<input
								type="text"
								value={newKeyword}
								onChange={(e) => setNewKeyword(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
								placeholder="Add a keyword..."
								className="flex-1 bg-[#E8E4DC] px-3 py-1.5 rounded-sm text-sm text-[#1a1a1a] outline-none placeholder:text-[#888888]"
							/>
							<button
								type="button"
								onClick={handleAddKeyword}
								className="flex items-center gap-1.5 bg-[#1a1a1a] px-3 py-1.5 rounded-sm"
							>
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
							<button
								type="button"
								className="flex items-center gap-1.5 bg-[#1a1a1a] px-3 py-1.5 rounded-sm"
							>
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

						{pipelineRuns.length > 0 ? (
							pipelineRuns.map((run) => {
								const status =
									statusColors[run.status] ?? statusColors.completed;
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
											<span className="text-[12px] text-[#555555]">
												{status.label}
											</span>
										</div>
										<span className="w-16 text-sm text-[#555555] text-right">
											{run.items_fetched}
										</span>
										<span className="w-16 text-sm text-[#555555] text-right">
											{run.items_new}
										</span>
										<span
											className={`w-16 text-sm text-right ${
												run.errors > 0
													? "text-[#B54A4A] font-medium"
													: "text-[#555555]"
											}`}
										>
											{run.errors}
										</span>
									</div>
								);
							})
						) : (
							<div className="text-sm text-[#888888] py-4">
								No pipeline runs yet. Click "Run Now" to fetch your first batch.
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
