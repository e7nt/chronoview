import { motion } from "framer-motion";
import { Diamond, FolderPlus, Layers, ListTodo, Megaphone, X } from "lucide-react";
import { useState } from "react";

type ItemType = "task" | "milestone" | "phase" | "announcement" | "section";

interface AddItemModalProps {
	timelineId: string;
	sections: { id: string; name: string }[];
	onClose: () => void;
	onCreated: () => void;
	dark?: boolean;
	defaultType?: ItemType;
	defaultSectionId?: string;
}

const ITEM_TYPES: { type: ItemType; label: string; icon: typeof ListTodo }[] = [
	{ type: "task", label: "Task", icon: ListTodo },
	{ type: "section", label: "Section", icon: FolderPlus },
	{ type: "phase", label: "Phase", icon: Layers },
	{ type: "milestone", label: "Milestone", icon: Diamond },
	{ type: "announcement", label: "Announcement", icon: Megaphone },
];

const STATUSES = [
	{
		value: "todo",
		label: "To Do",
		bg: "bg-stone-100",
		activeBg: "bg-stone-500",
		text: "text-stone-600",
		activeText: "text-white",
	},
	{
		value: "in-progress",
		label: "In Progress",
		bg: "bg-blue-50",
		activeBg: "bg-blue-500",
		text: "text-blue-600",
		activeText: "text-white",
	},
	{
		value: "done",
		label: "Done",
		bg: "bg-green-50",
		activeBg: "bg-green-500",
		text: "text-green-700",
		activeText: "text-white",
	},
	{
		value: "blocked",
		label: "Blocked",
		bg: "bg-red-50",
		activeBg: "bg-red-500",
		text: "text-red-600",
		activeText: "text-white",
	},
];

const ANNOUNCEMENT_TYPES = [
	{
		value: "general",
		label: "General",
		bg: "bg-stone-100",
		activeBg: "bg-stone-500",
		text: "text-stone-600",
		activeText: "text-white",
	},
	{
		value: "downtime",
		label: "Downtime",
		bg: "bg-red-50",
		activeBg: "bg-red-500",
		text: "text-red-600",
		activeText: "text-white",
	},
	{
		value: "note",
		label: "Note",
		bg: "bg-amber-50",
		activeBg: "bg-amber-500",
		text: "text-amber-700",
		activeText: "text-white",
	},
];

