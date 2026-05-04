import type { Announcement, Milestone, Section, Timeline, TimelineTask } from "./types";

const STATUS_MAP: Record<string, string> = {
	todo: "todo",
	"in-progress": "in-progress",
	done: "done",
	blocked: "blocked",
	cancelled: "cancelled",
};

interface SerializeOptions {
	embedIds?: boolean;
}

function idComment(type: string, id: string | undefined | null): string {
	return id ? `  <!-- ${type}:${id} -->` : "";
}

export function serializeTimeline(timeline: Timeline, options?: SerializeOptions): string {
	const lines: string[] = [];
	const ids = options?.embedIds ?? false;

	// Frontmatter
	lines.push("---");
	lines.push(`title: ${timeline.title}`);
	lines.push("---");
	lines.push("");

	// Phases
	const allMilestones = timeline.milestones ?? [];
	const phases = allMilestones.filter((m) => m.kind === "phase");
	if (phases.length > 0) {
		lines.push("# Phases");
		for (const p of phases) {
			lines.push(`~ ${p.date || "TBD"} "${p.label}"${ids ? idComment("milestone", p.id) : ""}`);
		}
		lines.push("");
	}

	// Milestones
	const milestones = allMilestones.filter((m) => m.kind !== "phase");
	if (milestones.length > 0) {
		lines.push("# Milestones");
		for (const m of milestones) {
			lines.push(`@ ${m.date || "TBD"} "${m.label}"${ids ? idComment("milestone", m.id) : ""}`);
		}
		lines.push("");
	}

	// Announcements
	const allAnnouncements = timeline.announcements ?? [];
	if (allAnnouncements.length > 0) {
		lines.push("# Notes");
		for (const a of allAnnouncements) {
			const typeTag = a.type !== "general" ? ` [${a.type}]` : "";
			lines.push(`! ${a.date}${typeTag} "${a.content}"${ids ? idComment("ann", a.id) : ""}`);
		}
		lines.push("");
	}

	// Sections & Tasks
	lines.push("# Timeline");
	lines.push("");

	const allSections = timeline.sections ?? [];
	for (const section of allSections) {
		lines.push(`## ${section.name}${ids ? idComment("section", section.id) : ""}`);
		lines.push("");

		for (const task of section.tasks) {
			const status = STATUS_MAP[task.status] || "todo";
			let line = `- [${status}] ${task.name}`;
			if (task.planned_start && task.planned_end) {
				line += ` | ${task.planned_start} -> ${task.planned_end}`;
				if (task.color) {
					line += ` | ${task.color}`;
				}
			}
			if (ids) {
				line += idComment("task", task.id);
			}
			lines.push(line);

			// Metadata lines (indented)
			if (task.actual_start && task.actual_end) {
				lines.push(`  actual: ${task.actual_start} -> ${task.actual_end}`);
			} else if (task.actual_start) {
				lines.push(`  actual-start: ${task.actual_start}`);
			}

			if (task.blocked_reason) {
				lines.push(`  blocked-by: "${task.blocked_reason}"`);
			}

			if (task.note) {
				lines.push(`  note: "${task.note}"`);
			}

			if (task.url) {
				lines.push(`  url: ${task.url}`);
			}

			if (task.depends_on.length > 0) {
				lines.push(`  depends: ${task.depends_on.join(", ")}`);
			}
		}

		lines.push("");
	}

	return lines.join("\n");
}
