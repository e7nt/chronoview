import { motion } from "framer-motion";
import { X, Circle, Loader, Check, Ban, Diamond, Layers, Megaphone, TriangleAlert, Inbox } from "lucide-react";
import type { Timeline, TimelineTask } from "@/lib/types";
import { STATUS_COLORS } from "@/lib/constants";

interface UnplannedPanelProps {
	timeline: Timeline;
	dark?: boolean;
	onClose: () => void;
}

export function UnplannedPanel({ timeline, dark = false, onClose }: UnplannedPanelProps) {
	const unplannedTasks: (TimelineTask & { sectionName: string })[] = [];
	for (const section of timeline.sections) {
		for (const task of section.tasks) {
			if (!task.planned_start || !task.planned_end) {
				unplannedTasks.push({ ...task, sectionName: section.name });
			}
		}
	}
	const unplannedMilestones = timeline.milestones.filter((m) => !m.date && m.kind !== "phase");
	const unplannedPhases = timeline.milestones.filter((m) => !m.date && m.kind === "phase");
	const unplannedAnnouncements = timeline.announcements.filter((a) => !a.date);

	const statusIcon = (status: string) => {
		const icons: Record<string, JSX.Element> = {
			todo: <Circle size={13} className="text-stone-400" strokeWidth={1.5} />,
			"in-progress": <Loader size={13} className="text-blue-400 animate-spin" style={{ animationDuration: "3s" }} strokeWidth={1.5} />,
			done: <Check size={13} className="text-green-500" strokeWidth={2} />,
			blocked: <Ban size={13} className="text-red-400" strokeWidth={1.5} />,
			cancelled: <Circle size={13} className="text-stone-300" strokeWidth={1.5} />,
		};
		return icons[status] || icons.todo;
	};

	// Group tasks by section
	const tasksBySection = new Map<string, (TimelineTask & { sectionName: string })[]>();
	for (const task of unplannedTasks) {
		const existing = tasksBySection.get(task.sectionName) || [];
		existing.push(task);
		tasksBySection.set(task.sectionName, existing);
	}

	return (
		<>
		{/* Mobile backdrop */}
		<div
			className={`fixed inset-0 bg-black/20 z-20 sm:hidden ${dark ? "bg-black/40" : ""}`}
			onClick={onClose}
		/>
		<motion.div
			initial={{ x: "100%" }}
			animate={{ x: 0 }}
			exit={{ x: "100%" }}
			transition={{ type: "spring", stiffness: 400, damping: 35 }}
			className={`fixed inset-0 z-30 sm:relative sm:inset-auto sm:z-auto w-full sm:w-[300px] shrink-0 sm:border-l flex flex-col h-full ${
				dark ? "border-stone-700 bg-stone-900" : "border-stone-200 bg-white"
			}`}
		>
			{/* Header */}
			<div className={`flex items-center gap-2 px-4 py-3 border-b ${dark ? "border-stone-700" : "border-stone-100"}`}>
				<Inbox size={14} className={dark ? "text-stone-400" : "text-stone-500"} />
				<span className={`text-[13px] font-semibold ${dark ? "text-stone-200" : "text-stone-700"}`}>
					Unplanned
				</span>
				<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${dark ? "bg-stone-800 text-stone-400" : "bg-stone-100 text-stone-500"}`}>
					{unplannedTasks.length + unplannedMilestones.length + unplannedAnnouncements.length}
				</span>
				<button
					type="button"
					onClick={onClose}
					className={`ml-auto p-1 rounded-md transition-colors ${dark ? "hover:bg-stone-800 text-stone-500" : "hover:bg-stone-100 text-stone-400"}`}
				>
					<X size={14} />
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-3 space-y-4">
				{/* Tasks grouped by section */}
				{Array.from(tasksBySection.entries()).map(([sectionName, tasks]) => (
					<div key={sectionName}>
						<p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 px-1 ${dark ? "text-stone-500" : "text-stone-400"}`}>
							{sectionName}
						</p>
						<div className="space-y-1">
							{tasks.map((task) => (
								<div
									key={task.id}
									className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors cursor-pointer ${
										dark ? "hover:bg-stone-800" : "hover:bg-stone-50"
									}`}
								>
									{statusIcon(task.status)}
									<span className={`text-[12px] truncate ${dark ? "text-stone-300" : "text-stone-700"}`}>
										{task.name}
									</span>
								</div>
							))}
						</div>
					</div>
				))}

				{/* Phases */}
				{unplannedPhases.length > 0 && (
					<div>
						<p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 px-1 ${dark ? "text-stone-500" : "text-stone-400"}`}>
							Phases
						</p>
						<div className="space-y-1">
							{unplannedPhases.map((p) => (
								<div
									key={p.id}
									className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors cursor-pointer ${
										dark ? "hover:bg-stone-800" : "hover:bg-stone-50"
									}`}
								>
									<Layers size={13} className="text-sky-400 shrink-0" />
									<span className={`text-[12px] truncate ${dark ? "text-stone-300" : "text-stone-700"}`}>
										{p.label}
									</span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Milestones */}
				{unplannedMilestones.length > 0 && (
					<div>
						<p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 px-1 ${dark ? "text-stone-500" : "text-stone-400"}`}>
							Milestones
						</p>
						<div className="space-y-1">
							{unplannedMilestones.map((m) => (
								<div
									key={m.id}
									className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors cursor-pointer ${
										dark ? "hover:bg-stone-800" : "hover:bg-stone-50"
									}`}
								>
									<Diamond size={13} className="text-purple-400 shrink-0" />
									<span className={`text-[12px] truncate ${dark ? "text-stone-300" : "text-stone-700"}`}>
										{m.label}
									</span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Announcements */}
				{unplannedAnnouncements.length > 0 && (
					<div>
						<p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 px-1 ${dark ? "text-stone-500" : "text-stone-400"}`}>
							Announcements
						</p>
						<div className="space-y-1">
							{unplannedAnnouncements.map((a) => (
								<div
									key={a.id}
									className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors cursor-pointer ${
										dark ? "hover:bg-stone-800" : "hover:bg-stone-50"
									}`}
								>
									{a.type === "downtime" ? (
										<TriangleAlert size={13} className="text-red-400 shrink-0" />
									) : (
										<Megaphone size={13} className="text-amber-400 shrink-0" />
									)}
									<span className={`text-[12px] truncate ${dark ? "text-stone-300" : "text-stone-700"}`}>
										{a.content}
									</span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Empty state */}
				{unplannedTasks.length === 0 && unplannedMilestones.length === 0 && unplannedAnnouncements.length === 0 && (
					<div className="text-center py-8">
						<p className={`text-[12px] ${dark ? "text-stone-600" : "text-stone-400"}`}>
							All items are planned
						</p>
					</div>
				)}
			</div>

			{/* Footer hint */}
			<div className={`px-4 py-2.5 border-t text-center ${dark ? "border-stone-700" : "border-stone-100"}`}>
				<p className={`text-[10px] ${dark ? "text-stone-600" : "text-stone-400"}`}>
					Assign dates to move items to the chart
				</p>
			</div>
		</motion.div>
		</>
	);
}
