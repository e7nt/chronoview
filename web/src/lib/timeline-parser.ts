/**
 * Parser for the .timeline format.
 * Inverse of timeline-serializer.ts.
 * Converts .timeline text → ParsedTimeline object.
 */

export interface ParsedTask {
	id: string | null;
	name: string;
	status: string;
	color: string | null;
	planned_start: string | null;
	planned_end: string | null;
	actual_start: string | null;
	actual_end: string | null;
	blocked_reason: string | null;
	note: string | null;
	url: string | null;
	sort_order: number;
	depends_on: string[];
}

export interface ParsedSection {
	id: string | null;
	name: string;
	sort_order: number;
	tasks: ParsedTask[];
}

export interface ParsedMilestone {
	id: string | null;
	date: string | null;
	label: string;
	kind: "milestone" | "phase";
	sort_order: number;
}

export interface ParsedAnnouncement {
	id: string | null;
	date: string | null;
	content: string;
	type: "note" | "downtime" | "general";
}

export interface ParsedTimeline {
	title: string;
	sections: ParsedSection[];
	milestones: ParsedMilestone[];
	announcements: ParsedAnnouncement[];
}

// Extract embedded ID comment: <!-- type:uuid -->
const ID_RE = /\s*<!--\s*(\w+):([\w-]+)\s*-->$/;

function extractId(line: string): { clean: string; id: string | null } {
	const match = line.match(ID_RE);
	if (match) {
		return { clean: line.slice(0, match.index!).trimEnd(), id: match[2]! };
	}
	return { clean: line, id: null };
}

// Extract quoted string: "content here"
function extractQuoted(s: string): string {
	const match = s.match(/"([^"]*)"/);
	return match ? match[1]! : s.trim();
}

const DATE_RE = /\d{4}-\d{2}-\d{2}/;
const TASK_RE = /^- \[([^\]]+)\]\s+(.+)/;
const DATE_RANGE_RE = /(\d{4}-\d{2}-\d{2})\s*->\s*(\d{4}-\d{2}-\d{2})/;
const COLOR_RE = /#[0-9A-Fa-f]{6}\b/;

