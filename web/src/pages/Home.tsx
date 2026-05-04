import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { validateTimeline } from "@/lib/timeline-parser";
import type { Timeline, TimelineWithRole } from "@/lib/types";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Diamond, Layers, LogOut, Plus, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const ACCENT_COLORS = [
	["#6366F1", "#818CF8"], // indigo
	["#0EA5E9", "#38BDF8"], // sky
	["#A855F7", "#C084FC"], // purple
	["#F59E0B", "#FBBF24"], // amber
	["#10B981", "#34D399"], // emerald
	["#EC4899", "#F472B6"], // pink
];

function getTimelineAccent(index: number) {
	return ACCENT_COLORS[index % ACCENT_COLORS.length]!;
}

function TimelineCard({
	timeline,
	index,
}: {
	timeline: Timeline;
	index: number;
}) {
	const [accent, accentLight] = getTimelineAccent(index);
	const updated = new Date(timeline.updated_at);
	const created = new Date(timeline.created_at);
	const daysSinceUpdate = Math.floor((Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24));
	const recency =
		daysSinceUpdate === 0
			? "Updated today"
			: daysSinceUpdate === 1
				? "Updated yesterday"
				: `Updated ${daysSinceUpdate}d ago`;

	// Generate mini bar preview from sections if available
	const sections = timeline.parsed?.sections ?? [];
	const hasSections = sections.length > 0;
	const totalTasks = hasSections
		? sections.reduce((sum: number, s: any) => sum + s.tasks.length, 0)
		: 0;
	const milestoneCount = timeline.parsed?.milestones?.length ?? 0;
	const sectionCount = sections.length;

	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.06, type: "spring", stiffness: 400, damping: 30 }}
		>
			<Link
				to={`/timeline/${timeline.id}`}
				className="group block relative overflow-hidden rounded-xl bg-white border border-stone-200/60 hover:border-stone-300 transition-all duration-200 hover:shadow-md"
			>
				{/* Accent top bar */}
				<div
					className="h-1 w-full"
					style={{
						background: `linear-gradient(90deg, ${accent}, ${accentLight})`,
					}}
				/>

				<div className="p-5">
					<div className="flex items-start justify-between gap-4">
						<div className="flex-1 min-w-0">
							<h3 className="text-[15px] font-semibold text-stone-800 truncate group-hover:text-stone-950 transition-colors">
								{timeline.title}
							</h3>
							<p className="text-[11px] text-stone-400 mt-1 font-mono">{recency}</p>
						</div>
						<ArrowRight
							size={16}
							className="text-stone-300 group-hover:text-stone-500 group-hover:translate-x-0.5 transition-all mt-1 shrink-0"
						/>
					</div>

					{/* Mini bar preview */}
					{hasSections && (
						<div className="mt-4 space-y-[3px]">
							{sections.slice(0, 4).map((section) => (
								<div key={section.id} className="flex gap-[2px] h-[5px]">
									{section.tasks.slice(0, 12).map((task) => (
										<div
											key={task.id}
											className="rounded-full"
											style={{
												backgroundColor: task.color || accent,
												opacity:
													task.status === "done" ? 0.7 : task.status === "blocked" ? 0.3 : 0.5,
												flex: `0 0 ${Math.max(8, Math.min(40, 100 / Math.max(section.tasks.length, 1)))}%`,
											}}
										/>
									))}
								</div>
							))}
						</div>
					)}

					{/* Stats row */}
					{hasSections && (
						<div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-4">
							<span className="flex items-center gap-1.5 text-[10px] text-stone-400 font-medium">
								<Layers size={10} strokeWidth={2} />
								{sectionCount} {sectionCount === 1 ? "section" : "sections"}
							</span>
							<span className="flex items-center gap-1.5 text-[10px] text-stone-400 font-medium">
								<Clock size={10} strokeWidth={2} />
								{totalTasks} {totalTasks === 1 ? "task" : "tasks"}
							</span>
							{milestoneCount > 0 && (
								<span className="flex items-center gap-1.5 text-[10px] text-stone-400 font-medium">
									<Diamond size={10} strokeWidth={2} />
									{milestoneCount}
								</span>
							)}
						</div>
					)}
				</div>
			</Link>
		</motion.div>
	);
}

