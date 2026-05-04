import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, FileText, Keyboard, Layers, Link2, Moon, Navigation } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";

const TIMELINE_DEMO = `---
title: Project Phoenix
---

@ 2026-03-01 "Alpha Release"
@ 2026-05-15 "Beta Release"

! 2026-04-10 [downtime] "DB migration window"

## Backend Team

- [done] API scaffolding | 2026-01-15 -> 2026-02-01 | #6366F1
  actual: 2026-01-15 -> 2026-01-28
  note: "Shipped 3 days early"

- [in-progress] Auth service | 2026-02-01 -> 2026-03-15
  depends: API scaffolding

- [blocked] Payment integration | 2026-03-01 -> 2026-04-15
  blocked-by: "Waiting on Stripe contract"

## Frontend Team

- [done] Design system | 2026-01-15 -> 2026-02-28 | #0EA5E9
  actual: 2026-01-15 -> 2026-02-20

- [todo] Dashboard UI | 2026-02-15 -> 2026-04-01`;

const FEATURES = [
	{
		icon: Layers,
		title: "Shadow Tracking",
		desc: "See planned vs actual side by side. Every task shows drift — early, late, or on time.",
		accent: "#6366F1",
	},
	{
		icon: FileText,
		title: ".timeline Format",
		desc: "Plain text, git-friendly, human-readable. Write timelines in any editor, version control them.",
		accent: "#0EA5E9",
	},
	{
		icon: Navigation,
		title: "Milestone Navigation",
		desc: "Jump between releases like chapters. Walk through your project's story in a meeting.",
		accent: "#A855F7",
	},
	{
		icon: Keyboard,
		title: "Keyboard First",
		desc: "Tab through tasks chronologically. Arrow keys between milestones. Escape to dismiss.",
		accent: "#F59E0B",
	},
	{
		icon: Moon,
		title: "Dark Mode",
		desc: "Full dark theme for the chart, labels, detail panels, and every modal.",
		accent: "#10B981",
	},
	{
		icon: Link2,
		title: "Shareable Links",
		desc: "Public or passcode-protected. No account needed for viewers. The best view is the shared view.",
		accent: "#EC4899",
	},
];

function Logo({ size = 40 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 32 32">
			<rect width="32" height="32" rx="7" fill="#1C1C1E" />
			<rect x="5" y="8" width="14" height="4" rx="2" fill="#6366F1" opacity="0.9" />
			<rect x="9" y="14" width="18" height="4" rx="2" fill="#0EA5E9" opacity="0.9" />
			<rect x="7" y="20" width="12" height="4" rx="2" fill="#A855F7" opacity="0.9" />
		</svg>
	);
}

function GitHubMark({ size = 18 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
			focusable="false"
		>
			<path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.8 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.7.4-1.3.7-1.5-2.5-.3-5.2-1.2-5.2-5.5 0-1.2.4-2.2 1.2-3-.1-.3-.5-1.4.1-3 0 0 1-.3 3.3 1.2 1-.3 2-.4 3-.4s2 .1 3 .4c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.7.1 3 .8.8 1.2 1.8 1.2 3 0 4.3-2.7 5.2-5.2 5.5.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.5-1.5 7.8-5.8 7.8-10.9C23.5 5.7 18.3.5 12 .5z" />
		</svg>
	);
}

function SyntaxLine({ children, indent = 0 }: { children: React.ReactNode; indent?: number }) {
	return (
		<div style={{ paddingLeft: indent * 16 }} className="leading-6">
			{children}
		</div>
	);
}