export function parseTimeline(text: string): ParsedTimeline {
	const lines = text.split("\n");

	const result: ParsedTimeline = {
		title: "",
		sections: [],
		milestones: [],
		announcements: [],
	};

	let inFrontmatter = false;
	let context: "none" | "phases" | "milestones" | "notes" | "timeline" = "none";
	let currentSection: ParsedSection | null = null;
	let currentTask: ParsedTask | null = null;
	let milestoneOrder = 0;
	let sectionOrder = 0;
	let taskOrder = 0;

	for (const rawLine of lines) {
		const trimmed = rawLine.trim();

		// Skip empty lines
		if (trimmed === "") {
			currentTask = null;
			continue;
		}

		// Frontmatter
		if (trimmed === "---") {
			inFrontmatter = !inFrontmatter;
			continue;
		}

		if (inFrontmatter) {
			const colonIdx = trimmed.indexOf(":");
			if (colonIdx !== -1) {
				const key = trimmed.slice(0, colonIdx).trim();
				const value = trimmed.slice(colonIdx + 1).trim();
				if (key === "title") {
					result.title = value;
				}
			}
			continue;
		}

		// Headings
		if (trimmed.startsWith("# ") && !trimmed.startsWith("## ")) {
			const heading = trimmed.slice(2).trim().toLowerCase();
			if (heading === "phases") context = "phases";
			else if (heading === "milestones") context = "milestones";
			else if (heading === "notes") context = "notes";
			else if (heading === "timeline") context = "timeline";
			continue;
		}

		// Section header
		if (trimmed.startsWith("## ")) {
			const { clean, id } = extractId(trimmed);
			const name = clean.slice(3).trim();
			currentSection = {
				id,
				name,
				sort_order: sectionOrder++,
				tasks: [],
			};
			result.sections.push(currentSection);
			currentTask = null;
			taskOrder = 0;
			context = "timeline";
			continue;
		}

		// Phase line: ~ DATE "label"
		if (trimmed.startsWith("~ ")) {
			const { clean, id } = extractId(trimmed);
			const rest = clean.slice(2).trim();
			const dateMatch = rest.match(DATE_RE);
			const label = extractQuoted(rest);
			result.milestones.push({
				id,
				date: dateMatch ? dateMatch[0] : null,
				label,
				kind: "phase",
				sort_order: milestoneOrder++,
			});
			continue;
		}

		// Milestone line: @ DATE "label"
		if (trimmed.startsWith("@ ")) {
			const { clean, id } = extractId(trimmed);
			const rest = clean.slice(2).trim();
			const dateMatch = rest.match(DATE_RE);
			const label = extractQuoted(rest);
			result.milestones.push({
				id,
				date: dateMatch ? dateMatch[0] : null,
				label,
				kind: "milestone",
				sort_order: milestoneOrder++,
			});
			continue;
		}

		// Announcement line: ! DATE [type] "content"
		if (trimmed.startsWith("! ")) {
			const { clean, id } = extractId(trimmed);
			const rest = clean.slice(2).trim();
			const dateMatch = rest.match(DATE_RE);
			const typeMatch = rest.match(/\[(\w+)\]/);
			const content = extractQuoted(rest);
			let type: "note" | "downtime" | "general" = "general";
			if (typeMatch) {
				const t = typeMatch[1]!.toLowerCase();
				if (t === "note" || t === "downtime") type = t;
			}
			result.announcements.push({
				id,
				date: dateMatch ? dateMatch[0] : null,
				content,
				type,
			});
			continue;
		}

		// Task line: - [status] name | start -> end | color
		const taskMatch = trimmed.match(TASK_RE);
		if (taskMatch && currentSection) {
			const { clean, id } = extractId(trimmed);
			const fullTaskMatch = clean.match(TASK_RE);
			if (!fullTaskMatch) continue;

			const status = fullTaskMatch[1]!;
			const restOfLine = fullTaskMatch[2]!;

			// Split by pipes
			const parts = restOfLine.split("|").map((p) => p.trim());
			const name = parts[0]!;

			let planned_start: string | null = null;
			let planned_end: string | null = null;
			let color: string | null = null;

			for (let i = 1; i < parts.length; i++) {
				const part = parts[i]!;
				const rangeMatch = part.match(DATE_RANGE_RE);
				if (rangeMatch) {
					planned_start = rangeMatch[1]!;
					planned_end = rangeMatch[2]!;
				} else {
					const colorMatch = part.match(COLOR_RE);
					if (colorMatch) {
						color = colorMatch[0];
					}
				}
			}

			currentTask = {
				id,
				name,
				status,
				color,
				planned_start,
				planned_end,
				actual_start: null,
				actual_end: null,
				blocked_reason: null,
				note: null,
				url: null,
				sort_order: taskOrder++,
				depends_on: [],
			};
			currentSection.tasks.push(currentTask);
			continue;
		}

		// Metadata lines (indented, belong to current task)
		if (rawLine.startsWith("  ") && currentTask) {
			const metaLine = trimmed;
			const colonIdx = metaLine.indexOf(":");
			if (colonIdx === -1) continue;

			const key = metaLine.slice(0, colonIdx).trim();
			const value = metaLine.slice(colonIdx + 1).trim();

			switch (key) {
				case "actual": {
					const rangeMatch = value.match(DATE_RANGE_RE);
					if (rangeMatch) {
						currentTask.actual_start = rangeMatch[1]!;
						currentTask.actual_end = rangeMatch[2]!;
					}
					break;
				}
				case "actual-start": {
					const dateMatch = value.match(DATE_RE);
					if (dateMatch) currentTask.actual_start = dateMatch[0];
					break;
				}
				case "actual-end": {
					const dateMatch = value.match(DATE_RE);
					if (dateMatch) currentTask.actual_end = dateMatch[0];
					break;
				}
				case "blocked-by":
					currentTask.blocked_reason = extractQuoted(value);
					break;
				case "note":
					currentTask.note = extractQuoted(value);
					break;
				case "url":
					currentTask.url = value;
					break;
				case "depends":
					currentTask.depends_on = value.split(",").map((d) => d.trim()).filter(Boolean);
					break;
			}
			continue;
		}
	}

	return result;
}

// --- Validation ---

const VALID_STATUSES = new Set(["todo", "in-progress", "done", "blocked", "cancelled"]);

interface ValidationResult {
	valid: boolean;
	errors: string[];
	parsed: ParsedTimeline | null;
}

export function validateTimeline(text: string): ValidationResult {
	const errors: string[] = [];
	const parsed = parseTimeline(text);

	if (!parsed.title || !parsed.title.trim()) {
		errors.push("Title is required");
	}

	if (parsed.sections.length === 0) {
		errors.push("At least one section is required");
	}

	for (const section of parsed.sections) {
		for (const task of section.tasks) {
			if (!VALID_STATUSES.has(task.status)) {
				errors.push(`Task "${task.name}": invalid status "${task.status}" (must be one of: ${[...VALID_STATUSES].join(", ")})`);
			}

			if (task.planned_start && task.planned_end) {
				if (task.planned_end < task.planned_start) {
					errors.push(`Task "${task.name}": end date (${task.planned_end}) is before start date (${task.planned_start})`);
				}
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		parsed: errors.length === 0 ? parsed : null,
	};
}
