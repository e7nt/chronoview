import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { Timeline } from "@/lib/types";
import { GanttChart } from "@/components/gantt/GanttChart";
import { TimelineSource } from "@/components/timeline/TimelineSource";
import { parseTimeline } from "@/lib/timeline-parser";
import { serializeTimeline } from "@/lib/timeline-serializer";
import { buildChartTimeline, type ChartTimeline } from "@/lib/build-chart-timeline";

type ViewMode = "chart" | "split" | "source";

export function TimelineView() {
	const { id } = useParams<{ id: string }>();
	const [timeline, setTimeline] = useState<Timeline | null>(null);
	const [sourceText, setSourceText] = useState("");
	const [savedText, setSavedText] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>("split");
	const [isSaving, setIsSaving] = useState(false);

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

	// Fetch timeline
	useEffect(() => {
		if (!id) return;
		api.getTimeline(id)
			.then((data) => {
				setTimeline(data);
				setSourceText(data.content);
				setSavedText(data.content);
				setLoading(false);
			})
			.catch((err) => {
				setError(err.message);
				setLoading(false);
			});
	}, [id]);

	// Derive parsed structure from source text for the chart
	const parsedTimeline = useMemo(() => {
		if (!sourceText || !timeline) return null;
		const parsed = parseTimeline(sourceText);
		// Build a Timeline-like object for the chart
		return {
			...timeline,
			parsed,
			sections: parsed.sections,
			milestones: parsed.milestones,
			announcements: parsed.announcements,
		};
	}, [sourceText, timeline]);

	const isDirty = sourceText !== savedText;

	// Handle source text changes
	const handleSourceChange = useCallback((newText: string) => {
		setSourceText(newText);
	}, []);

	// Handle chart edits (drag/resize produce a modified parsed structure)
	const handleTimelineEdit = useCallback((edited: any) => {
		if (!edited) return;
		// Serialize the edited structure back to .timeline text
		const newText = serializeTimeline(edited);
		setSourceText(newText);
	}, []);

	// Save = PUT content to server
	const handleSave = useCallback(async () => {
		if (!id || !isDirty) return;
		setIsSaving(true);
		try {
			// Auto-version before saving
			try {
				await api.createVersion(id, { content: savedText });
			} catch {
				// Version failure shouldn't block save
			}

			const result = await api.updateTimeline(id, { content: sourceText });
			setTimeline(result);
			setSourceText(result.content);
			setSavedText(result.content);
		} catch (err) {
			console.error("Save failed:", err);
		} finally {
			setIsSaving(false);
		}
	}, [id, isDirty, sourceText, savedText]);

	// Discard
	const handleDiscard = useCallback(() => {
		setSourceText(savedText);
	}, [savedText]);

	// Restore version
	const handleRestoreVersion = useCallback((content: string) => {
		setSourceText(content);
	}, []);

	// Refresh (after AddItemModal etc)
	const refreshTimeline = useCallback(() => {
		if (!id) return;
		api.getTimeline(id).then((data) => {
			setTimeline(data);
			setSourceText(data.content);
			setSavedText(data.content);
		}).catch(() => {});
	}, [id]);

	// Cmd+S to save
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "s") {
				e.preventDefault();
				if (isDirty && !isSaving) handleSave();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isDirty, isSaving, handleSave]);

	// Warn before leaving with unsaved changes
	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (isDirty) e.preventDefault();
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [isDirty]);

	if (loading) {
		return (
			<div className="min-h-screen bg-surface flex items-center justify-center">
				<p className="text-stone-400 text-sm">Loading timeline...</p>
			</div>
		);
	}

	if (error || !timeline || !parsedTimeline) {
		return (
			<div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
				<p className="text-red-500 text-sm">{error || "Timeline not found"}</p>
				<Link to="/app" className="text-sm text-stone-500 hover:text-stone-700 underline">
					Back to home
				</Link>
			</div>
		);
	}

	const canEdit = timeline.user_role !== "viewer";
	const showChart = viewMode === "chart" || viewMode === "split";
	const showSource = viewMode === "source" || viewMode === "split";

	const chartTimeline: ChartTimeline = buildChartTimeline(parsedTimeline.parsed, {
		id: timeline.id,
		title: timeline.title,
		color_scheme: timeline.color_scheme,
		created_at: timeline.created_at,
		updated_at: timeline.updated_at,
		user_role: timeline.user_role,
	});

	return (
		<div className="h-screen bg-surface flex flex-col">
			<div className="flex flex-1 overflow-hidden">
				{/* Chart panel */}
				{showChart && (
					<div className={`overflow-hidden ${showSource ? "flex-1" : "w-full"}`}>
						<GanttChart
							timeline={chartTimeline}
							viewMode={viewMode}
							onViewModeChange={setViewMode}
							onRefresh={refreshTimeline}
							onTimelineEdit={handleTimelineEdit}
							isDirty={isDirty}
							isSaving={isSaving}
							onSave={handleSave}
							onDiscard={handleDiscard}
							userRole={timeline.user_role || "owner"}
							onRestoreVersion={handleRestoreVersion}
						/>
					</div>
				)}

				{/* Source panel */}
				{showSource && (
					<div className={`overflow-hidden flex flex-col ${showChart ? "hidden md:flex w-[480px] shrink-0 border-l border-border-subtle" : "w-full"}`}>
						{!showChart && (
							<div className="flex items-center gap-3 px-4 py-2 border-b border-border-subtle bg-white">
								<h1 className="text-sm font-semibold text-stone-800 mr-auto truncate">{timeline.title}</h1>
								<div className="flex items-center gap-0.5 p-0.5 rounded-md bg-stone-100">
									{(["chart", "source"] as ViewMode[]).map((mode) => (
										<button
											key={mode}
											type="button"
											onClick={() => setViewMode(mode)}
											className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors capitalize ${
												viewMode === mode ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 hover:text-stone-700"
											}`}
										>
											{mode}
										</button>
									))}
								</div>
							</div>
						)}
						<div className="flex-1 overflow-hidden">
							<TimelineSource
								source={sourceText}
								editable={canEdit}
								onChange={handleSourceChange}
							/>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