export function Home() {
	const [timelineList, setTimelineList] = useState<TimelineWithRole[]>([]);
	const [timelines, setTimelines] = useState<Timeline[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [title, setTitle] = useState("");
	const [creating, setCreating] = useState(false);
	const [inputFocused, setInputFocused] = useState(false);
	const [importing, setImporting] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();
	const { user, logout } = useAuth();

	const ownedTimelines = timelines.filter((t) => {
		const meta = timelineList.find((m) => m.id === t.id);
		return !meta || meta.role === "owner";
	});
	const sharedTimelines = timelines.filter((t) => {
		const meta = timelineList.find((m) => m.id === t.id);
		return meta && meta.role !== "owner";
	});

	useEffect(() => {
		api
			.listTimelines()
			.then(async (list) => {
				setTimelineList(list);
				const full = await Promise.all(
					list.map((t) =>
						api.getTimeline(t.id).catch(
							() =>
								({
									...t,
									sections: [],
									milestones: [],
									announcements: [],
								}) as unknown as Timeline,
						),
					),
				);
				setTimelines(full);
			})
			.catch((err) => setError(err.message))
			.finally(() => setLoading(false));
	}, []);

	const handleCreate = async () => {
		if (!title.trim() || creating) return;
		setCreating(true);
		try {
			const timeline = await api.createTimeline({ title: title.trim() });
			setTitle("");
			navigate(`/timeline/${timeline.id}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create timeline");
		} finally {
			setCreating(false);
		}
	};

	const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		e.target.value = ""; // reset file input

		setImporting(true);
		setError(null);
		try {
			const text = await file.text();
			const validation = validateTimeline(text);

			if (!validation.valid) {
				setError(`Import failed: ${validation.errors.join("; ")}`);
				return;
			}

			const parsed = validation.parsed!;
			const result = await api.createTimeline({
				title: parsed.title || file.name.replace(/\.timeline$/, ""),
				content: text,
			});
			navigate(`/timeline/${result.id}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Import failed");
		} finally {
			setImporting(false);
		}
	};

	return (
		<div className="min-h-screen bg-surface">
			{/* Subtle background texture */}
			<div
				className="fixed inset-0 pointer-events-none opacity-[0.03]"
				style={{
					backgroundImage: "radial-gradient(circle at 1px 1px, #78716C 0.5px, transparent 0)",
					backgroundSize: "24px 24px",
				}}
			/>

			<div className="relative">
				{/* Hero */}
				<div className="max-w-3xl mx-auto px-6 pt-20 pb-12">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ type: "spring", stiffness: 300, damping: 30 }}
					>
						{/* Header: logo + user */}
						<div className="flex items-center justify-between mb-6">
							<div className="flex items-center gap-3">
								<div className="w-9 h-9 rounded-lg bg-stone-900 flex items-center justify-center">
									<svg width="18" height="18" viewBox="0 0 32 32">
										<rect x="3" y="7" width="16" height="4.5" rx="2" fill="#6366F1" />
										<rect x="7" y="14" width="20" height="4.5" rx="2" fill="#0EA5E9" />
										<rect x="5" y="21" width="14" height="4.5" rx="2" fill="#A855F7" />
									</svg>
								</div>
								<h1 className="text-2xl font-bold text-stone-900 tracking-tight">Chronoview</h1>
							</div>
							{user && (
								<div className="flex items-center gap-3">
									{user.avatar_url && (
										<img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full" />
									)}
									<span className="text-xs text-stone-500 hidden sm:block">
										{user.display_name || user.email}
									</span>
									<button
										type="button"
										onClick={logout}
										className="p-1.5 rounded-md hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
										title="Sign out"
									>
										<LogOut size={14} />
									</button>
								</div>
							)}
						</div>

						<p className="text-stone-500 text-lg leading-relaxed max-w-lg">
							Beautiful, shareable project timelines.
							<br />
							<span className="text-stone-400">Plan, track, and narrate your project's story.</span>
						</p>
					</motion.div>

					{/* Create input */}
					<motion.div
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							delay: 0.1,
							type: "spring",
							stiffness: 300,
							damping: 30,
						}}
						className="mt-10"
					>
						<div
							className={`flex items-center gap-2 p-1.5 rounded-xl border transition-all duration-200 bg-white ${
								inputFocused ? "border-stone-400 shadow-sm shadow-stone-200/50" : "border-stone-200"
							}`}
						>
							<div className="flex items-center justify-center w-9 h-9 rounded-lg bg-stone-100 shrink-0">
								<Plus
									size={16}
									className={`transition-colors ${inputFocused ? "text-stone-600" : "text-stone-400"}`}
								/>
							</div>
							<input
								ref={inputRef}
								type="text"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleCreate()}
								onFocus={() => setInputFocused(true)}
								onBlur={() => setInputFocused(false)}
								placeholder="Create a new timeline..."
								className="flex-1 text-sm text-stone-800 placeholder:text-stone-400 bg-transparent focus:outline-none py-2"
							/>
							{title.trim() && (
								<motion.button
									initial={{ opacity: 0, scale: 0.9 }}
									animate={{ opacity: 1, scale: 1 }}
									type="button"
									onClick={handleCreate}
									disabled={creating}
									className="px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 disabled:opacity-40 transition-colors shrink-0"
								>
									{creating ? "Creating..." : "Create"}
								</motion.button>
							)}
						</div>

						{/* Import button */}
						<div className="flex justify-end mt-3">
							<input
								ref={fileInputRef}
								type="file"
								accept=".timeline,.txt"
								onChange={handleImport}
								className="hidden"
							/>
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								disabled={importing}
								className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors disabled:opacity-40"
							>
								<Upload size={12} />
								{importing ? "Importing..." : "Import .timeline file"}
							</button>
						</div>
					</motion.div>
				</div>

				{/* Error */}
				{error && (
					<div className="max-w-3xl mx-auto px-6 mb-6">
						<div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700 flex items-center justify-between">
							{error}
							<button
								type="button"
								onClick={() => setError(null)}
								className="text-red-400 hover:text-red-600 text-xs font-medium ml-4"
							>
								Dismiss
							</button>
						</div>
					</div>
				)}

				{/* Timeline grid */}
				<div className="max-w-3xl mx-auto px-6 pb-20">
					{loading ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{[0, 1, 2].map((i) => (
								<div key={i} className="h-32 rounded-xl bg-stone-100/50 animate-pulse" />
							))}
						</div>
					) : timelines.length === 0 ? (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.2 }}
							className="text-center py-20"
						>
							<div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-stone-100 flex items-center justify-center">
								<svg width="28" height="28" viewBox="0 0 32 32" opacity="0.4">
									<rect x="3" y="7" width="16" height="4.5" rx="2" fill="#78716C" />
									<rect x="7" y="14" width="20" height="4.5" rx="2" fill="#78716C" />
									<rect x="5" y="21" width="14" height="4.5" rx="2" fill="#78716C" />
								</svg>
							</div>
							<p className="text-stone-400 text-sm">No timelines yet.</p>
							<p className="text-stone-400/70 text-xs mt-1">
								Create your first one above to get started.
							</p>
						</motion.div>
					) : (
						<>
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest">
									Your Timelines
								</h2>
								<span className="text-[10px] text-stone-400 font-mono">
									{ownedTimelines.length}
								</span>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								{ownedTimelines.map((t, i) => (
									<TimelineCard key={t.id} timeline={t} index={i} />
								))}
							</div>

							{sharedTimelines.length > 0 && (
								<>
									<div className="flex items-center justify-between mb-4 mt-10">
										<h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest">
											Shared with me
										</h2>
										<span className="text-[10px] text-stone-400 font-mono">
											{sharedTimelines.length}
										</span>
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										{sharedTimelines.map((t, i) => {
											const meta = timelineList.find((m) => m.id === t.id);
											return (
												<div key={t.id} className="relative">
													<TimelineCard timeline={t} index={i} />
													{meta && (
														<span
															className={`absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
																meta.role === "editor"
																	? "bg-emerald-100 text-emerald-700"
																	: "bg-stone-100 text-stone-500"
															}`}
														>
															{meta.role === "editor" ? "Editor" : "Viewer"}
														</span>
													)}
												</div>
											);
										})}
									</div>
								</>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}