function FormatDemo() {
	const lines = TIMELINE_DEMO.split("\n");

	return (
		<div className="font-mono text-[12px] leading-6 select-all">
			{lines.map((line, i) => {
				const trimmed = line.trim();

				if (trimmed === "---")
					return (
						<div key={i} className="text-stone-400">
							{line}
						</div>
					);
				if (trimmed.startsWith("title:"))
					return (
						<div key={i}>
							<span className="text-stone-500">title:</span>
							<span className="text-stone-700"> {trimmed.slice(6).trim()}</span>
						</div>
					);
				if (trimmed.startsWith("@ "))
					return (
						<div key={i}>
							<span className="text-purple-600">@</span>
							<span className="text-cyan-700"> {trimmed.slice(2, 12)}</span>
							<span className="text-amber-700"> {trimmed.slice(12)}</span>
						</div>
					);
				if (trimmed.startsWith("! "))
					return (
						<div key={i}>
							<span className="text-amber-600">!</span>
							<span className="text-cyan-700"> {trimmed.slice(2, 12)}</span>
							<span className="text-amber-700"> {trimmed.slice(12)}</span>
						</div>
					);
				if (trimmed.startsWith("## "))
					return (
						<div key={i} className="text-blue-600 font-semibold mt-1">
							{line}
						</div>
					);
				if (trimmed.startsWith("- [")) {
					const statusMatch = trimmed.match(/\[(\S+)\]/);
					const statusColor =
						statusMatch?.[1] === "done"
							? "text-green-600"
							: statusMatch?.[1] === "in-progress"
								? "text-blue-500"
								: statusMatch?.[1] === "blocked"
									? "text-red-500"
									: "text-stone-500";
					return (
						<div key={i}>
							<span className="text-stone-400">- </span>
							<span className={statusColor}>[{statusMatch?.[1]}]</span>
							<span className="text-stone-700">
								{" "}
								{trimmed.slice((statusMatch?.index ?? 0) + (statusMatch?.[0]?.length ?? 0))}
							</span>
						</div>
					);
				}
				if (
					trimmed.startsWith("actual:") ||
					trimmed.startsWith("note:") ||
					trimmed.startsWith("depends:") ||
					trimmed.startsWith("blocked-by:")
				) {
					const [key, ...rest] = trimmed.split(":");
					return (
						<div key={i} className="pl-4">
							<span className="text-stone-400">{key}:</span>
							<span className="text-stone-600">{rest.join(":")}</span>
						</div>
					);
				}
				if (trimmed === "") return <div key={i}>&nbsp;</div>;
				return (
					<div key={i} className="text-stone-600">
						{line}
					</div>
				);
			})}
		</div>
	);
}

