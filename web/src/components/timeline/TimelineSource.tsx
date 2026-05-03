import { useMemo, useRef, useState } from "react";
import { Copy, Check, HelpCircle, X } from "lucide-react";

interface TimelineSourceProps {
	source: string;
	editable?: boolean;
	onChange?: (newSource: string) => void;
}

type TokenType =
	| "frontmatter"
	| "heading"
	| "section"
	| "phase"
	| "milestone"
	| "announcement"
	| "status"
	| "date"
	| "color"
	| "string"
	| "key"
	| "pipe"
	| "arrow"
	| "text"
	| "id-marker";

interface Token {
	type: TokenType;
	value: string;
}

const TOKEN_COLORS: Record<TokenType, string> = {
	frontmatter: "text-stone-400",
	heading: "text-purple-500 font-semibold",
	section: "text-blue-500 font-semibold",
	phase: "text-sky-600",
	milestone: "text-purple-600",
	announcement: "text-amber-600",
	status: "text-emerald-600 font-medium",
	date: "text-cyan-600 font-mono",
	color: "text-pink-500 font-mono",
	string: "text-amber-700",
	key: "text-stone-500",
	pipe: "text-stone-300",
	arrow: "text-stone-400",
	text: "text-stone-700",
	"id-marker": "text-stone-300/40 text-[9px]",
};

// Extract and split off ID comment from the end of a line
const ID_COMMENT_RE = /(\s*<!--\s*\w+:[a-f0-9-]+\s*-->)$/;

