import { describe, it, expect } from "vitest";
import { serializeTimeline } from "../timeline-serializer";
import type { Timeline } from "../types";

const MINIMAL_TIMELINE: Timeline = {
	id: "tl-1",
	title: "Test Project",
	color_scheme: "default",
	created_at: "2026-01-01T00:00:00Z",
	updated_at: "2026-01-01T00:00:00Z",
	sections: [
		{
			id: "sec-1",
			timeline_id: "tl-1",
			name: "Backend",
			sort_order: 0,
			tasks: [
				{
					id: "task-1",
					section_id: "sec-1",
					name: "API scaffolding",
					status: "done",
					color: "#6366F1",
					planned_start: "2026-01-15",
					planned_end: "2026-02-01",
					actual_start: "2026-01-15",
					actual_end: "2026-01-28",
					blocked_reason: null,
					note: "Shipped early",
					url: "https://example.com/task-1",
					sort_order: 0,
					depends_on: [],
				},
				{
					id: "task-2",
					section_id: "sec-1",
					name: "Auth service",
					status: "in-progress",
					color: null,
					planned_start: "2026-02-01",
					planned_end: "2026-03-15",
					actual_start: null,
					actual_end: null,
					blocked_reason: null,
					note: null,
					url: null,
					sort_order: 1,
					depends_on: [],
				},
			],
		},
	],
	milestones: [
		{ id: "ms-1", timeline_id: "tl-1", date: "2026-03-01", label: "Alpha Release", kind: "milestone", sort_order: 0 },
		{ id: "ph-1", timeline_id: "tl-1", date: "2026-01-01", label: "Sprint 1", kind: "phase", sort_order: 1 },
	],
	announcements: [
		{ id: "ann-1", timeline_id: "tl-1", date: "2026-04-10", content: "Scheduled downtime", type: "downtime" },
		{ id: "ann-2", timeline_id: "tl-1", date: "2026-04-15", content: "General update", type: "general" },
	],
};

describe("serializeTimeline", () => {
	it("serializes a minimal timeline correctly", () => {
		const text = serializeTimeline(MINIMAL_TIMELINE);

		expect(text).toContain("---");
		expect(text).toContain("title: Test Project");
		expect(text).toContain("# Phases");
		expect(text).toContain('~ 2026-01-01 "Sprint 1"');
		expect(text).toContain("# Milestones");
		expect(text).toContain('@ 2026-03-01 "Alpha Release"');
		expect(text).toContain("# Notes");
		expect(text).toContain('! 2026-04-10 [downtime] "Scheduled downtime"');
		expect(text).toContain('! 2026-04-15 "General update"');
		expect(text).toContain("# Timeline");
		expect(text).toContain("## Backend");
		expect(text).toContain("- [done] API scaffolding | 2026-01-15 -> 2026-02-01 | #6366F1");
		expect(text).toContain("  actual: 2026-01-15 -> 2026-01-28");
		expect(text).toContain('  note: "Shipped early"');
		expect(text).toContain("  url: https://example.com/task-1");
		expect(text).toContain("- [in-progress] Auth service | 2026-02-01 -> 2026-03-15");
	});

	it("does not include IDs by default", () => {
		const text = serializeTimeline(MINIMAL_TIMELINE);
		expect(text).not.toContain("<!--");
		expect(text).not.toContain("-->");
	});

	it("embeds IDs when embedIds is true", () => {
		const text = serializeTimeline(MINIMAL_TIMELINE, { embedIds: true });

		expect(text).toContain("<!-- section:sec-1 -->");
		expect(text).toContain("<!-- task:task-1 -->");
		expect(text).toContain("<!-- task:task-2 -->");
		expect(text).toContain("<!-- milestone:ms-1 -->");
		expect(text).toContain("<!-- milestone:ph-1 -->");
		expect(text).toContain("<!-- ann:ann-1 -->");
		expect(text).toContain("<!-- ann:ann-2 -->");
	});

	it("separates phases and milestones into different sections", () => {
		const text = serializeTimeline(MINIMAL_TIMELINE);
		const phaseIdx = text.indexOf("# Phases");
		const milestoneIdx = text.indexOf("# Milestones");

		expect(phaseIdx).toBeGreaterThan(-1);
		expect(milestoneIdx).toBeGreaterThan(phaseIdx);
		// Sprint 1 should be under Phases (tilde prefix)
		expect(text).toContain('~ 2026-01-01 "Sprint 1"');
		// Alpha Release should be under Milestones (at prefix)
		expect(text).toContain('@ 2026-03-01 "Alpha Release"');
	});

	it("serializes announcement types correctly", () => {
		const text = serializeTimeline(MINIMAL_TIMELINE);
		// Downtime gets [downtime] tag
		expect(text).toContain('[downtime] "Scheduled downtime"');
		// General gets no tag
		expect(text).toMatch(/! 2026-04-15 "General update"/);
	});

	it("serializes all task metadata", () => {
		const timelineWithFullTask: Timeline = {
			...MINIMAL_TIMELINE,
			sections: [{
				...MINIMAL_TIMELINE.sections[0]!,
				tasks: [{
					id: "t-full",
					section_id: "sec-1",
					name: "Full task",
					status: "blocked",
					color: "#EF4444",
					planned_start: "2026-05-01",
					planned_end: "2026-05-15",
					actual_start: "2026-05-02",
					actual_end: "2026-05-20",
					blocked_reason: "Waiting on contract",
					note: "Important task",
					url: "https://jira.example.com/T-123",
					sort_order: 0,
					depends_on: ["dep-1", "dep-2"],
				}],
			}],
			milestones: [],
			announcements: [],
		};

		const text = serializeTimeline(timelineWithFullTask);
		expect(text).toContain("- [blocked] Full task | 2026-05-01 -> 2026-05-15 | #EF4444");
		expect(text).toContain("  actual: 2026-05-02 -> 2026-05-20");
		expect(text).toContain('  blocked-by: "Waiting on contract"');
		expect(text).toContain('  note: "Important task"');
		expect(text).toContain("  url: https://jira.example.com/T-123");
		expect(text).toContain("  depends: dep-1, dep-2");
	});
});
