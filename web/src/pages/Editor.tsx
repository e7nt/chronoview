import { GanttChart } from "@/components/gantt/GanttChart";
import { TimelineSource } from "@/components/timeline/TimelineSource";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { type ChartTimeline, buildChartTimeline } from "@/lib/build-chart-timeline";
import { localStore } from "@/lib/local-store";
import { parseTimeline } from "@/lib/timeline-parser";
import { serializeTimeline } from "@/lib/timeline-serializer";
import { ChevronDown, Cloud, Plus, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type ViewMode = "chart" | "split" | "source";

export function Editor({ createNew }: { createNew?: boolean } = {}) {
	const { localId } = useParams<{ localId: string }>();
	const navigate = useNavigate();
	const { isAuthenticated, user } = useAuth();

	const [activeId, setActiveId] = useState<string>("");
	const [sourceText, setSourceText] = useState("");
	const [savedText, setSavedText] = useState("");
	const [viewMode, setViewMode] = useState<ViewMode>("split");
	const [showHero, setShowHero] = useState(true);
	const [showSelector, setShowSelector] = useState(false);
	const [pushing, setPushing] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Auto-downgrade split view on narrow screens
	useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth < 768) {
				setViewMode((v) => (v === "split" ? "chart" : v));
			}
		};
		handleResize();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// Load timeline from localStorage
	useEffect(() => {
		// /t/new — create a fresh timeline and navigate to it
		if (createNew) {
			const created = localStore.createTimeline();
			localStore.setActiveId(created.id);
			navigate(`/t/${created.id}`, { replace: true });
			return;
		}

		const targetId = localId;
		if (targetId) {
			const data = localStore.getTimeline(targetId);
			if (data) {
				setActiveId(targetId);
				setSourceText(data.content);
				setSavedText(data.content);
				localStore.setActiveId(targetId);
				setShowHero(false);
				return;
			}
		}

		// No specific ID or not found — load active
		const { id, content } = localStore.getOrCreateActive();
		setActiveId(id);
		setSourceText(content);
		setSavedText(content);
		setShowHero(false);
	}, [localId, createNew, navigate]);

	// Derive parsed structure from source text
	const parsedTimeline = useMemo(() => {
		if (!sourceText) return null;
		return parseTimeline(sourceText);
	}, [sourceText]);

	// Auto-save to localStorage (debounced 2s)
	useEffect(() => {
		if (!activeId || !sourceText) return;
		const timer = setTimeout(() => {
			localStore.saveTimeline(activeId, sourceText);
			setSavedText(sourceText);
		}, 2000);
		return () => clearTimeout(timer);
	}, [sourceText, activeId]);

	const handleSourceChange = useCallback((newText: string) => {
		setSourceText(newText);
		setShowHero(false);
	}, []);

	const handleTimelineEdit = useCallback((edited: any) => {
		if (!edited) return;
		const newText = serializeTimeline(edited);
		setSourceText(newText);
	}, []);

	const handleNew = useCallback(() => {
		const created = localStore.createTimeline();
		localStore.setActiveId(created.id);
		setShowSelector(false);
		navigate(`/t/${created.id}`);
	}, [navigate]);

	const handleImport = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;
			e.target.value = "";
			file.text().then((text) => {
				const created = localStore.createTimeline(file.name.replace(/\.(timeline|txt)$/, ""), text);
				localStore.setActiveId(created.id);
				setShowSelector(false);
				navigate(`/t/${created.id}`);
			});
		},
		[navigate],
	);

	const handleSwitchTimeline = useCallback(
		(id: string) => {
			setShowSelector(false);
			localStore.setActiveId(id);
			navigate(`/t/${id}`);
		},
		[navigate],
	);

	const handleDelete = useCallback(
		(id: string, e: React.MouseEvent) => {
			e.stopPropagation();
			if (!confirm("Delete this local timeline?")) return;
			localStore.deleteTimeline(id);
			if (id === activeId) {
				const { id: newId } = localStore.getOrCreateActive();
				navigate(`/t/${newId}`);
			}
			setShowSelector(false);
		},
		[activeId, navigate],
	);

	const handlePushToCloud = useCallback(async () => {
		if (!isAuthenticated) {
			navigate("/login");
			return;
		}
		setPushing(true);
		try {
			const title = parsedTimeline?.title || "Untitled";
			const result = await api.createTimeline({ title, content: sourceText });
			navigate(`/timeline/${result.id}`);
		} catch (err) {
			console.error("Push to cloud failed:", err);
		} finally {
			setPushing(false);
		}
	}, [isAuthenticated, parsedTimeline, sourceText, navigate]);

	const title = parsedTimeline?.title || "Untitled";
	const localTimelines = localStore.getTimelines();

	const chartTimeline: ChartTimeline | null = parsedTimeline
		? buildChartTimeline(parsedTimeline, { id: activeId })
		: null;

	const showChart = viewMode === "chart" || viewMode === "split";
	const showSource = viewMode === "source" || viewMode === "split";

	return (
		<div className="h-screen flex flex-col bg-surface">
			{/* Mini header */}
			<div className="flex items-center gap-2 px-3 py-2 border-b border-stone-200 bg-white shrink-0">
				{/* Logo */}
				<div className="flex items-center gap-2 mr-2">
					<svg width={24} height={24} viewBox="0 0 32 32">
						<rect width="32" height="32" rx="7" fill="#1C1C1E" />
						<rect x="5" y="8" width="14" height="4" rx="2" fill="#6366F1" opacity="0.9" />
						<rect x="9" y="14" width="18" height="4" rx="2" fill="#0EA5E9" opacity="0.9" />
						<rect x="7" y="20" width="12" height="4" rx="2" fill="#A855F7" opacity="0.9" />
					</svg>
				</div>

				{/* Timeline selector */}
				<div className="relative">
					<button
						type="button"
						onClick={() => setShowSelector((v) => !v)}
						className="flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-stone-700 hover:bg-stone-50 rounded-md transition-colors max-w-[200px]"
					>
						<span className="truncate">{title}</span>
						<ChevronDown size={14} className="shrink-0 text-stone-400" />
					</button>

					{showSelector && (
						<>
							<div className="fixed inset-0 z-30" onClick={() => setShowSelector(false)} />
							<div className="absolute left-0 top-full mt-1 z-40 bg-white border border-stone-200 rounded-lg shadow-xl py-1 w-[280px]">
								{/* Actions */}
								<div className="px-2 py-1.5 flex gap-1.5">
									<button
										type="button"
										onClick={handleNew}
										className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
									>
										<Plus size={10} />
										New
									</button>
									<button
										type="button"
										onClick={() => fileInputRef.current?.click()}
										className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
									>
										<Upload size={10} />
										Import
									</button>
								</div>
								<div className="border-t border-stone-100 my-1" />

								{/* Local timelines */}
								<div className="px-3 py-1">
									<p className="text-[9px] font-semibold uppercase tracking-widest text-stone-400">
										Local
									</p>
								</div>
								{localTimelines.length === 0 ? (
									<p className="px-3 py-2 text-xs text-stone-400">No local timelines</p>
								) : (
									localTimelines.map((t) => (
										<button
											key={t.id}
											type="button"
											onClick={() => handleSwitchTimeline(t.id)}
											className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-stone-50 transition-colors ${
												t.id === activeId
													? "bg-stone-50 font-medium text-stone-800"
													: "text-stone-600"
											}`}
										>
											<span className="truncate flex-1">{t.title}</span>
											<button
												type="button"
												onClick={(e) => handleDelete(t.id, e)}
												className="text-[10px] text-stone-300 hover:text-red-500 shrink-0"
											>
												x
											</button>
										</button>
									))
								)}
							</div>
						</>
					)}
				</div>

				<input
					ref={fileInputRef}
					type="file"
					accept=".timeline,.txt"
					onChange={handleImport}
					className="hidden"
				/>

				{/* Spacer */}
				<div className="flex-1" />

				{/* Save to cloud */}
				<button
					type="button"
					onClick={handlePushToCloud}
					disabled={pushing}
					className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors disabled:opacity-40"
				>
					<Cloud size={12} />
					{pushing ? "Saving..." : "Save to cloud"}
				</button>

				{/* Auth */}
				{isAuthenticated ? (
					<a href="/app" className="text-xs text-stone-500 hover:text-stone-700 px-2">
						Dashboard
					</a>
				) : (
					<a href="/login" className="text-xs text-stone-500 hover:text-stone-700 px-2">
						Sign in
					</a>
				)}
			</div>

			{/* Hero (shown on first visit, hidden once editing) */}
			{showHero && !localId && (
				<div className="text-center py-8 px-4 border-b border-stone-100 bg-stone-50/50 shrink-0">
					<h1 className="text-xl font-bold text-stone-800 tracking-tight">
						Beautiful project timelines, instantly
					</h1>
					<p className="text-stone-400 text-sm mt-1.5 max-w-md mx-auto">
						Write a{" "}
						<code className="text-xs bg-stone-100 px-1.5 py-0.5 rounded font-mono">.timeline</code>{" "}
						file, see it as a Gantt chart. No account needed.
					</p>
					<button
						type="button"
						onClick={() => setShowHero(false)}
						className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors"
					>
						Start creating
					</button>
				</div>
			)}

			{/* Editor */}
			{chartTimeline && !showHero && (
				<div className="flex flex-1 overflow-hidden">
					{showChart && (
						<div className={`overflow-hidden ${showSource ? "flex-1" : "w-full"}`}>
							<GanttChart
								timeline={chartTimeline}
								viewMode={viewMode}
								onViewModeChange={setViewMode}
								onTimelineEdit={handleTimelineEdit}
								userRole="owner"
							/>
						</div>
					)}

					{showSource && (
						<div
							className={`overflow-hidden flex flex-col ${showChart ? "hidden md:flex w-[480px] shrink-0 border-l border-border-subtle" : "w-full"}`}
						>
							<div className="flex-1 overflow-hidden">
								<TimelineSource source={sourceText} editable onChange={handleSourceChange} />
							</div>
						</div>
					)}
				</div>
			)}

			{/* Show editor immediately if hero is dismissed or we have a localId */}
			{chartTimeline && showHero && !localId && (
				<div className="flex-1 flex items-center justify-center text-stone-300">
					{/* Placeholder — editor appears when hero is dismissed */}
				</div>
			)}

			{!chartTimeline && (
				<div className="flex-1 flex items-center justify-center">
					<p className="text-stone-400 text-sm">Loading...</p>
				</div>
			)}
		</div>
	);
}
