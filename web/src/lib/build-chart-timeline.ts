/**
 * Builds a chart-compatible timeline object from parsed .timeline data.
 * Shared between Editor.tsx (local) and TimelineView.tsx (server).
 * Assigns stable synthetic IDs so React keys don't collide.
 */

import type { ParsedTimeline } from "./timeline-parser";

export interface ChartTimeline {
	id: string;
	title: string;
	color_scheme: string;
	created_at: string;
	updated_at: string;
	user_role?: string;
	sections: ChartSection[];
	milestones: ChartMilestone[];
	announcements: ChartAnnouncement[];
}

export interface ChartSection {
	id: string;
	timeline_id: string;
	name: string;
	sort_order: number;
	tasks: ChartTask[];
}

export interface ChartTask {
	id: string;
	section_id: string;
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

export interface ChartMilestone {
	id: string;
	timeline_id: string;
	date: string | null;
	label: string;
	kind: string;
	sort_order: number;
}

export interface ChartAnnouncement {
	id: string;
	timeline_id: string;
	date: string | null;
	content: string;
	type: string;
}

interface TimelineMetadata {
	id: string;
	title?: string;
	color_scheme?: string;
	created_at?: string;
	updated_at?: string;
	user_role?: string;
}

export function buildChartTimeline(parsed: ParsedTimeline, meta: TimelineMetadata): ChartTimeline {
	const now = new Date().toISOString();

	return {
		id: meta.id,
		title: parsed.title || meta.title || "Untitled",
		color_scheme: meta.color_scheme || "default",
		created_at: meta.created_at || now,
		updated_at: meta.updated_at || now,
		user_role: meta.user_role,
		sections: parsed.sections.map((s, si) => {
			const sectionId = s.id || `sec-${si}`;
			return {
				id: sectionId,
				timeline_id: meta.id,
				name: s.name,
				sort_order: s.sort_order,
				tasks: s.tasks.map((t, ti) => ({
					id: t.id || `task-${si}-${ti}`,
					section_id: sectionId,
					name: t.name,
					status: t.status,
					color: t.color,
					planned_start: t.planned_start,
					planned_end: t.planned_end,
					actual_start: t.actual_start,
					actual_end: t.actual_end,
					blocked_reason: t.blocked_reason,
					note: t.note,
					url: t.url,
					sort_order: t.sort_order,
					depends_on: t.depends_on ?? [],
				})),
			};
		}),
		milestones: parsed.milestones.map((m, i) => ({
			id: m.id || `ms-${i}`,
			timeline_id: meta.id,
			date: m.date,
			label: m.label,
			kind: m.kind,
			sort_order: m.sort_order,
		})),
		announcements: parsed.announcements.map((a, i) => ({
			id: a.id || `ann-${i}`,
			timeline_id: meta.id,
			date: a.date,
			content: a.content,
			type: a.type,
		})),
	};
}