export function Landing() {
	const targetRef = useRef<HTMLDivElement>(null);
	const { scrollYProgress } = useScroll({ target: targetRef });
	const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
	const heroY = useTransform(scrollYProgress, [0, 0.2], [0, -60]);

	return (
		<div ref={targetRef} className="min-h-screen bg-surface">
			{/* Dot texture */}
			<div
				className="fixed inset-0 pointer-events-none opacity-[0.025]"
				style={{
					backgroundImage: "radial-gradient(circle at 1px 1px, #78716C 0.5px, transparent 0)",
					backgroundSize: "24px 24px",
				}}
			/>

			{/* Nav */}
			<nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-stone-200/50">
				<div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
					<Link to="/" className="flex items-center gap-2.5">
						<Logo size={28} />
						<span className="text-[15px] font-bold text-stone-900 tracking-tight">Chronoview</span>
					</Link>
					<div className="flex items-center gap-3">
						<a
							href="https://github.com/e7nt/chronoview"
							target="_blank"
							rel="noopener noreferrer"
							className="p-1.5 text-stone-500 hover:text-stone-900 transition-colors"
							aria-label="View Chronoview on GitHub"
						>
							<GitHubMark size={18} />
						</a>
						<Link
							to="/t/new"
							className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors"
						>
							Try it free
						</Link>
					</div>
				</div>
			</nav>

			{/* Hero */}
			<motion.section
				style={{ opacity: heroOpacity, y: heroY }}
				className="relative max-w-5xl mx-auto px-6 pt-24 pb-20"
			>
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ type: "spring", stiffness: 200, damping: 25 }}
				>
					{/* Eyebrow */}
					<div className="flex items-center gap-2 mb-6">
						<div className="h-px w-8 bg-stone-300" />
						<span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
							Project Timelines, Reimagined
						</span>
					</div>

					<h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-bold text-stone-900 leading-[1.05] tracking-tight max-w-3xl">
						The beautiful way to{" "}
						<span className="relative inline-block">
							share
							<svg
								className="absolute -bottom-1 left-0 w-full h-3"
								viewBox="0 0 200 12"
								preserveAspectRatio="none"
							>
								<path
									d="M0 8 Q50 0 100 6 T200 4"
									stroke="#6366F1"
									strokeWidth="3"
									fill="none"
									strokeLinecap="round"
									opacity="0.4"
								/>
							</svg>
						</span>{" "}
						project timelines
					</h1>

					<p className="mt-6 text-lg text-stone-500 max-w-xl leading-relaxed">
						Plan, track, and narrate your project's story with a{" "}
						<span className="text-stone-700 font-medium">plain-text format</span> that renders into
						a gorgeous, shareable Gantt chart.
					</p>

					<div className="mt-10 flex items-center gap-4">
						<Link
							to="/t/new"
							className="group inline-flex items-center gap-2.5 px-6 py-3 bg-stone-900 text-white text-sm font-semibold rounded-xl hover:bg-stone-800 transition-colors"
						>
							Start creating
							<ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
						</Link>
						<Link
							to="/t/demo"
							className="px-6 py-3 text-sm font-semibold rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors"
						>
							View live demo
						</Link>
						<a
							href="#format"
							className="text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors"
						>
							See the format &darr;
						</a>
					</div>
				</motion.div>

				{/* Abstract timeline illustration */}
				<motion.div
					initial={{ opacity: 0, x: 40 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 25 }}
					className="absolute top-20 right-6 hidden lg:block w-[320px]"
				>
					<div className="space-y-3 opacity-60">
						{[
							{ w: "70%", color: "#6366F1", delay: 0 },
							{ w: "90%", color: "#0EA5E9", delay: 0.1 },
							{ w: "55%", color: "#A855F7", delay: 0.2 },
							{ w: "80%", color: "#F59E0B", delay: 0.3 },
							{ w: "45%", color: "#10B981", delay: 0.4 },
						].map((bar, i) => (
							<motion.div
								key={i}
								initial={{ width: 0, opacity: 0 }}
								animate={{ width: bar.w, opacity: 1 }}
								transition={{ delay: 0.5 + bar.delay, duration: 0.8, ease: "easeOut" }}
								className="h-6 rounded-md"
								style={{
									backgroundColor: bar.color,
									opacity: 0.25,
									marginLeft: `${i * 12}%`,
								}}
							/>
						))}
						{/* Today line */}
						<motion.div
							initial={{ height: 0 }}
							animate={{ height: "100%" }}
							transition={{ delay: 1.2, duration: 0.5 }}
							className="absolute right-[30%] top-0 w-0.5 bg-green-500/40"
							style={{ height: "100%" }}
						/>
					</div>
				</motion.div>
			</motion.section>

			{/* Features */}
			<section className="max-w-5xl mx-auto px-6 py-20">
				<div className="flex items-center gap-2 mb-10">
					<div className="h-px w-8 bg-stone-300" />
					<span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
						What you get
					</span>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{FEATURES.map((feat, i) => (
						<motion.div
							key={feat.title}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-50px" }}
							transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 30 }}
							className="group p-5 rounded-xl border border-stone-200/60 hover:border-stone-300 bg-white hover:shadow-sm transition-all"
						>
							<div
								className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
								style={{ backgroundColor: `${feat.accent}12` }}
							>
								<feat.icon size={16} style={{ color: feat.accent }} />
							</div>
							<h3 className="text-[14px] font-semibold text-stone-800 mb-1">{feat.title}</h3>
							<p className="text-[12px] text-stone-500 leading-relaxed">{feat.desc}</p>
						</motion.div>
					))}
				</div>
			</section>

			{/* Format demo */}
			<section id="format" className="max-w-5xl mx-auto px-6 py-20">
				<div className="flex items-center gap-2 mb-4">
					<div className="h-px w-8 bg-stone-300" />
					<span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
						The format
					</span>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
					<div>
						<h2 className="text-2xl font-bold text-stone-900 tracking-tight mb-4">
							Plain text that renders beautifully
						</h2>
						<p className="text-stone-500 text-sm leading-relaxed mb-6">
							The{" "}
							<code className="font-mono text-xs bg-stone-100 px-1.5 py-0.5 rounded text-stone-700">
								.timeline
							</code>{" "}
							format is human-readable, git-friendly, and copy-pasteable. Write it in any text
							editor. Version control it with your code. The app renders it into a beautiful,
							interactive Gantt chart.
						</p>
						<div className="space-y-3 text-[12px] text-stone-500">
							<div className="flex items-center gap-2">
								<div className="w-1 h-1 rounded-full bg-purple-400" />
								<code className="font-mono text-purple-600">@</code> marks milestones
							</div>
							<div className="flex items-center gap-2">
								<div className="w-1 h-1 rounded-full bg-amber-400" />
								<code className="font-mono text-amber-600">!</code> marks announcements
							</div>
							<div className="flex items-center gap-2">
								<div className="w-1 h-1 rounded-full bg-blue-400" />
								<code className="font-mono text-blue-600">##</code> creates swim lanes
							</div>
							<div className="flex items-center gap-2">
								<div className="w-1 h-1 rounded-full bg-green-400" />
								<code className="font-mono text-green-600">- [status]</code> defines tasks
							</div>
						</div>
					</div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ type: "spring", stiffness: 200, damping: 25 }}
						className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden"
					>
						<div className="flex items-center gap-2 px-4 py-2.5 border-b border-stone-100 bg-stone-50/50">
							<div className="flex gap-1.5">
								<div className="w-2.5 h-2.5 rounded-full bg-stone-200" />
								<div className="w-2.5 h-2.5 rounded-full bg-stone-200" />
								<div className="w-2.5 h-2.5 rounded-full bg-stone-200" />
							</div>
							<span className="text-[10px] font-mono text-stone-400 ml-2">project.timeline</span>
						</div>
						<div className="p-4 max-h-[300px] sm:max-h-[450px] overflow-y-auto">
							<FormatDemo />
						</div>
					</motion.div>
				</div>
			</section>

			{/* CTA */}
			<section className="max-w-5xl mx-auto px-6 py-20">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					className="text-center"
				>
					<h2 className="text-2xl font-bold text-stone-900 tracking-tight mb-3">
						Ready to try it?
					</h2>
					<p className="text-stone-500 text-sm mb-8">
						No account needed. Create your first timeline in seconds.
					</p>
					<Link
						to="/t/new"
						className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-stone-900 text-white text-sm font-semibold rounded-xl hover:bg-stone-800 transition-colors"
					>
						Start creating — no account needed
						<ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
					</Link>
				</motion.div>
			</section>

			{/* Footer */}
			<footer className="border-t border-stone-200/60 bg-white/50">
				<div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Logo size={20} />
						<span className="text-xs text-stone-400">
							Built with care by{" "}
							<a
								href="https://e7nt.com"
								target="_blank"
								rel="noopener noreferrer"
								className="text-stone-500 hover:text-stone-700 transition-colors"
							>
								e7nt.com
							</a>
						</span>
					</div>
					<div className="flex items-center gap-5">
						<a
							href="https://github.com/e7nt/chronoview"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors"
							aria-label="View Chronoview on GitHub"
						>
							<GitHubMark size={14} />
							<span>GitHub</span>
						</a>
						<Link
							to="/t/new"
							className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
						>
							Try it free &rarr;
						</Link>
					</div>
				</div>
			</footer>
		</div>
	);
}
