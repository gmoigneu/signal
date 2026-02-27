import { createFileRoute } from "@tanstack/react-router";
import {
	Calendar,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Loader2,
	Plus,
	Star,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ItemCard from "../components/digest/ItemCard";
import QuickAddModal from "../components/digest/QuickAddModal";
import type { PipelineButtonState } from "../components/layout/Topbar";
import Topbar from "../components/layout/Topbar";
import {
	getCategories,
	getItemStats,
	getItems,
	getPipelineStatus,
	type ItemStats,
	type PaginatedItems,
	triggerPipeline,
} from "../lib/api";
import type { Category } from "../lib/types";

export const Route = createFileRoute("/")({
	component: DigestPage,
});

function formatDate(d: Date) {
	return d.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function toISODate(d: Date) {
	return d.toISOString().split("T")[0];
}

function DigestPage() {
	const [activeCategory, setActiveCategory] = useState<string | null>(null);
	const [starredOnly, setStarredOnly] = useState(false);
	const [unreadOnly, setUnreadOnly] = useState(false);
	const [quickAddOpen, setQuickAddOpen] = useState(false);
	const [currentDate, setCurrentDate] = useState(new Date());
	const [page, setPage] = useState(1);

	const [data, setData] = useState<PaginatedItems | null>(null);
	const [stats, setStats] = useState<ItemStats | null>(null);
	const [categories, setCats] = useState<Category[]>([]);
	const [loading, setLoading] = useState(true);

	// Pipeline state
	const [pipelineState, setPipelineState] =
		useState<PipelineButtonState>("idle");
	const [pipelineItemsNew, setPipelineItemsNew] = useState(0);
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const loadDataRef = useRef<() => void>(() => {});

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
				if (!status.is_running) {
					stopPolling();
					setPipelineItemsNew(status.last_run_items_new ?? 0);
					setPipelineState("completed");
					resetRef.current = setTimeout(() => {
						setPipelineState("idle");
					}, 5000);
					// Refresh digest data after pipeline completes
					loadDataRef.current();
				}
			} catch (e) {
				console.error("Failed to poll pipeline status:", e);
			}
		}, 2000);
	}, [stopPolling]);

	useEffect(() => {
		return () => {
			stopPolling();
			if (resetRef.current) clearTimeout(resetRef.current);
		};
	}, [stopPolling]);

	const handleRunPipeline = async () => {
		setPipelineState("running");
		try {
			await triggerPipeline();
			startPolling();
		} catch (e) {
			console.error("Failed to trigger pipeline:", e);
			setPipelineState("idle");
		}
	};

	const loadData = useCallback(async () => {
		setLoading(true);
		try {
			const [itemsRes, statsRes, catsRes] = await Promise.all([
				getItems({
					date: toISODate(currentDate),
					category: activeCategory ?? undefined,
					is_starred: starredOnly ? true : undefined,
					is_read: unreadOnly ? false : undefined,
					page,
				}),
				getItemStats(toISODate(currentDate)),
				getCategories(),
			]);
			setData(itemsRes);
			setStats(statsRes);
			setCats(catsRes);
		} catch (e) {
			console.error("Failed to load digest data:", e);
		} finally {
			setLoading(false);
		}
	}, [currentDate, activeCategory, starredOnly, unreadOnly, page]);

	loadDataRef.current = loadData;

	useEffect(() => {
		loadData();
	}, [loadData]);

	const prevDay = () => {
		setCurrentDate((d) => new Date(d.getTime() - 86400000));
		setPage(1);
	};
	const nextDay = () => {
		setCurrentDate((d) => new Date(d.getTime() + 86400000));
		setPage(1);
	};

	return (
		<div className="flex flex-col h-full">
			<Topbar
				title={`Daily Digest, ${formatDate(currentDate)}`}
				showSearch
				showPipeline
				pipelineState={pipelineState}
				pipelineItemsNew={pipelineItemsNew}
				onRunPipeline={handleRunPipeline}
			/>

			<div className="flex-1 overflow-y-auto">
				<div className="flex flex-col gap-5 px-8 py-6">
					{/* Date nav */}
					<div className="flex items-center gap-3">
						<button
							onClick={prevDay}
							className="flex items-center justify-center w-8 h-8 bg-[#E8E4DC] rounded-sm"
						>
							<ChevronLeft className="w-4 h-4 text-[#555555]" />
						</button>
						<button className="flex items-center gap-2 bg-[#E8E4DC] px-3 py-1.5 rounded-sm">
							<Calendar className="w-3.5 h-3.5 text-[#555555]" />
							<span className="font-heading text-[13px] font-semibold text-[#1a1a1a]">
								{formatDate(currentDate)}
							</span>
							<ChevronDown className="w-3.5 h-3.5 text-[#555555]" />
						</button>
						<button
							onClick={nextDay}
							className="flex items-center justify-center w-8 h-8 bg-[#E8E4DC] rounded-sm"
						>
							<ChevronRight className="w-4 h-4 text-[#555555]" />
						</button>
					</div>

					{/* Stats bar */}
					<div className="flex gap-4">
						{[
							{
								label: "TOTAL",
								value: String(stats?.today_count ?? 0),
								color: "#1a1a1a",
							},
							{
								label: "UNREAD",
								value: String(stats?.unread_count ?? 0),
								color: "#C05A3C",
							},
							{
								label: "STARRED",
								value: String(stats?.starred_count ?? 0),
								color: "#1a1a1a",
							},
							{
								label: "SOURCES",
								value: `${stats?.sources_healthy ?? 0}/${stats?.sources_total ?? 0}`,
								color: "#4A7C59",
							},
						].map((stat) => (
							<div
								key={stat.label}
								className="flex items-center gap-2 bg-[#E8E4DC] px-3.5 py-2 rounded-sm flex-1"
							>
								<span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
									{stat.label}
								</span>
								<span
									className="font-heading text-lg font-bold"
									style={{ color: stat.color }}
								>
									{stat.value}
								</span>
							</div>
						))}
					</div>

					{/* Filter bar */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-1.5">
							<button
								onClick={() => {
									setActiveCategory(null);
									setPage(1);
								}}
								className={`px-2.5 py-1 rounded-sm text-[12px] font-heading font-medium ${
									!activeCategory
										? "bg-[#1a1a1a] text-[#F5F3EF]"
										: "bg-[#E8E4DC] text-[#555555]"
								}`}
							>
								All
							</button>
							{categories.map((cat) => (
								<button
									key={cat.slug}
									onClick={() => {
										setActiveCategory(
											activeCategory === cat.slug ? null : cat.slug,
										);
										setPage(1);
									}}
									className={`px-2.5 py-1 rounded-sm text-[12px] font-heading font-medium ${
										activeCategory === cat.slug
											? "bg-[#1a1a1a] text-[#F5F3EF]"
											: "bg-[#E8E4DC] text-[#555555]"
									}`}
								>
									{cat.name}
								</button>
							))}
						</div>

						<div className="flex items-center gap-3">
							<button className="flex items-center gap-2 bg-[#E8E4DC] px-2.5 py-1 rounded-sm text-[12px] font-heading text-[#555555]">
								Source
								<ChevronDown className="w-3 h-3" />
							</button>
							<button
								onClick={() => {
									setStarredOnly(!starredOnly);
									setPage(1);
								}}
								className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[12px] font-heading ${
									starredOnly
										? "bg-[#1a1a1a] text-[#F5F3EF]"
										: "bg-[#E8E4DC] text-[#555555]"
								}`}
							>
								<Star className="w-3 h-3" />
								Starred
							</button>
							<button
								onClick={() => {
									setUnreadOnly(!unreadOnly);
									setPage(1);
								}}
								className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[12px] font-heading ${
									unreadOnly
										? "bg-[#1a1a1a] text-[#F5F3EF]"
										: "bg-[#E8E4DC] text-[#555555]"
								}`}
							>
								Unread
							</button>
						</div>
					</div>

					{/* Items list */}
					<div className="flex flex-col border-t border-[#D1CCC4]">
						{loading ? (
							<div className="flex items-center justify-center py-16">
								<Loader2 className="w-6 h-6 animate-spin text-[#888888]" />
							</div>
						) : data && data.items.length > 0 ? (
							data.items.map((item) => (
								<ItemCard key={item.id} item={item} onUpdate={loadData} />
							))
						) : (
							<div className="flex items-center justify-center py-16 text-[#888888] text-sm">
								No items for this date. Try running the pipeline or selecting a
								different date.
							</div>
						)}
					</div>

					{/* Pagination */}
					{data && data.total_pages > 1 && (
						<div className="flex items-center justify-center py-4">
							<button
								onClick={() =>
									setPage((p) => Math.min(p + 1, data.total_pages))
								}
								className="flex items-center gap-2 bg-[#E8E4DC] px-5 py-2 rounded-sm"
							>
								<span className="font-heading text-xs font-semibold tracking-[1px] text-[#1a1a1a]">
									LOAD MORE
								</span>
								<span className="font-heading text-xs font-medium text-[#888888]">
									{page} / {data.total_pages}
								</span>
							</button>
						</div>
					)}
				</div>
			</div>

			{/* FAB */}
			<button
				onClick={() => setQuickAddOpen(true)}
				className="fixed bottom-6 right-6 flex items-center justify-center w-12 h-12 bg-[#C05A3C] rounded-full shadow-lg z-10"
			>
				<Plus className="w-5 h-5 text-[#F5F3EF]" />
			</button>

			<QuickAddModal
				open={quickAddOpen}
				onClose={() => setQuickAddOpen(false)}
				onAdded={loadData}
			/>
		</div>
	);
}