function tokenizeLine(line: string): Token[] {
	const trimmed = line.trimStart();
	const indent = line.length - trimmed.length;
	const tokens: Token[] = [];

	// Check for trailing ID comment
	let mainLine = line;
	let idSuffix: string | null = null;
	const idMatch = line.match(ID_COMMENT_RE);
	if (idMatch) {
		mainLine = line.slice(0, idMatch.index!);
		idSuffix = idMatch[1]!;
	}

	const mainTrimmed = mainLine.trimStart();
	const mainIndent = mainLine.length - mainTrimmed.length;

	if (mainIndent > 0) {
		tokens.push({ type: "text", value: " ".repeat(mainIndent) });
	}

	// Frontmatter
	if (mainTrimmed === "---") {
		tokens.push({ type: "frontmatter", value: mainLine });
		if (idSuffix) tokens.push({ type: "id-marker", value: idSuffix });
		return tokens;
	}

	// Headings
	if (mainTrimmed.startsWith("# ")) {
		tokens.push({ type: "heading", value: mainLine });
		if (idSuffix) tokens.push({ type: "id-marker", value: idSuffix });
		return tokens;
	}
	if (mainTrimmed.startsWith("## ")) {
		tokens.push({ type: "section", value: mainLine });
		if (idSuffix) tokens.push({ type: "id-marker", value: idSuffix });
		return tokens;
	}

	// Phase: ~ 2026-03-01 "Sprint 1"
	if (mainTrimmed.startsWith("~ ")) {
		const match = mainTrimmed.match(/^(~)\s+(\d{4}-\d{2}-\d{2})\s+(".*")$/);
		if (match) {
			tokens.push({ type: "phase", value: "~ " });
			tokens.push({ type: "date", value: match[2]! });
			tokens.push({ type: "text", value: " " });
			tokens.push({ type: "string", value: match[3]! });
		} else {
			tokens.push({ type: "phase", value: mainLine });
		}
		if (idSuffix) tokens.push({ type: "id-marker", value: idSuffix });
		return tokens;
	}

	// Milestone: @ 2026-03-01 "Alpha Release"
	if (mainTrimmed.startsWith("@ ")) {
		const match = mainTrimmed.match(/^(@)\s+(\d{4}-\d{2}-\d{2})\s+(".*")$/);
		if (match) {
			tokens.push({ type: "milestone", value: "@ " });
			tokens.push({ type: "date", value: match[2]! });
			tokens.push({ type: "text", value: " " });
			tokens.push({ type: "string", value: match[3]! });
		} else {
			tokens.push({ type: "milestone", value: mainLine });
		}
		if (idSuffix) tokens.push({ type: "id-marker", value: idSuffix });
		return tokens;
	}

	// Announcement: ! 2026-04-10 [downtime] "content"
	if (mainTrimmed.startsWith("! ")) {
		const match = mainTrimmed.match(/^(!)\s+(\d{4}-\d{2}-\d{2})(\s+\[\w+\])?\s+(".*")$/);
		if (match) {
			tokens.push({ type: "announcement", value: "! " });
			tokens.push({ type: "date", value: match[2]! });
			if (match[3]) {
				tokens.push({ type: "key", value: match[3] });
			}
			tokens.push({ type: "text", value: " " });
			tokens.push({ type: "string", value: match[4]! });
		} else {
			tokens.push({ type: "announcement", value: mainLine });
		}
		if (idSuffix) tokens.push({ type: "id-marker", value: idSuffix });
		return tokens;
	}

	// Task line: - [status] name | date -> date | #color
	if (mainTrimmed.startsWith("- [")) {
		const statusMatch = mainTrimmed.match(/^- \[(\S+)\]/);
		if (statusMatch) {
			tokens.push({ type: "text", value: "- " });
			tokens.push({ type: "status", value: `[${statusMatch[1]}]` });

			const rest = mainTrimmed.slice(statusMatch[0].length);
			const parts = rest.split("|");

			// Task name
			tokens.push({ type: "text", value: parts[0]! });

			// Date range
			if (parts[1]) {
				tokens.push({ type: "pipe", value: "|" });
				const datePart = parts[1]!;
				const dateMatch = datePart.match(/\s*(\d{4}-\d{2}-\d{2})\s*(->)\s*(\d{4}-\d{2}-\d{2})\s*/);
				if (dateMatch) {
					tokens.push({ type: "text", value: " " });
					tokens.push({ type: "date", value: dateMatch[1]! });
					tokens.push({ type: "arrow", value: " -> " });
					tokens.push({ type: "date", value: dateMatch[3]! });
					tokens.push({ type: "text", value: " " });
				} else {
					tokens.push({ type: "text", value: datePart });
				}
			}

			// Color
			if (parts[2]) {
				tokens.push({ type: "pipe", value: "|" });
				tokens.push({ type: "color", value: parts[2]! });
			}

			if (idSuffix) tokens.push({ type: "id-marker", value: idSuffix });
			return tokens;
		}
	}

	// Metadata lines: key: value
	if (mainIndent > 0 && mainTrimmed.includes(":")) {
		const colonIdx = mainTrimmed.indexOf(":");
		const key = mainTrimmed.slice(0, colonIdx);
		const value = mainTrimmed.slice(colonIdx + 1);

		tokens.push({ type: "key", value: `${key}:` });

		// Check for dates in value
		const dateMatch = value.match(/\s*(\d{4}-\d{2}-\d{2})\s*(->)\s*(\d{4}-\d{2}-\d{2})/);
		if (dateMatch) {
			tokens.push({ type: "text", value: " " });
			tokens.push({ type: "date", value: dateMatch[1]! });
			tokens.push({ type: "arrow", value: " -> " });
			tokens.push({ type: "date", value: dateMatch[3]! });
		} else if (value.trim().startsWith('"')) {
			tokens.push({ type: "string", value: value });
		} else {
			tokens.push({ type: "text", value: value });
		}

		if (idSuffix) tokens.push({ type: "id-marker", value: idSuffix });
		return tokens;
	}

	// Frontmatter key: value
	if (mainTrimmed.includes(":") && !mainTrimmed.startsWith("-")) {
		const colonIdx = mainTrimmed.indexOf(":");
		const key = mainTrimmed.slice(0, colonIdx);
		const value = mainTrimmed.slice(colonIdx + 1);
		tokens.push({ type: "key", value: `${key}:` });
		tokens.push({ type: "text", value: value });
		if (idSuffix) tokens.push({ type: "id-marker", value: idSuffix });
		return tokens;
	}

	tokens.push({ type: "text", value: mainLine });
	if (idSuffix) tokens.push({ type: "id-marker", value: idSuffix });
	return tokens;
}

const FORMAT_GUIDE = `# .timeline Format Reference

## Frontmatter
---
title: My Project
---

## Phases — time periods (sprints, stages)
~ 2026-01-01 "Sprint 1"
~ 2026-01-15 "Sprint 2"

## Milestones — vertical date markers
@ 2026-03-01 "Alpha Release"
@ 2026-05-15 "Beta Release"

## Announcements — notes pinned to dates
! 2026-04-10 "Scheduled downtime"
! 2026-04-10 [downtime] "DB migration"

## Sections — swim lanes / teams
## Backend Team

## Tasks
- [todo] Task name | 2026-01-15 -> 2026-02-01
- [in-progress] Auth | 2026-02-01 -> 2026-03-15 | #F5A623
- [done] API | 2026-01-15 -> 2026-02-01
  actual: 2026-01-15 -> 2026-01-28
- [blocked] Payments | 2026-03-01 -> 2026-04-15
  blocked-by: "Waiting on contract"

## Task metadata (indented under task)
  actual: 2026-01-15 -> 2026-01-28
  note: "Some context"
  depends: Task name
  blocked-by: "Reason"
  url: https://example.com

## Statuses
[todo] [in-progress] [done] [blocked] [cancelled]

## Colors — hex after second pipe
- [done] Task | 2026-01-01 -> 2026-02-01 | #6366F1

## Unplanned items — omit dates
- [todo] Future task
~ "Unscheduled phase"
@ "Unscheduled milestone"
`;

