import type { ChartTask } from "@/lib/build-chart-timeline";
import { STATUS_LABELS } from "@/lib/constants";
import { daysBetween, formatDateFull, parseDate } from "@/lib/date-utils";
import { motion } from "framer-motion";
import { ExternalLink, X } from "lucide-react";
import { useState } from "react";

const STATUSES = ["todo", "in-progress", "done", "blocked", "cancelled"] as const;

interface TaskDetailProps {
	task: ChartTask;
	editMode?: boolean;
	onClose: () => void;
	onTaskUpdate?: (taskId: string, changes: Partial<ChartTask>) => void;
}

export function TaskDetail({ task, editMode = false, onClose, onTaskUpdate }: TaskDetailProps) {
	const status = STATUS_LABELS[task.status] || STATUS_LABELS.todo;
	const plannedDays = daysBetween(parseDate(task.planned_start), parseDate(task.planned_end));

	const hasActual = task.actual_start && task.actual_end;
	const actualDays = hasActual
		? daysBetween(parseDate(task.actual_start!), parseDate(task.actual_end!))
		: null;

	const drift = actualDays !== null ? actualDays - plannedDays : null;
	const hasDrift = drift !== null && drift !== 0;
	const datesMatch =
		hasActual && task.actual_start === task.planned_start && task.actual_end === task.planned_end;

	const canEdit = editMode && onTaskUpdate;

	const update = (changes: Partial<ChartTask>) => {
		onTaskUpdate?.(task.id, changes);
	};

	const inputClass =
		"px-2 py-1 text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-blue-400";
	const labelClass = "text-stone-400 uppercase tracking-wider text-[10px]";

	return (
		<motion.div
			initial={{ y: "100%" }}
			animate={{ y: 0 }}
			exit={{ y: "100%" }}
			transition={{ type: "spring", stiffness: 400, damping: 35 }}
			className="absolute bottom-0 left-0 right-0 bg-white dark:bg-stone-900 border-t border-border-subtle dark:border-stone-700 shadow-lg rounded-t-xl p-4 sm:p-5 max-h-[50vh] sm:max-h-[40vh] overflow-y-auto z-20"
		>
			{/* Header row */}
			<div className="flex items-center gap-2 sm:gap-3 mb-3 flex-wrap">
				{canEdit ? (
					<input
						type="text"
						value={task.name}
						onChange={(e) => update({ name: e.target.value })}
						className={`${inputClass} text-sm font-semibold flex-1 min-w-[200px]`}
					/>
				) : (
					<h2 className="text-sm sm:text-base font-semibold text-stone-800 dark:text-stone-100">
						{task.name}
					</h2>
				)}
				{task.url && (
					<a
						href={task.url}
						target="_blank"
						rel="noopener noreferrer"
						onClick={(e) => e.stopPropagation()}
						className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
					>
						<ExternalLink size={10} />
						Open
					</a>
				)}

				{/* Status — editable as pill buttons or read-only badge */}
				{canEdit ? (
					<div className="flex gap-1">
						{STATUSES.map((s) => {
							const sl = STATUS_LABELS[s]!;
							const isActive = task.status === s;
							return (
								<button
									key={s}
									type="button"
									onClick={() => update({ status: s })}
									className={`px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors ${
										isActive ? sl.className : "bg-stone-50 text-stone-400 hover:bg-stone-100"
									}`}
								>
									{sl.label}
								</button>
							);
						})}
					</div>
				) : (
					<span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${status.className}`}>
						{status.label}
					</span>
				)}

				{/* Drift badge */}
				{hasDrift && !canEdit && (
					<span
						className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
							drift! > 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
						}`}
					>
						{drift! > 0 ? `+${drift}d over` : `${Math.abs(drift!)}d early`}
					</span>
				)}

				<button
					type="button"
					onClick={onClose}
					className="ml-auto p-1 rounded-md hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
				>
					<X size={14} />
				</button>
			</div>

			{/* Dates — editable or read-only */}
			<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start">
				{canEdit ? (
					<div className="flex flex-wrap gap-3 text-xs">
						<div>
							<span className={labelClass}>Start</span>
							<input
								type="date"
								value={task.planned_start || ""}
								onChange={(e) => update({ planned_start: e.target.value })}
								className={`${inputClass} block mt-1`}
							/>
						</div>
						<div>
							<span className={labelClass}>End</span>
							<input
								type="date"
								value={task.planned_end || ""}
								onChange={(e) => update({ planned_end: e.target.value })}
								className={`${inputClass} block mt-1`}
							/>
						</div>
						<div>
							<span className={labelClass}>Color</span>
							<input
								type="color"
								value={task.color || "#6B7280"}
								onChange={(e) => update({ color: e.target.value })}
								className="block mt-1 w-8 h-8 rounded border border-stone-200 cursor-pointer"
							/>
						</div>
					</div>
				) : (
					<div className="flex flex-col sm:flex-row gap-2 sm:gap-3 text-xs">
						<div>
							<span className={labelClass}>Planned</span>
							<p className="text-stone-700 font-medium mt-0.5">
								{formatDateFull(parseDate(task.planned_start))} →{" "}
								{formatDateFull(parseDate(task.planned_end))}
								<span className="text-stone-400 font-normal ml-1.5">({plannedDays}d)</span>
							</p>
						</div>

						{hasActual && !datesMatch && (
							<div>
								<span className={labelClass}>Actual</span>
								<p className="text-stone-700 font-medium mt-0.5">
									{formatDateFull(parseDate(task.actual_start!))} →{" "}
									{formatDateFull(parseDate(task.actual_end!))}
									<span className="text-stone-400 font-normal ml-1.5">({actualDays}d)</span>
								</p>
							</div>
						)}

						{!hasActual && (
							<div>
								<span className={labelClass}>Actual</span>
								<p className="text-stone-400 italic mt-0.5">Not tracked</p>
							</div>
						)}
					</div>
				)}

				{/* Shadow visualization — only in view mode when dates differ */}
				{!canEdit && hasActual && !datesMatch && (
					<div className="w-full sm:flex-1 sm:min-w-[200px]">
						<span className={labelClass}>Comparison</span>
						<div className="space-y-1 mt-1">
							<div className="flex items-center gap-2">
								<span className="text-[10px] text-stone-400 w-10">Plan</span>
								<div className="flex-1 h-4 bg-stone-100 rounded relative overflow-hidden">
									<div
										className="absolute h-full rounded opacity-30"
										style={{ backgroundColor: task.color || "#3B82F6", left: "0%", width: "100%" }}
									/>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-[10px] text-stone-400 w-10">Real</span>
								<div className="flex-1 h-4 bg-stone-100 rounded relative overflow-hidden">
									<div
										className="absolute h-full rounded"
										style={{
											backgroundColor: task.color || "#3B82F6",
											left: `${(daysBetween(parseDate(task.planned_start), parseDate(task.actual_start!)) / Math.max(plannedDays, 1)) * 100}%`,
											width: `${(actualDays! / Math.max(plannedDays, 1)) * 100}%`,
										}}
									/>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Note — editable or read-only */}
			{canEdit ? (
				<div className="mt-3">
					<span className={labelClass}>Note</span>
					<input
						type="text"
						value={task.note || ""}
						onChange={(e) => update({ note: e.target.value || null })}
						placeholder="Add a note..."
						className={`${inputClass} block mt-1 w-full`}
					/>
				</div>
			) : (
				(task.blocked_reason || task.note) && (
					<div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-3">
						{task.blocked_reason && (
							<div className="flex-1 p-2.5 rounded-lg bg-red-50 border border-red-100">
								<p className="text-[10px] font-medium uppercase tracking-wider text-red-400 mb-0.5">
									Blocked by
								</p>
								<p className="text-xs text-red-700">{task.blocked_reason}</p>
							</div>
						)}
						{task.note && (
							<div className="flex-1 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
								<p className="text-[10px] font-medium uppercase tracking-wider text-amber-500 mb-0.5">
									Note
								</p>
								<p className="text-xs text-amber-800">{task.note}</p>
							</div>
						)}
					</div>
				)
			)}
		</motion.div>
	);
}
