import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChartTimeline, ChartTask, ChartAnnouncement } from "@/lib/build-chart-timeline";
import { daysBetween, getDateRange, parseDate, addDays, formatDate, toISODate } from "@/lib/date-utils";
import { GanttBar } from "./GanttBar";
import { GanttHeader, type ZoomLevel } from "./GanttHeader";
import { TaskDetail } from "./TaskDetail";
import { motion } from "framer-motion";
import { Megaphone, TriangleAlert, Check, Circle, Loader, Ban, ChevronRight, Sun, Moon, Share2, Inbox, Plus, Menu, Pencil, X, Save, Download, UserPlus, History } from "lucide-react";
import { InviteModal } from "@/components/share/InviteModal";
import { VersionPanel } from "./VersionPanel";
import { ShareDialog } from "@/components/share/ShareDialog";
import { UnplannedPanel } from "./UnplannedPanel";
import { AddItemModal } from "./AddItemModal";

const ZOOM_DAY_WIDTH: Record<ZoomLevel, number> = { day: 52, week: 28, month: 12 };
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 56;
const SECTION_HEADER_HEIGHT = 34;

function useWindowWidth() {
	const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
	useEffect(() => {
		const onResize = () => setWidth(window.innerWidth);
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);
	return width;
}

type ViewMode = "chart" | "split" | "source";

interface PendingEdit {
	planned_start: string;
	planned_end: string;
}

interface GanttChartProps {
	timeline: ChartTimeline;
	viewMode?: ViewMode;
	onViewModeChange?: (mode: ViewMode) => void;
	onRefresh?: () => void;
	onTimelineEdit?: (edited: Timeline | null) => void;
	isDirty?: boolean;
	isSaving?: boolean;
	onSave?: () => void;
	onDiscard?: () => void;
	userRole?: "owner" | "editor" | "viewer";
	onRestoreVersion?: (content: string) => void;
}

export function GanttChart({ timeline, viewMode, onViewModeChange, onRefresh, onTimelineEdit, isDirty = false, isSaving = false, onSave, onDiscard, userRole = "owner", onRestoreVersion }: GanttChartProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const milestoneLabelsRef = useRef<SVGGElement>(null);
	const [selectedTask, setSelectedTask] = useState<ChartTask | null>(null);
	const [selectedAnnouncement, setSelectedAnnouncement] = useState<(ChartAnnouncement & { x: number }) | null>(null);
	const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
	const [zoom, setZoom] = useState<ZoomLevel>("week");
	const DAY_WIDTH = ZOOM_DAY_WIDTH[zoom];

	const windowWidth = useWindowWidth();
	const isMobile = windowWidth < 640;
	const minLabelW = isMobile ? 160 : 300;
	const maxLabelW = isMobile ? 240 : 500;
	const bodyTopPadding = isMobile ? 60 : 120;

	const [labelWidth, setLabelWidth] = useState(minLabelW);
	const [darkMode, setDarkMode] = useState(false);
	const [showShareDialog, setShowShareDialog] = useState(false);
	const [showUnplanned, setShowUnplanned] = useState(false);
	const [showAddModal, setShowAddModal] = useState(false);
	const [addModalDefaultSection, setAddModalDefaultSection] = useState<string | undefined>();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [showExportMenu, setShowExportMenu] = useState(false);
	const [showInviteModal, setShowInviteModal] = useState(false);
	const [showVersionPanel, setShowVersionPanel] = useState(false);

	const canEdit = userRole === "owner" || userRole === "editor";

	// Edit mode state (drag toggle)
	const [editMode, setEditMode] = useState(false);
	const [pendingEdits, setPendingEdits] = useState<Map<string, PendingEdit>>(new Map());
	const dragDidMove = useRef(false);

	// Apply pending edits to produce the edited timeline
	const editedTimeline = useMemo(() => {
		if (pendingEdits.size === 0) return timeline;
		return {
			...timeline,
			sections: timeline.sections.map((s) => ({
				...s,
				tasks: s.tasks.map((t) => {
					const edit = pendingEdits.get(t.id);
					return edit ? { ...t, planned_start: edit.planned_start, planned_end: edit.planned_end } : t;
				}),
			})),
		};
	}, [timeline, pendingEdits]);

	// Push edited timeline to parent for live source view
	useEffect(() => {
		onTimelineEdit?.(pendingEdits.size > 0 ? editedTimeline : null);
	}, [editedTimeline, pendingEdits.size, onTimelineEdit]);

	// Drag handler: move entire bar (shift both start and end)
	const handleBarDragStart = useCallback((taskId: string, sectionId: string, e: React.PointerEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragDidMove.current = false;
		const startPointerX = e.clientX;

		const task = timeline.sections.find((s) => s.id === sectionId)?.tasks.find((t) => t.id === taskId);
		if (!task?.planned_start || !task?.planned_end) return;

		const origStart = parseDate(task.planned_start);
		const origEnd = parseDate(task.planned_end);

		const onPointerMove = (ev: PointerEvent) => {
			const dx = ev.clientX - startPointerX;
			if (Math.abs(dx) > 3) dragDidMove.current = true;
			const daysDelta = Math.round(dx / DAY_WIDTH);
			const newStart = toISODate(addDays(origStart, daysDelta));
			const newEnd = toISODate(addDays(origEnd, daysDelta));
			setPendingEdits((prev) => new Map(prev).set(taskId, { planned_start: newStart, planned_end: newEnd }));
		};
		const onPointerUp = () => {
			document.removeEventListener("pointermove", onPointerMove);
			document.removeEventListener("pointerup", onPointerUp);
		};
		document.addEventListener("pointermove", onPointerMove);
		document.addEventListener("pointerup", onPointerUp);
	}, [timeline, DAY_WIDTH]);

	// Resize left edge: change planned_start only
	const handleResizeLeft = useCallback((taskId: string, sectionId: string, e: React.PointerEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragDidMove.current = true;
		const startPointerX = e.clientX;

		const task = timeline.sections.find((s) => s.id === sectionId)?.tasks.find((t) => t.id === taskId);
		if (!task?.planned_start || !task?.planned_end) return;

		const origStart = parseDate(task.planned_start);
		const endDate = parseDate(task.planned_end);

		const onPointerMove = (ev: PointerEvent) => {
			const dx = ev.clientX - startPointerX;
			const daysDelta = Math.round(dx / DAY_WIDTH);
			const newStart = addDays(origStart, daysDelta);
			// Clamp: start must be before end (at least 1 day)
			if (daysBetween(newStart, endDate) < 1) return;
			setPendingEdits((prev) => new Map(prev).set(taskId, { planned_start: toISODate(newStart), planned_end: toISODate(endDate) }));
		};
		const onPointerUp = () => {
			document.removeEventListener("pointermove", onPointerMove);
			document.removeEventListener("pointerup", onPointerUp);
		};
		document.addEventListener("pointermove", onPointerMove);
		document.addEventListener("pointerup", onPointerUp);
	}, [timeline, DAY_WIDTH]);

	// Resize right edge: change planned_end only
	const handleResizeRight = useCallback((taskId: string, sectionId: string, e: React.PointerEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragDidMove.current = true;
		const startPointerX = e.clientX;

		const task = timeline.sections.find((s) => s.id === sectionId)?.tasks.find((t) => t.id === taskId);
		if (!task?.planned_start || !task?.planned_end) return;

		const startDate = parseDate(task.planned_start);
		const origEnd = parseDate(task.planned_end);

		const onPointerMove = (ev: PointerEvent) => {
			const dx = ev.clientX - startPointerX;
			const daysDelta = Math.round(dx / DAY_WIDTH);
			const newEnd = addDays(origEnd, daysDelta);
			// Clamp: end must be after start (at least 1 day)
			if (daysBetween(startDate, newEnd) < 1) return;
			setPendingEdits((prev) => new Map(prev).set(taskId, { planned_start: toISODate(startDate), planned_end: toISODate(newEnd) }));
		};
		const onPointerUp = () => {
			document.removeEventListener("pointermove", onPointerMove);
			document.removeEventListener("pointerup", onPointerUp);
		};
		document.addEventListener("pointermove", onPointerMove);
		document.addEventListener("pointerup", onPointerUp);
	}, [timeline, DAY_WIDTH]);

	// Note: Save and Discard are handled by the parent (TimelineView).
	// The internal pendingEdits + editedTimeline feed into onTimelineEdit
	// which updates the parent's workingTimeline.

	// Handle inline task field edits (name, dates, status, etc.)
	const handleTaskUpdate = useCallback((taskId: string, changes: Partial<ChartTask>) => {
		// Build a new timeline with the task updated
		const updated = {
			...editedTimeline,
			sections: editedTimeline.sections.map((s) => ({
				...s,
				tasks: s.tasks.map((t) =>
					t.id === taskId ? { ...t, ...changes } : t,
				),
			})),
		};
		onTimelineEdit?.(updated);
		// Also update selectedTask so the panel reflects changes
		setSelectedTask((prev) => prev?.id === taskId ? { ...prev, ...changes } : prev);
	}, [editedTimeline, onTimelineEdit]);

	// Sync label width when breakpoint changes
	useEffect(() => {
		setLabelWidth((prev) => Math.min(maxLabelW, Math.max(minLabelW, prev)));
	}, [minLabelW, maxLabelW]);

	const unplannedCount = useMemo(() => {
		let count = 0;
		for (const s of editedTimeline.sections) {
			for (const t of s.tasks) {
				if (!t.planned_start || !t.planned_end) count++;
			}
		}
		count += editedTimeline.milestones.filter((m) => !m.date).length;
		count += editedTimeline.announcements.filter((a) => !a.date).length;
		return count;
	}, [editedTimeline]);
	const [isResizing, setIsResizing] = useState(false);

	const handleResizeStart = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		setIsResizing(true);
		const startX = e.clientX;
		const startWidth = labelWidth;
		const onMouseMove = (ev: MouseEvent) => {
			setLabelWidth(Math.min(maxLabelW, Math.max(minLabelW, startWidth + ev.clientX - startX)));
		};
		const onMouseUp = () => {
			setIsResizing(false);
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		};
		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
	}, [labelWidth, minLabelW, maxLabelW]);

	const handleTouchResizeStart = useCallback((e: React.TouchEvent) => {
		setIsResizing(true);
		const startX = e.touches[0]!.clientX;
		const startWidth = labelWidth;
		const onTouchMove = (ev: TouchEvent) => {
			ev.preventDefault();
			setLabelWidth(Math.min(maxLabelW, Math.max(minLabelW, startWidth + ev.touches[0]!.clientX - startX)));
		};
		const onTouchEnd = () => {
			setIsResizing(false);
			document.removeEventListener("touchmove", onTouchMove);
			document.removeEventListener("touchend", onTouchEnd);
		};
		document.addEventListener("touchmove", onTouchMove, { passive: false });
		document.addEventListener("touchend", onTouchEnd);
	}, [labelWidth, minLabelW, maxLabelW]);

	const toggleSection = useCallback((sectionId: string) => {
		setCollapsedSections((prev) => {
			const next = new Set(prev);
			if (next.has(sectionId)) {
				next.delete(sectionId);
			} else {
				next.add(sectionId);
			}
			return next;
		});
	}, []);

	// Flat list of all tasks sorted chronologically for keyboard navigation
	const allTasks = useMemo(
		() =>
			editedTimeline.sections
				.flatMap((s) => s.tasks)
				.filter((t) => t.planned_start && t.planned_end)
				.sort((a, b) => a.planned_start!.localeCompare(b.planned_start!) || a.planned_end!.localeCompare(b.planned_end!)),
		[editedTimeline.sections],
	);

	const selectTask = useCallback(
		(task: ChartTask | null) => {
			setSelectedTask(task);
			setSelectedAnnouncement(null);
		},
		[],
	);

	const { start: rangeStart, end: rangeEnd } = useMemo(
		() => getDateRange(editedTimeline.sections),
		[editedTimeline.sections],
	);

	const totalDays = daysBetween(rangeStart, rangeEnd);
	const chartWidth = totalDays * DAY_WIDTH;
	const today = new Date();
	const todayOffset = daysBetween(rangeStart, today) * DAY_WIDTH;

	// Calculate total chart height
	let totalRows = 0;
	for (const section of editedTimeline.sections) {
		totalRows += 1; // section header
		totalRows += section.tasks.length;
	}
	const chartHeight = HEADER_HEIGHT + bodyTopPadding + totalRows * ROW_HEIGHT;

	const handleExport = useCallback(async (format: "png" | "timeline") => {
		setShowExportMenu(false);

		if (format === "timeline") {
			const { serializeTimeline } = await import("@/lib/timeline-serializer");
			const text = serializeTimeline(editedTimeline);
			const filename = `${timeline.title.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-").toLowerCase()}.timeline`;
			const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			return;
		}

		if (!scrollRef.current) return;
		const { exportChart } = await import("@/lib/chart-export");
		await exportChart({
			scrollContainer: scrollRef.current,
			title: timeline.title,
		});
	}, [timeline.title, editedTimeline]);

	// Generate date columns
	const dates = useMemo(() => {
		const result: Date[] = [];
		for (let i = 0; i < totalDays; i++) {
			result.push(addDays(rangeStart, i));
		}
		return result;
	}, [rangeStart, totalDays]);

	// Build rows (skip unplanned tasks and collapsed sections)
	const rows: { type: "section" | "task"; label: string; task?: ChartTask; sectionId: string; sectionIndex: number }[] = [];
	editedTimeline.sections.forEach((section, sectionIndex) => {
		const isCollapsed = collapsedSections.has(section.id);
		const plannedTasks = section.tasks.filter((t) => t.planned_start && t.planned_end);
		if (plannedTasks.length === 0 && isCollapsed) return; // hide empty collapsed sections
		rows.push({ type: "section", label: section.name, sectionId: section.id, sectionIndex });
		if (!isCollapsed) {
			for (const task of plannedTasks) {
				rows.push({ type: "task", label: task.name, task, sectionId: section.id, sectionIndex });
			}
		}
	});

	const allMilestonePositions = editedTimeline.milestones
		.filter((m) => m.date)
		.map((m) => ({
			...m,
			date: m.date!,
			x: daysBetween(rangeStart, parseDate(m.date!)) * DAY_WIDTH,
		}));

	const milestonePositions = allMilestonePositions.filter((m) => m.kind !== "phase");
	const phasePositions = allMilestonePositions.filter((m) => m.kind === "phase");

	const announcementPositions = editedTimeline.announcements
		.filter((a) => a.date)
		.map((a) => ({
			...a,
			date: a.date!,
			x: daysBetween(rangeStart, parseDate(a.date!)) * DAY_WIDTH,
		}));

	// Milestone navigation (includes both milestones and phases)
	const currentMilestoneIndex = useMemo(() => {
		const sorted = [...allMilestonePositions].sort((a, b) => a.x - b.x);
		return sorted.findIndex((m) => parseDate(m.date) >= today);
	}, [allMilestonePositions, today]);

	const jumpToMilestone = useCallback((direction: "prev" | "next") => {
		const sorted = [...allMilestonePositions].sort((a, b) => a.x - b.x);
		const idx = direction === "next"
			? Math.min(currentMilestoneIndex, sorted.length - 1)
			: Math.max(currentMilestoneIndex - 1, 0);
		const target = sorted[idx];
		if (target && scrollRef.current) {
			scrollRef.current.scrollTo({
				left: target.x - scrollRef.current.clientWidth / 2,
				behavior: "smooth",
			});
		}
	}, [allMilestonePositions, currentMilestoneIndex]);

	const jumpToToday = useCallback(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTo({
				left: todayOffset - scrollRef.current.clientWidth / 2,
				behavior: "smooth",
			});
		}
	}, [todayOffset]);

	// Milestone labels: sync y position with vertical scroll (performant, no re-renders)
	useEffect(() => {
		const container = scrollRef.current;
		if (!container) return;
		const onScroll = () => {
			if (milestoneLabelsRef.current) {
				const y = container.scrollTop;
				milestoneLabelsRef.current.setAttribute("transform", `translate(0, ${y})`);
			}
		};
		container.addEventListener("scroll", onScroll, { passive: true });
		return () => container.removeEventListener("scroll", onScroll);
	}, []);

	// Auto-scroll to selected task
	useEffect(() => {
		if (!selectedTask || !scrollRef.current) return;
		const container = scrollRef.current;

		// Horizontal: scroll to task bar
		const taskStart = parseDate(selectedTask.actual_start || selectedTask.planned_start);
		const taskX = daysBetween(rangeStart, taskStart) * DAY_WIDTH;
		const viewLeft = container.scrollLeft;
		const viewRight = viewLeft + container.clientWidth;
		if (taskX < viewLeft + labelWidth + 50 || taskX > viewRight - 100) {
			container.scrollTo({
				left: Math.max(0, taskX - container.clientWidth / 3),
				behavior: "smooth",
			});
		}

		// Vertical: find the task's row index and scroll to it
		let rowIndex = 0;
		for (const section of editedTimeline.sections) {
			rowIndex++; // section header
			for (const task of section.tasks) {
				if (task.id === selectedTask.id) {
					const taskY = HEADER_HEIGHT + rowIndex * ROW_HEIGHT;
					const viewTop = container.scrollTop;
					const viewBottom = viewTop + container.clientHeight;
					if (taskY < viewTop + HEADER_HEIGHT + 20 || taskY + ROW_HEIGHT > viewBottom - 80) {
						container.scrollTo({
							top: Math.max(0, taskY - container.clientHeight / 3),
							behavior: "smooth",
						});
					}
					break;
				}
				rowIndex++;
			}
		}
	}, [selectedTask, rangeStart, editedTimeline.sections]);

	// Keyboard navigation — use ref to avoid stale closures without re-subscribing
	const keyboardStateRef = useRef({ selectedTask, selectedAnnouncement, allTasks });
	keyboardStateRef.current = { selectedTask, selectedAnnouncement, allTasks };

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const { selectedTask: task, selectedAnnouncement: ann, allTasks: tasks } =
				keyboardStateRef.current;

			if (e.key === "Escape") {
				setSelectedTask(null);
				setSelectedAnnouncement(null);
				return;
			}

			if (e.key === "Tab" && task) {
				e.preventDefault();
				const currentIndex = tasks.findIndex((t) => t.id === task.id);
				if (currentIndex === -1) return;

				const nextIndex = e.shiftKey
					? Math.max(currentIndex - 1, 0)
					: Math.min(currentIndex + 1, tasks.length - 1);

				selectTask(tasks[nextIndex]!);
				return;
			}

			if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !e.metaKey && !e.ctrlKey) {
				if (task || ann) return;
				e.preventDefault();
				jumpToMilestone(e.key === "ArrowLeft" ? "prev" : "next");
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [selectTask, jumpToMilestone]);

	return (
		<div className={`flex flex-col h-full ${darkMode ? "dark" : ""}`}>
			{/* Navigation bar */}
			<div className="border-b border-border-subtle dark:border-stone-700 bg-white/80 dark:bg-stone-900/90 backdrop-blur-sm overflow-visible relative z-30">
				{/* Row 1: Title + primary actions + mobile menu toggle */}
				<div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2">
					<h1 className="text-base sm:text-lg font-semibold text-stone-800 dark:text-stone-100 mr-auto truncate">{timeline.title}</h1>

					{/* Add item — editors and owners only */}
					{canEdit && (
						<button
							type="button"
							onClick={() => { setShowAddModal(true); setMobileMenuOpen(false); }}
							className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md bg-stone-800 dark:bg-stone-200 hover:bg-stone-900 dark:hover:bg-stone-300 text-white dark:text-stone-900 transition-colors"
						>
							<Plus size={12} />
							<span className="hidden sm:inline">Add</span>
						</button>
					)}

					{/* Edit mode toggle — editors and owners only */}
					{canEdit && (
						<button
							type="button"
							onClick={() => setEditMode((e) => !e)}
							className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
								editMode
									? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
									: "bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300"
							}`}
						>
							<Pencil size={12} />
							<span className="hidden sm:inline">{editMode ? "Editing" : "Edit"}</span>
						</button>
					)}

					{/* Save / Discard (visible when dirty) */}
					{isDirty && (
						<div className="flex items-center gap-1.5">
							<button
								type="button"
								onClick={onSave}
								disabled={isSaving}
								className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 hover:bg-green-700 text-white disabled:opacity-40 transition-colors"
							>
								<Save size={12} />
								<span className="hidden sm:inline">{isSaving ? "Saving..." : "Save"}</span>
							</button>
							<button
								type="button"
								onClick={onDiscard}
								disabled={isSaving}
								className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 disabled:opacity-40 transition-colors"
							>
								<X size={12} />
								<span className="hidden sm:inline">Discard</span>
							</button>
						</div>
					)}

					{/* Share button */}
					<button
						type="button"
						onClick={() => { setShowShareDialog(true); setMobileMenuOpen(false); }}
						className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 dark:text-indigo-400 transition-colors"
					>
						<Share2 size={12} />
						<span className="hidden sm:inline">Share</span>
					</button>

					{/* Invite — owner only */}
					{userRole === "owner" && (
						<button
							type="button"
							onClick={() => { setShowInviteModal(true); setMobileMenuOpen(false); }}
							className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 transition-colors"
						>
							<UserPlus size={12} />
							<span className="hidden sm:inline">Invite</span>
						</button>
					)}

					{/* Download button with format dropdown */}
					<div className="relative">
						<button
							type="button"
							onClick={() => setShowExportMenu((v) => !v)}
							className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
						>
							<Download size={12} />
							<span className="hidden sm:inline">Export</span>
						</button>
						{showExportMenu && (
							<>
								<div className="fixed inset-0 z-30" onClick={() => setShowExportMenu(false)} />
								<div className="absolute right-0 top-full mt-1 z-40 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg py-1 min-w-[120px]">
									<button
										type="button"
										onClick={() => handleExport("png")}
										className="w-full text-left px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
									>
										PNG (2x)
									</button>
									<div className="border-t border-stone-100 dark:border-stone-700 my-0.5" />
									<button
										type="button"
										onClick={() => handleExport("timeline")}
										className="w-full text-left px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
									>
										.timeline
									</button>
								</div>
							</>
						)}
					</div>

					{/* Desktop controls — hidden on mobile */}
					<div className="hidden md:contents">
						<div className="w-px h-5 bg-stone-200 dark:bg-stone-700" />
						<button
							type="button"
							onClick={() => jumpToMilestone("prev")}
							className="px-3 py-1.5 text-xs font-medium rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
						>
							Prev Milestone
						</button>
						<button
							type="button"
							onClick={jumpToToday}
							className="px-3 py-1.5 text-xs font-medium rounded-md bg-stone-800 dark:bg-stone-200 hover:bg-stone-900 dark:hover:bg-stone-300 text-white dark:text-stone-900 transition-colors"
						>
							Today
						</button>
						<button
							type="button"
							onClick={() => jumpToMilestone("next")}
							className="px-3 py-1.5 text-xs font-medium rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
						>
							Next Milestone
						</button>
						<div className="w-px h-5 bg-stone-200" />
						<div className="flex items-center gap-0.5 p-0.5 rounded-md bg-stone-100 dark:bg-stone-800">
							{(["day", "week", "month"] as ZoomLevel[]).map((level) => (
								<button
									key={level}
									type="button"
									onClick={() => setZoom(level)}
									className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors capitalize ${
										zoom === level
											? "bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm"
											: "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
									}`}
								>
									{level}
								</button>
							))}
						</div>
						{viewMode && onViewModeChange && (
							<>
								<div className="w-px h-5 bg-stone-200" />
								<div className="flex items-center gap-0.5 p-0.5 rounded-md bg-stone-100 dark:bg-stone-800">
									{(["chart", "split", "source"] as ViewMode[]).map((mode) => (
										<button
											key={mode}
											type="button"
											onClick={() => onViewModeChange(mode)}
											className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors capitalize ${
												viewMode === mode
													? "bg-white text-stone-800 shadow-sm"
													: "text-stone-500 hover:text-stone-700"
											}`}
										>
											{mode}
										</button>
									))}
								</div>
							</>
						)}

						{/* Unplanned toggle */}
						{unplannedCount > 0 && (
							<button
								type="button"
								onClick={() => setShowUnplanned((s) => !s)}
								className={`flex items-center gap-1.5 p-1.5 rounded-md transition-colors ${
									showUnplanned
										? "bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200"
										: "hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 dark:text-stone-500"
								}`}
								title="Unplanned items"
							>
								<Inbox size={14} />
								<span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
									{unplannedCount}
								</span>
							</button>
						)}

						{/* Version history */}
						<button
							type="button"
							onClick={() => setShowVersionPanel((v) => !v)}
							className={`p-1.5 rounded-md transition-colors ${
								showVersionPanel
									? "bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200"
									: "hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 dark:text-stone-500"
							}`}
							title="Version history"
						>
							<History size={14} />
						</button>

						{/* Dark mode toggle */}
						<button
							type="button"
							onClick={() => setDarkMode((d) => !d)}
							className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 dark:text-stone-500 transition-colors"
							title={darkMode ? "Light mode" : "Dark mode"}
						>
							{darkMode ? <Sun size={14} /> : <Moon size={14} />}
						</button>
					</div>

					{/* Mobile menu toggle */}
					<button
						type="button"
						onClick={() => setMobileMenuOpen((v) => !v)}
						className={`md:hidden p-1.5 rounded-md transition-colors ${
							mobileMenuOpen
								? "bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200"
								: "hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 dark:text-stone-500"
						}`}
						title="Menu"
					>
						<Menu size={16} />
					</button>
				</div>

				{/* Row 2: Mobile-only expanded controls */}
				{mobileMenuOpen && (
					<div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-border-subtle dark:border-stone-700 md:hidden">
						<button
							type="button"
							onClick={() => { jumpToMilestone("prev"); setMobileMenuOpen(false); }}
							className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
						>
							Prev
						</button>
						<button
							type="button"
							onClick={() => { jumpToToday(); setMobileMenuOpen(false); }}
							className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-stone-800 dark:bg-stone-200 hover:bg-stone-900 dark:hover:bg-stone-300 text-white dark:text-stone-900 transition-colors"
						>
							Today
						</button>
						<button
							type="button"
							onClick={() => { jumpToMilestone("next"); setMobileMenuOpen(false); }}
							className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
						>
							Next
						</button>

						<div className="w-px h-5 bg-stone-200 dark:bg-stone-700" />

						<div className="flex items-center gap-0.5 p-0.5 rounded-md bg-stone-100 dark:bg-stone-800">
							{(["day", "week", "month"] as ZoomLevel[]).map((level) => (
								<button
									key={level}
									type="button"
									onClick={() => setZoom(level)}
									className={`px-2 py-1 text-[10px] font-medium rounded transition-colors capitalize ${
										zoom === level
											? "bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm"
											: "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
									}`}
								>
									{level}
								</button>
							))}
						</div>

						{viewMode && onViewModeChange && (
							<div className="flex items-center gap-0.5 p-0.5 rounded-md bg-stone-100 dark:bg-stone-800">
								{(["chart", "source"] as ViewMode[]).map((mode) => (
									<button
										key={mode}
										type="button"
										onClick={() => { onViewModeChange(mode); setMobileMenuOpen(false); }}
										className={`px-2 py-1 text-[10px] font-medium rounded transition-colors capitalize ${
											viewMode === mode
												? "bg-white text-stone-800 shadow-sm"
												: "text-stone-500 hover:text-stone-700"
										}`}
									>
										{mode}
									</button>
								))}
							</div>
						)}

						{/* Unplanned toggle */}
						{unplannedCount > 0 && (
							<button
								type="button"
								onClick={() => { setShowUnplanned((s) => !s); setMobileMenuOpen(false); }}
								className={`flex items-center gap-1.5 p-1.5 rounded-md transition-colors ${
									showUnplanned
										? "bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200"
										: "hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 dark:text-stone-500"
								}`}
								title="Unplanned items"
							>
								<Inbox size={14} />
								<span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
									{unplannedCount}
								</span>
							</button>
						)}

						{/* Dark mode toggle */}
						<button
							type="button"
							onClick={() => setDarkMode((d) => !d)}
							className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 dark:text-stone-500 transition-colors"
							title={darkMode ? "Light mode" : "Dark mode"}
						>
							{darkMode ? <Sun size={14} /> : <Moon size={14} />}
						</button>
					</div>
				)}
			</div>

			{/* Chart + Unplanned drawer wrapper */}
			<div className="flex flex-1 overflow-hidden">

			{/* Chart area */}
			<div
				className={`flex-1 overflow-auto bg-white dark:bg-stone-950 ${editMode ? "border-t-2 border-amber-400" : ""}`}
				ref={scrollRef}
			>
				<div style={{ minWidth: labelWidth + chartWidth }}>
					{/* Sticky date header row */}
					<div className="sticky top-0 z-20 flex bg-white dark:bg-stone-900 border-b border-border-subtle dark:border-stone-700">
						<div
							className="shrink-0 sticky left-0 bg-white dark:bg-stone-900 z-10 border-r border-border-subtle dark:border-stone-700 flex items-end justify-end px-3 pb-1.5"
							style={{ width: labelWidth, height: HEADER_HEIGHT }}
						>
							<button
								type="button"
								onClick={() => {
									if (collapsedSections.size === editedTimeline.sections.length) {
										setCollapsedSections(new Set());
									} else {
										setCollapsedSections(new Set(editedTimeline.sections.map((s) => s.id)));
									}
								}}
								className="text-[10px] font-medium text-stone-400 hover:text-stone-600 transition-colors"
							>
								{collapsedSections.size === editedTimeline.sections.length ? "Expand all" : "Collapse all"}
							</button>
						</div>
						<div className="shrink-0" style={{ width: chartWidth }}>
							<svg width={chartWidth} height={HEADER_HEIGHT} className="select-none block">
								<GanttHeader
									dates={dates}
									dayWidth={DAY_WIDTH}
									height={HEADER_HEIGHT}
									chartHeight={HEADER_HEIGHT}
									zoom={zoom}
									dark={darkMode}
								/>
								{/* Today tick in header */}
								{todayOffset > 0 && todayOffset < chartWidth && (
									<g>
										<line x1={todayOffset} y1={26} x2={todayOffset} y2={HEADER_HEIGHT} stroke="#22C55E" strokeWidth={2} opacity={0.5} />
									</g>
								)}
							</svg>
						</div>

						{/* Announcement popover — rendered as HTML on top */}
						{selectedAnnouncement && (
							<div
								className="absolute z-30"
								style={{
									left: Math.max(8, Math.min(windowWidth - 288, labelWidth + selectedAnnouncement.x - 140)),
									top: HEADER_HEIGHT + 24,
								}}
							>
								<div className="w-[280px] max-w-[calc(100vw-2rem)] bg-white dark:bg-stone-800 rounded-lg shadow-xl border border-border-subtle dark:border-stone-700 p-3 text-xs">
									<div className="flex items-center gap-2 mb-1.5">
										{selectedAnnouncement.type === "downtime" ? (
											<TriangleAlert size={12} className="text-red-500 shrink-0" />
										) : (
											<Megaphone size={12} className="text-amber-600 shrink-0" />
										)}
										<span className="font-medium text-stone-500 uppercase tracking-wider text-[10px]">
											{selectedAnnouncement.type === "downtime" ? "Downtime" : "Announcement"}
										</span>
										<span className="text-stone-400 font-mono text-[10px] ml-auto">
											{selectedAnnouncement.date}
										</span>
									</div>
									<p className="text-stone-700 text-[11px] leading-relaxed">{selectedAnnouncement.content}</p>
								</div>
							</div>
						)}
					</div>


					{/* Body: labels + chart rows */}
					<div className="flex relative">
						{/* Labels column — sticky on horizontal scroll */}
						<div
							className="shrink-0 bg-white dark:bg-stone-900 z-10 sticky left-0 relative"
							style={{ width: labelWidth }}
						>
							{/* Top padding to match milestone label space */}
							<div style={{ height: bodyTopPadding }} />
							{rows.map((row, i) => {
								const isCollapsed = row.type === "section" && collapsedSections.has(row.sectionId);
								const taskCount = row.type === "section"
									? editedTimeline.sections.find((s) => s.id === row.sectionId)?.tasks.length ?? 0
									: 0;
								const isTaskSelected = row.type === "task" && selectedTask?.id === row.task?.id;

								if (row.type === "section") {
									return (
										<div
											key={`label-${row.sectionId}-${i}`}
											className="flex items-center gap-1.5 px-3 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 select-none"
											style={{ height: SECTION_HEADER_HEIGHT }}
											onClick={() => toggleSection(row.sectionId)}
										>
											<ChevronRight
												size={13}
												className={`text-stone-400 dark:text-stone-500 transition-transform duration-150 shrink-0 ${isCollapsed ? "" : "rotate-90"}`}
											/>
											<span className="text-[13px] font-semibold text-stone-800 dark:text-stone-200 truncate">
												{row.label}
											</span>
											<span className="ml-auto flex items-center gap-2 shrink-0">
												<span className="text-[11px] tabular-nums text-stone-300 dark:text-stone-600">
													{taskCount}
												</span>
												<button
													type="button"
													className="p-0.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
													onClick={(e) => {
														e.stopPropagation();
														setAddModalDefaultSection(row.sectionId);
														setShowAddModal(true);
													}}
													title="Add task to section"
												>
													<Plus size={12} />
												</button>
											</span>
										</div>
									);
								}

								const statusIcon = {
									todo: <Circle size={13} className="text-stone-300 shrink-0" strokeWidth={1.5} />,
									"in-progress": <Loader size={13} className="text-blue-400 shrink-0 animate-spin" style={{ animationDuration: "3s" }} strokeWidth={1.5} />,
									done: <Check size={13} className="text-green-500 shrink-0" strokeWidth={2} />,
									blocked: <Ban size={13} className="text-red-400 shrink-0" strokeWidth={1.5} />,
									cancelled: <Circle size={13} className="text-stone-300 shrink-0 line-through" strokeWidth={1.5} />,
								}[row.task?.status ?? "todo"];

								return (
									<div
										key={`label-${row.sectionId}-${row.task?.id}-${i}`}
										className={`flex items-center gap-1.5 pr-3 cursor-pointer transition-colors ${
											isTaskSelected
												? "bg-blue-50 dark:bg-blue-500/10"
												: "hover:bg-stone-50 dark:hover:bg-stone-800"
										}`}
										style={{ height: ROW_HEIGHT, paddingLeft: 28 }}
										onClick={() => row.task && setSelectedTask(row.task)}
										title={row.label}
									>
										{statusIcon}
										<span className={`text-[13px] truncate leading-none ${
											isTaskSelected
												? "text-stone-900 dark:text-stone-100 font-medium"
												: "text-stone-500 dark:text-stone-400"
										}`}>
											{row.label}
										</span>
									</div>
								);
							})}

							{/* Resize handle */}
							<div
								className={`absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-blue-400 transition-colors ${isResizing ? "bg-blue-400" : "bg-transparent"}`}
								onMouseDown={handleResizeStart}
								onTouchStart={handleTouchResizeStart}
							/>
						</div>

						{/* Chart body SVG */}
						<div className="shrink-0" style={{ width: chartWidth }}>
						<svg
							width={chartWidth}
							height={chartHeight - HEADER_HEIGHT}
							className="select-none"
							onClick={(e) => {
								if (e.target === e.currentTarget) {
									setSelectedTask(null);
									setSelectedAnnouncement(null);
								}
							}}
						>
						{/* Phase zones — alternating subtle tints between phases (falls back to milestones if no phases) */}
						{(() => {
							const bodyHeight = chartHeight - HEADER_HEIGHT;
							const zoneSource = phasePositions.length > 0 ? phasePositions : milestonePositions;
							const sortedZoneMarkers = [...zoneSource].sort((a, b) => a.x - b.x);
							const zones: { x: number; width: number; index: number; label?: string }[] = [];

							// Build zones: start → m1, m1 → m2, ..., mN → end
							const edges = [0, ...sortedZoneMarkers.map((m) => m.x), chartWidth];
							for (let z = 0; z < edges.length - 1; z++) {
								const zx = edges[z]!;
								const zw = edges[z + 1]! - zx;
								if (zw > 0) zones.push({ x: zx, width: zw, index: z, label: sortedZoneMarkers[z]?.label });
							}

							const pastFill = darkMode ? "rgba(255,255,255,0.008)" : "rgba(0,0,0,0.008)";
							const altFill = darkMode ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.012)";
							const phaseFill = darkMode ? "rgba(56,189,248,0.04)" : "rgba(14,165,233,0.03)";
							const phaseAltFill = darkMode ? "rgba(56,189,248,0.02)" : "rgba(14,165,233,0.015)";

							const usePhaseColors = phasePositions.length > 0;

							return (
								<g>
									{/* Alternating zone tints */}
									{zones.map((zone) => {
										if (!usePhaseColors) {
											// Legacy milestone-based zones
											return zone.index % 2 === 1 ? (
												<rect
													key={`zone-${zone.index}`}
													x={zone.x}
													y={0}
													width={zone.width}
													height={bodyHeight}
													fill={altFill}
												/>
											) : null;
										}
										// Phase-based zones: alternate between two subtle teal tints
										return (
											<rect
												key={`zone-${zone.index}`}
												x={zone.x}
												y={0}
												width={zone.width}
												height={bodyHeight}
												fill={zone.index % 2 === 0 ? phaseFill : phaseAltFill}
											/>
										);
									})}

									{/* Phase boundary lines */}
									{usePhaseColors && sortedZoneMarkers.map((p, pi) => (
										<line
											key={`phase-line-${p.id || pi}`}
											x1={p.x}
											y1={0}
											x2={p.x}
											y2={bodyHeight}
											stroke={darkMode ? "#38BDF8" : "#0EA5E9"}
											strokeWidth={1}
											strokeDasharray="4 6"
											opacity={0.2}
										/>
									))}

									{/* Past dimming — gradient from left to today line */}
									{todayOffset > 0 && (
										<rect
											x={0}
											y={0}
											width={Math.min(todayOffset, chartWidth)}
											height={bodyHeight}
											fill={pastFill}
										/>
									)}
								</g>
							);
						})()}

						{/* Rows */}
						{rows.map((row, i) => {
							const y = bodyTopPadding + i * ROW_HEIGHT;
							if (row.type === "section") {
								return (
									<rect
										key={`section-bg-${i}`}
										x={0}
										y={y}
										width={chartWidth}
										height={SECTION_HEADER_HEIGHT}
										fill={darkMode ? "#0F0F11" : "#FAFAF9"}
									/>
								);
							}
							if (!row.task) return null;
							const task = row.task;
							const startX = daysBetween(rangeStart, parseDate(task.planned_start)) * DAY_WIDTH;
							const width = daysBetween(parseDate(task.planned_start), parseDate(task.planned_end)) * DAY_WIDTH;

							let actualStartX: number | undefined;
							let actualWidth: number | undefined;
							if (task.actual_start && task.actual_end) {
								const actualDiffers =
									task.actual_start !== task.planned_start ||
									task.actual_end !== task.planned_end;
								if (actualDiffers) {
									actualStartX = daysBetween(rangeStart, parseDate(task.actual_start)) * DAY_WIDTH;
									actualWidth = daysBetween(parseDate(task.actual_start), parseDate(task.actual_end)) * DAY_WIDTH;
								}
							}

							return (
								<GanttBar
									key={task.id}
									task={task}
									x={startX}
									y={y + 8}
									width={width}
									height={ROW_HEIGHT - 16}
									actualX={actualStartX}
									actualWidth={actualWidth}
									index={i}
									isSelected={selectedTask?.id === task.id}
									dark={darkMode}
									editMode={editMode}
									isDirty={pendingEdits.has(task.id)}
									onClick={() => {
										if (editMode && dragDidMove.current) return;
										setSelectedTask(selectedTask?.id === task.id ? null : task);
									}}
									onDragStart={(e) => handleBarDragStart(task.id, row.sectionId, e)}
									onResizeStartLeft={(e) => handleResizeLeft(task.id, row.sectionId, e)}
									onResizeStartRight={(e) => handleResizeRight(task.id, row.sectionId, e)}
								/>
							);
						})}

						{/* Milestone lines + vertical labels — rendered BEFORE rows so bars paint over them */}
						{(() => {
							const bodyHeight = chartHeight - HEADER_HEIGHT;
							// Collision-aware label placement: track occupied x ranges
							const occupied: { left: number; right: number }[] = [];
							const LABEL_CHAR_HEIGHT = 6; // approx width per char when rotated

							// Also include announcement x positions as occupied
							for (const a of announcementPositions) {
								occupied.push({ left: a.x - 10, right: a.x + 10 });
							}
							// Include today
							if (todayOffset > 0 && todayOffset < chartWidth) {
								occupied.push({ left: todayOffset - 26, right: todayOffset + 26 });
							}

							return milestonePositions.map((m, mIdx) => {
								// Check if this milestone's vertical label area collides
								const labelLen = m.label.length * LABEL_CHAR_HEIGHT;
								const labelTop = 20;
								const labelBottom = labelTop + labelLen;
								const labelMidY = (labelTop + labelBottom) / 2;

								// Check horizontal collision for the label text offset (x+8)
								const labelLeft = m.x + 2;
								const labelRight = m.x + 14;
								const collides = occupied.some(
									(o) => labelRight > o.left && labelLeft < o.right,
								);
								occupied.push({ left: m.x - 6, right: m.x + 14 });

								const labelH = m.label.length * 6.5 + 16;
								return (
									<g key={`ml-${m.id || mIdx}`}>
										{/* Dashed line — stays in place */}
										<line x1={m.x} y1={0} x2={m.x} y2={bodyHeight} stroke={darkMode ? "#7C3AED" : "#C084FC"} strokeWidth={1.5} strokeDasharray="6 4" opacity={0.3} />
									</g>
								);
							});
						})()}

						{/* Announcements in body */}
						{announcementPositions.map((a, ai) => {
							const isDowntime = a.type === "downtime";
							const isSelected = selectedAnnouncement?.id === a.id;
							const color = isDowntime ? "#DC2626" : "#D97706";
							const bgColor = isDowntime ? (darkMode ? "#450A0A" : "#FEE2E2") : (darkMode ? "#451A03" : "#FEF3C7");
							return (
								<g
									key={`ab-${a.id || ai}`}
									className="cursor-pointer"
									onClick={(e) => { e.stopPropagation(); setSelectedAnnouncement(isSelected ? null : a); }}
								>
									<line x1={a.x} y1={0} x2={a.x} y2={chartHeight - HEADER_HEIGHT} stroke={color} strokeWidth={1} strokeDasharray="3 4" opacity={0.2} />
									<circle cx={a.x} cy={8} r={isSelected ? 8 : 6} fill={isSelected ? color : bgColor} stroke={color} strokeWidth={isSelected ? 1.5 : 0.5} />
									<text x={a.x} y={8.5} textAnchor="middle" dominantBaseline="middle" fill={isSelected ? "#FFF" : color} fontSize={isSelected ? 10 : 9} fontWeight={700}>
										{isDowntime ? "!" : "i"}
									</text>
								</g>
							);
						})}

						{/* Today line */}
						{todayOffset > 0 && todayOffset < chartWidth && (
							<g>
								<line x1={todayOffset} y1={0} x2={todayOffset} y2={chartHeight - HEADER_HEIGHT} stroke="#22C55E" strokeWidth={2} opacity={0.7} />
								{/* TODAY pill at top */}
								<rect x={todayOffset - 22} y={2} width={44} height={16} rx={8} fill="#22C55E" />
								<text x={todayOffset} y={12.5} textAnchor="middle" fill="white" fontSize={8} fontWeight={700} letterSpacing="0.06em">
									TODAY
								</text>
							</g>
						)}
						{/* Phase header bands — labeled horizontal bars between consecutive phases */}
						{(() => {
							const sortedPhases = [...phasePositions].sort((a, b) => a.x - b.x);
							if (sortedPhases.length === 0) return null;

							const bands: { x: number; width: number; label: string; id: string }[] = [];
							for (let i = 0; i < sortedPhases.length; i++) {
								const start = sortedPhases[i]!;
								const end = sortedPhases[i + 1];
								const bandWidth = end ? end.x - start.x : chartWidth - start.x;
								if (bandWidth > 0) {
									bands.push({ x: start.x, width: bandWidth, label: start.label, id: start.id });
								}
							}

							const bandY = 24;
							const bandH = 20;

							return (
								<g>
									{bands.map((band, bi) => (
										<g key={`phase-band-${band.id || bi}`}>
											<rect
												x={band.x}
												y={bandY}
												width={band.width}
												height={bandH}
												rx={4}
												fill={darkMode ? "rgba(14,165,233,0.15)" : "rgba(14,165,233,0.1)"}
											/>
											<rect
												x={band.x}
												y={bandY}
												width={3}
												height={bandH}
												rx={1.5}
												fill={darkMode ? "#38BDF8" : "#0EA5E9"}
											/>
											<text
												x={band.x + 10}
												y={bandY + bandH / 2}
												dominantBaseline="central"
												fill={darkMode ? "#7DD3FC" : "#0369A1"}
												fontSize={9}
												fontWeight={600}
												letterSpacing="0.03em"
											>
												{band.label}
											</text>
										</g>
									))}
								</g>
							);
						})()}

						{/* Milestone sticky labels — translated by JS scroll listener */}
						<g ref={milestoneLabelsRef}>
							{milestonePositions.map((m, mi) => {
								const labelH = m.label.length * 6.5 + 16;
								return (
									<g key={`msl-${m.id || mi}`}>
										<rect x={m.x + 4} y={6} width={20} height={labelH} rx={4} fill={darkMode ? "#2E1065" : "#EDE9FE"} />
										<rect x={m.x + 4} y={6} width={3} height={labelH} rx={1.5} fill="#A855F7" />
										<text
											x={m.x + 15}
											y={14}
											fill={darkMode ? "#C084FC" : "#7C3AED"}
											fontSize={10}
											fontWeight={600}
											transform={`rotate(90, ${m.x + 15}, 14)`}
											textAnchor="start"
										>
											{m.label}
										</text>
									</g>
								);
							})}
						</g>
					</svg>
					</div>
				</div>
			</div>
			</div>

			{/* Unplanned drawer */}
			{showUnplanned && (
				<UnplannedPanel
					timeline={timeline}
					dark={darkMode}
					onClose={() => setShowUnplanned(false)}
				/>
			)}
			</div>

			{/* Backdrop — click to dismiss any open panel */}
			{(selectedTask || selectedAnnouncement) && (
				<div
					className="absolute inset-0 z-10"
					onClick={() => {
						setSelectedTask(null);
						setSelectedAnnouncement(null);
					}}
				/>
			)}

			{/* Task detail panel */}
			{selectedTask && (
				<TaskDetail
					task={selectedTask}
					editMode={editMode}
					onClose={() => setSelectedTask(null)}
					onTaskUpdate={editMode ? handleTaskUpdate : undefined}
				/>
			)}

			{/* Add item modal */}
			{showAddModal && (
				<AddItemModal
					timelineId={timeline.id}
					sections={timeline.sections.map((s) => ({ id: s.id, name: s.name }))}
					onClose={() => { setShowAddModal(false); setAddModalDefaultSection(undefined); }}
					onCreated={() => onRefresh?.()}
					dark={darkMode}
					defaultSectionId={addModalDefaultSection}
				/>
			)}

			{/* Share dialog */}
			{showShareDialog && (
				<ShareDialog timelineId={timeline.id} onClose={() => setShowShareDialog(false)} />
			)}

			{/* Invite modal */}
			{showInviteModal && (
				<InviteModal timelineId={timeline.id} onClose={() => setShowInviteModal(false)} />
			)}

			{/* Version history panel */}
			{showVersionPanel && (
				<VersionPanel
					timelineId={timeline.id}
					dark={darkMode}
					onClose={() => setShowVersionPanel(false)}
					onRestore={(content) => onRestoreVersion?.(content)}
				/>
			)}
		</div>
	);
}