export function AddItemModal({
	timelineId,
	sections,
	onClose,
	onCreated,
	dark = false,
	defaultType = "task",
	defaultSectionId,
}: AddItemModalProps) {
	const [itemType, setItemType] = useState<ItemType>(defaultType);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Task fields
	const [name, setName] = useState("");
	const [sectionId, setSectionId] = useState(defaultSectionId || sections[0]?.id || "");
	const [status, setStatus] = useState("todo");
	const [plannedStart, setPlannedStart] = useState("");
	const [plannedEnd, setPlannedEnd] = useState("");
	const [note, setNote] = useState("");
	const [url, setUrl] = useState("");

	// Section fields
	const [sectionName, setSectionName] = useState("");

	// Milestone fields
	const [milestoneLabel, setMilestoneLabel] = useState("");
	const [milestoneDate, setMilestoneDate] = useState("");

	// Phase fields
	const [phaseLabel, setPhaseLabel] = useState("");
	const [phaseDate, setPhaseDate] = useState("");

	// Announcement fields
	const [announcementContent, setAnnouncementContent] = useState("");
	const [announcementDate, setAnnouncementDate] = useState("");
	const [announcementType, setAnnouncementType] = useState("general");

	const bg = dark ? "bg-stone-900" : "bg-white";
	const border = dark ? "border-stone-700" : "border-stone-200";
	const text = dark ? "text-stone-200" : "text-stone-800";
	const textMuted = dark ? "text-stone-400" : "text-stone-500";
	const inputBg = dark
		? "bg-stone-800 border-stone-700 text-stone-200"
		: "bg-white border-stone-200 text-stone-800";

	const inputClass = `w-full px-3 py-2 rounded-lg border ${inputBg} text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-600`;
	const labelClass = `block text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${textMuted}`;

	const handleSave = async () => {
		setSaving(true);
		setError(null);

		try {
			const headers = { "Content-Type": "application/json" };
			const base = "/api";

			if (itemType === "section") {
				if (!sectionName.trim()) throw new Error("Section name is required");
				const res = await fetch(`${base}/timelines/${timelineId}/sections`, {
					method: "POST",
					headers,
					body: JSON.stringify({ name: sectionName.trim() }),
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(err.detail || "Failed to create section");
				}
			} else if (itemType === "task") {
				if (!name.trim()) throw new Error("Name is required");
				const body: Record<string, unknown> = {
					name: name.trim(),
					status,
					note: note.trim() || undefined,
					url: url.trim() || undefined,
				};
				if (plannedStart) body.planned_start = plannedStart;
				if (plannedEnd) body.planned_end = plannedEnd;

				const res = await fetch(`${base}/timelines/${timelineId}/sections/${sectionId}/tasks`, {
					method: "POST",
					headers,
					body: JSON.stringify(body),
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(err.detail || "Failed to create task");
				}
			} else if (itemType === "phase") {
				if (!phaseLabel.trim()) throw new Error("Label is required");
				const body: Record<string, unknown> = { label: phaseLabel.trim(), kind: "phase" };
				if (phaseDate) body.date = phaseDate;

				const res = await fetch(`${base}/timelines/${timelineId}/milestones`, {
					method: "POST",
					headers,
					body: JSON.stringify(body),
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(err.detail || "Failed to create phase");
				}
			} else if (itemType === "milestone") {
				if (!milestoneLabel.trim()) throw new Error("Label is required");
				const body: Record<string, unknown> = { label: milestoneLabel.trim() };
				if (milestoneDate) body.date = milestoneDate;

				const res = await fetch(`${base}/timelines/${timelineId}/milestones`, {
					method: "POST",
					headers,
					body: JSON.stringify(body),
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(err.detail || "Failed to create milestone");
				}
			} else {
				if (!announcementContent.trim()) throw new Error("Content is required");
				const body: Record<string, unknown> = {
					content: announcementContent.trim(),
					type: announcementType,
				};
				if (announcementDate) body.date = announcementDate;

				const res = await fetch(`${base}/timelines/${timelineId}/announcements`, {
					method: "POST",
					headers,
					body: JSON.stringify(body),
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(err.detail || "Failed to create announcement");
				}
			}

			onCreated();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
			<div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
			<motion.div
				initial={{ opacity: 0, scale: 0.95, y: 8 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				transition={{ type: "spring", stiffness: 400, damping: 30 }}
				className={`relative ${bg} rounded-t-xl sm:rounded-xl shadow-2xl border ${border} w-full sm:max-w-lg sm:mx-4 max-h-[90vh] overflow-y-auto`}
			>
				{/* Header */}
				<div className={`flex items-center justify-between px-5 py-4 border-b ${border}`}>
					<h2 className={`text-sm font-semibold ${text}`}>Add Item</h2>
					<button
						type="button"
						onClick={onClose}
						className={`p-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 ${textMuted}`}
					>
						<X size={14} />
					</button>
				</div>

				<div className="p-5 space-y-4">
					{/* Type selector */}
					<div className="flex flex-wrap gap-2">
						{ITEM_TYPES.map(({ type, label, icon: Icon }) => (
							<button
								key={type}
								type="button"
								onClick={() => setItemType(type)}
								className={`flex-1 basis-[calc(33.33%-0.5rem)] flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
									itemType === type
										? "border-stone-800 bg-stone-800 text-white dark:border-stone-300 dark:bg-stone-300 dark:text-stone-900"
										: `${border} ${textMuted} hover:border-stone-300`
								}`}
							>
								<Icon size={13} />
								<span className="hidden sm:inline">{label}</span>
								<span className="sm:hidden text-[10px]">{label}</span>
							</button>
						))}
					</div>

					{/* Section form */}
					{itemType === "section" && (
						<div className="space-y-3">
							<div>
								<label className={labelClass}>Section Name</label>
								<input
									type="text"
									value={sectionName}
									onChange={(e) => setSectionName(e.target.value)}
									placeholder="e.g. Backend Team, Design, QA"
									className={inputClass}
									autoFocus
								/>
							</div>
							<p className={`text-[10px] ${textMuted}`}>
								Sections are swim lanes — group tasks by team, workstream, or phase.
							</p>
						</div>
					)}

					{/* Task form */}
					{itemType === "task" && (
						<div className="space-y-3">
							<div>
								<label className={labelClass}>Name</label>
								<input
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="What needs to be done..."
									className={inputClass}
									autoFocus
								/>
							</div>
							<div>
								<label className={labelClass}>Section</label>
								<select
									value={sectionId}
									onChange={(e) => setSectionId(e.target.value)}
									className={inputClass}
								>
									{sections.map((s) => (
										<option key={s.id} value={s.id}>
											{s.name}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className={labelClass}>Status</label>
								<div className="grid grid-cols-2 sm:flex gap-1.5">
									{STATUSES.map((s) => (
										<button
											key={s.value}
											type="button"
											onClick={() => setStatus(s.value)}
											className={`sm:flex-1 px-2 py-1.5 rounded text-[10px] font-medium transition-all ${
												status === s.value
													? `${s.activeBg} ${s.activeText}`
													: `${s.bg} ${s.text} hover:opacity-80`
											}`}
										>
											{s.label}
										</button>
									))}
								</div>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className={labelClass}>Planned Start</label>
									<input
										type="date"
										value={plannedStart}
										onChange={(e) => setPlannedStart(e.target.value)}
										className={inputClass}
									/>
								</div>
								<div>
									<label className={labelClass}>Planned End</label>
									<input
										type="date"
										value={plannedEnd}
										onChange={(e) => setPlannedEnd(e.target.value)}
										className={inputClass}
									/>
								</div>
							</div>
							<div>
								<label className={labelClass}>Link (optional)</label>
								<input
									type="url"
									value={url}
									onChange={(e) => setUrl(e.target.value)}
									placeholder="https://..."
									className={inputClass}
								/>
							</div>
							<div>
								<label className={labelClass}>Note (optional)</label>
								<textarea
									value={note}
									onChange={(e) => setNote(e.target.value)}
									placeholder="Additional context..."
									rows={2}
									className={inputClass}
								/>
							</div>
							<p className={`text-[10px] ${textMuted}`}>
								Leave dates empty to add as unplanned item.
							</p>
						</div>
					)}

					{/* Phase form */}
					{itemType === "phase" && (
						<div className="space-y-3">
							<div>
								<label className={labelClass}>Label</label>
								<input
									type="text"
									value={phaseLabel}
									onChange={(e) => setPhaseLabel(e.target.value)}
									placeholder="e.g. Sprint 1, Design Phase, Code Freeze"
									className={inputClass}
									autoFocus
								/>
							</div>
							<div>
								<label className={labelClass}>Start Date</label>
								<input
									type="date"
									value={phaseDate}
									onChange={(e) => setPhaseDate(e.target.value)}
									className={inputClass}
								/>
							</div>
							<p className={`text-[10px] ${textMuted}`}>
								Phases span from their start date to the next phase. Leave date empty to add as
								unplanned.
							</p>
						</div>
					)}

					{/* Milestone form */}
					{itemType === "milestone" && (
						<div className="space-y-3">
							<div>
								<label className={labelClass}>Label</label>
								<input
									type="text"
									value={milestoneLabel}
									onChange={(e) => setMilestoneLabel(e.target.value)}
									placeholder="e.g. Beta Release"
									className={inputClass}
									autoFocus
								/>
							</div>
							<div>
								<label className={labelClass}>Date</label>
								<input
									type="date"
									value={milestoneDate}
									onChange={(e) => setMilestoneDate(e.target.value)}
									className={inputClass}
								/>
							</div>
							<p className={`text-[10px] ${textMuted}`}>
								Leave date empty to add as unplanned milestone.
							</p>
						</div>
					)}

					{/* Announcement form */}
					{itemType === "announcement" && (
						<div className="space-y-3">
							<div>
								<label className={labelClass}>Content</label>
								<textarea
									value={announcementContent}
									onChange={(e) => setAnnouncementContent(e.target.value)}
									placeholder="e.g. Scheduled downtime for DB migration"
									rows={2}
									className={inputClass}
									autoFocus
								/>
							</div>
							<div>
								<label className={labelClass}>Type</label>
								<div className="flex gap-1.5">
									{ANNOUNCEMENT_TYPES.map((t) => (
										<button
											key={t.value}
											type="button"
											onClick={() => setAnnouncementType(t.value)}
											className={`flex-1 px-2 py-1.5 rounded text-[10px] font-medium transition-all ${
												announcementType === t.value
													? `${t.activeBg} ${t.activeText}`
													: `${t.bg} ${t.text} hover:opacity-80`
											}`}
										>
											{t.label}
										</button>
									))}
								</div>
							</div>
							<div>
								<label className={labelClass}>Date</label>
								<input
									type="date"
									value={announcementDate}
									onChange={(e) => setAnnouncementDate(e.target.value)}
									className={inputClass}
								/>
							</div>
							<p className={`text-[10px] ${textMuted}`}>
								Leave date empty to add as unplanned announcement.
							</p>
						</div>
					)}

					{error && <p className="text-xs text-red-500">{error}</p>}

					<button
						type="button"
						onClick={handleSave}
						disabled={saving}
						className="w-full py-2.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-40 transition-colors"
					>
						{saving ? "Saving..." : "Add Item"}
					</button>
				</div>
			</motion.div>
		</div>
	);
}