export function TimelineSource({ source, editable = false, onChange }: TimelineSourceProps) {
	const [copied, setCopied] = useState(false);
	const [showGuide, setShowGuide] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const gutterRef = useRef<HTMLDivElement>(null);

	const lines = useMemo(() => source.split("\n"), [source]);

	const handleCopy = async () => {
		// Strip ID comments for clean clipboard
		const clean = source.replace(/\s*<!--\s*\w+:[a-f0-9-]+\s*-->/g, "");
		await navigator.clipboard.writeText(clean);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};


	return (
		<div className="h-full flex flex-col bg-stone-50">
			{/* Header */}
			<div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-border-subtle bg-white">
				<div className="flex items-center gap-2 min-w-0">
					<span className="text-xs font-mono text-stone-400">.timeline</span>
					<span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
						editable ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-500"
					}`}>
						{editable ? "EDITING" : "FORMAT"}
					</span>
				</div>
				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={() => setShowGuide((g) => !g)}
						className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors ${
							showGuide ? "bg-stone-800 text-white" : "bg-stone-100 hover:bg-stone-200 text-stone-600"
						}`}
					>
						<HelpCircle size={12} />
						Guide
					</button>
					<button
						type="button"
						onClick={handleCopy}
						className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors"
					>
						{copied ? <Check size={12} /> : <Copy size={12} />}
						{copied ? "Copied" : "Copy"}
					</button>
				</div>
			</div>

			{/* Format guide */}
			{showGuide && (
				<div className="border-b border-border-subtle bg-white p-4 max-h-[50vh] overflow-y-auto">
					<div className="flex items-center justify-between mb-3">
						<h3 className="text-xs font-semibold text-stone-700">.timeline Format Guide</h3>
						<button type="button" onClick={() => setShowGuide(false)} className="p-1 rounded hover:bg-stone-100 text-stone-400">
							<X size={12} />
						</button>
					</div>
					<pre className="text-[11px] leading-5 font-mono text-stone-600 whitespace-pre-wrap">{FORMAT_GUIDE}</pre>
				</div>
			)}

			{/* Source code — editable or read-only */}
			<div className="flex-1 overflow-hidden relative">
				{editable ? (
					<div className="h-full flex">
						{/* Line number gutter */}
						<div
							ref={gutterRef}
							className="shrink-0 overflow-hidden bg-stone-50 border-r border-stone-200 select-none"
							style={{ paddingTop: 12 }}
							aria-hidden="true"
						>
							{lines.map((_, i) => (
								<div key={i} className="w-10 text-right pr-3 text-stone-400 text-[11px]" style={{ height: 24, lineHeight: "24px" }}>
									{i + 1}
								</div>
							))}
						</div>

						{/* Plain textarea — no overlay, just a clean monospace editor */}
						<textarea
							ref={textareaRef}
							value={source}
							onChange={(e) => onChange?.(e.target.value)}
							onScroll={() => {
								if (textareaRef.current && gutterRef.current) {
									gutterRef.current.scrollTop = textareaRef.current.scrollTop;
								}
							}}
							spellCheck={false}
							autoCapitalize="off"
							autoCorrect="off"
							className="flex-1 bg-white text-stone-800 caret-stone-800 selection:bg-blue-100 outline-none font-mono text-[13px] leading-6 resize-none"
							style={{
								padding: "12px 8px",
								border: "none",
								whiteSpace: "pre",
								overflow: "auto",
								tabSize: 4,
							}}
						/>
					</div>
				) : (
					<div className="h-full overflow-auto p-3 sm:p-4">
						<pre className="text-[13px] leading-6 font-mono">
							{lines.map((line, i) => {
								const tokens = tokenizeLine(line);
								return (
									<div key={i} className="flex">
										<span className="w-8 shrink-0 text-right pr-3 text-stone-300 select-none text-[11px] leading-6">
											{i + 1}
										</span>
										<span>
											{tokens.map((token, j) => (
												<span key={j} className={TOKEN_COLORS[token.type]}>
													{token.value}
												</span>
											))}
										</span>
									</div>
								);
							})}
						</pre>
					</div>
				)}
			</div>
		</div>
	);
}
