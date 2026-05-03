import { describe, it, expect } from "vitest";
import { parseTimeline } from "../timeline-parser";
import { serializeTimeline } from "../timeline-serializer";
import type { Timeline } from "../types";

const SAMPLE_TIMELINE = `---
title: Test Project
---

# Phases
~ 2026-01-01 "Sprint 1"

# Milestones
@ 2026-03-01 "Alpha Release"

# Notes
! 2026-04-10 [downtime] "Scheduled downtime"
! 2026-04-15 "General update"

# Timeline

## Backend

- [done] API scaffolding | 2026-01-15 -> 2026-02-01 | #6366F1
  actual: 2026-01-15 -> 2026-01-28
  note: "Shipped early"
  url: https://example.com/task-1
- [in-progress] Auth service | 2026-02-01 -> 2026-03-15
- [blocked] Payments | 2026-03-01 -> 2026-04-15
  blocked-by: "Waiting on contract"
  depends: dep-1, dep-2

## Frontend

- [todo] Landing page | 2026-02-01 -> 2026-02-15
`;

describe("parseTimeline", () => {
	it("parses title from frontmatter", () => {
		const result = parseTimeline(SAMPLE_TIMELINE);
		expect(result.title).toBe("Test Project");
	});

	it("parses sections", () => {
		const result = parseTimeline(SAMPLE_TIMELINE);
		expect(result.sections).toHaveLength(2);
		expect(result.sections[0]!.name).toBe("Backend");
		expect(result.sections[1]!.name).toBe("Frontend");
	});

	it("parses tasks with all fields", () => {
		const result = parseTimeline(SAMPLE_TIMELINE);
		const backend = result.sections[0]!;
		expect(backend.tasks).toHaveLength(3);

		// First task — done with metadata
		const task1 = backend.tasks[0]!;
		expect(task1.name).toBe("API scaffolding");
		expect(task1.status).toBe("done");
		expect(task1.color).toBe("#6366F1");
		expect(task1.planned_start).toBe("2026-01-15");
		expect(task1.planned_end).toBe("2026-02-01");
		expect(task1.actual_start).toBe("2026-01-15");
		expect(task1.actual_end).toBe("2026-01-28");
		expect(task1.note).toBe("Shipped early");
		expect(task1.url).toBe("https://example.com/task-1");

		// Second task — in-progress, no metadata
		const task2 = backend.tasks[1]!;
		expect(task2.name).toBe("Auth service");
		expect(task2.status).toBe("in-progress");
		expect(task2.color).toBeNull();
		expect(task2.actual_start).toBeNull();
		expect(task2.note).toBeNull();

		// Third task — blocked with reason and depends
		const task3 = backend.tasks[2]!;
		expect(task3.status).toBe("blocked");
		expect(task3.blocked_reason).toBe("Waiting on contract");
		expect(task3.depends_on).toEqual(["dep-1", "dep-2"]);
	});

	it("parses milestones and phases", () => {
		const result = parseTimeline(SAMPLE_TIMELINE);
		expect(result.milestones).toHaveLength(2);

		const phase = result.milestones.find((m) => m.kind === "phase");
		expect(phase).toBeDefined();
		expect(phase!.label).toBe("Sprint 1");
		expect(phase!.date).toBe("2026-01-01");

		const milestone = result.milestones.find((m) => m.kind === "milestone");
		expect(milestone).toBeDefined();
		expect(milestone!.label).toBe("Alpha Release");
		expect(milestone!.date).toBe("2026-03-01");
	});

	it("parses announcements with types", () => {
		const result = parseTimeline(SAMPLE_TIMELINE);
		expect(result.announcements).toHaveLength(2);

		const downtime = result.announcements.find((a) => a.type === "downtime");
		expect(downtime).toBeDefined();
		expect(downtime!.content).toBe("Scheduled downtime");
		expect(downtime!.date).toBe("2026-04-10");

		const general = result.announcements.find((a) => a.type === "general");
		expect(general).toBeDefined();
		expect(general!.content).toBe("General update");
	});

	it("returns null IDs when no ID comments are present", () => {
		const result = parseTimeline(SAMPLE_TIMELINE);
		expect(result.sections[0]!.id).toBeNull();
		expect(result.sections[0]!.tasks[0]!.id).toBeNull();
		expect(result.milestones[0]!.id).toBeNull();
		expect(result.announcements[0]!.id).toBeNull();
	});

	it("preserves embedded IDs from comments", () => {
		const withIds = `---
title: Test
---

# Timeline

## Backend  <!-- section:abc-123 -->

- [todo] Task 1 | 2026-01-01 -> 2026-01-15  <!-- task:def-456 -->
`;
		const result = parseTimeline(withIds);
		expect(result.sections[0]!.id).toBe("abc-123");
		expect(result.sections[0]!.tasks[0]!.id).toBe("def-456");
	});

	it("handles mixed lines with and without IDs", () => {
		const mixed = `---
title: Mixed
---

# Timeline

## Section A  <!-- section:sec-1 -->

- [todo] Task with ID | 2026-01-01 -> 2026-01-15  <!-- task:t-1 -->
- [todo] Task without ID | 2026-01-16 -> 2026-01-30
`;
		const result = parseTimeline(mixed);
		expect(result.sections[0]!.id).toBe("sec-1");
		expect(result.sections[0]!.tasks[0]!.id).toBe("t-1");
		expect(result.sections[0]!.tasks[1]!.id).toBeNull();
	});

	it("skips malformed lines gracefully", () => {
		const malformed = `---
title: Test
---

this is garbage
!!! more garbage

# Timeline

## Backend

- [todo] Valid task | 2026-01-01 -> 2026-01-15
completely invalid line here
- [done] Another valid | 2026-02-01 -> 2026-02-15
`;
		const result = parseTimeline(malformed);
		expect(result.title).toBe("Test");
		expect(result.sections).toHaveLength(1);
		expect(result.sections[0]!.tasks).toHaveLength(2);
	});

	it("round-trips through serialize → parse", () => {
		const timeline: Timeline = {
			id: "tl-1",
			title: "Round Trip",
			color_scheme: "default",
			created_at: "2026-01-01T00:00:00Z",
			updated_at: "2026-01-01T00:00:00Z",
			sections: [{
				id: "sec-1",
				timeline_id: "tl-1",
				name: "Team A",
				sort_order: 0,
				tasks: [{
					id: "t-1",
					section_id: "sec-1",
					name: "Build API",
					status: "todo",
					color: "#3B82F6",
					planned_start: "2026-01-01",
					planned_end: "2026-01-15",
					actual_start: null,
					actual_end: null,
					blocked_reason: null,
					note: "First task",
					url: "https://jira.example.com/T-1",
					sort_order: 0,
					depends_on: [],
				}],
			}],
			milestones: [
				{ id: "m-1", timeline_id: "tl-1", date: "2026-02-01", label: "Launch", kind: "milestone", sort_order: 0 },
			],
			announcements: [],
		};

		const text = serializeTimeline(timeline);
		const parsed = parseTimeline(text);

		expect(parsed.title).toBe("Round Trip");
		expect(parsed.sections).toHaveLength(1);
		expect(parsed.sections[0]!.name).toBe("Team A");
		expect(parsed.sections[0]!.tasks[0]!.name).toBe("Build API");
		expect(parsed.sections[0]!.tasks[0]!.status).toBe("todo");
		expect(parsed.sections[0]!.tasks[0]!.planned_start).toBe("2026-01-01");
		expect(parsed.sections[0]!.tasks[0]!.planned_end).toBe("2026-01-15");
		expect(parsed.sections[0]!.tasks[0]!.note).toBe("First task");
		expect(parsed.sections[0]!.tasks[0]!.url).toBe("https://jira.example.com/T-1");
		expect(parsed.milestones).toHaveLength(1);
		expect(parsed.milestones[0]!.label).toBe("Launch");
	});

	it("round-trips with embedded IDs preserved", () => {
		const timeline: Timeline = {
			id: "tl-1",
			title: "ID Test",
			color_scheme: "default",
			created_at: "2026-01-01T00:00:00Z",
			updated_at: "2026-01-01T00:00:00Z",
			sections: [{
				id: "550e8400-e29b-41d4-a716-446655440000",
				timeline_id: "tl-1",
				name: "Section",
				sort_order: 0,
				tasks: [{
					id: "660e8400-e29b-41d4-a716-446655440000",
					section_id: "550e8400-e29b-41d4-a716-446655440000",
					name: "Task",
					status: "todo",
					color: null,
					planned_start: "2026-01-01",
					planned_end: "2026-01-15",
					actual_start: null,
					actual_end: null,
					blocked_reason: null,
					note: null,
					url: null,
					sort_order: 0,
					depends_on: [],
				}],
			}],
			milestones: [],
			announcements: [],
		};

		const text = serializeTimeline(timeline, { embedIds: true });
		const parsed = parseTimeline(text);

		expect(parsed.sections[0]!.id).toBe("550e8400-e29b-41d4-a716-446655440000");
		expect(parsed.sections[0]!.tasks[0]!.id).toBe("660e8400-e29b-41d4-a716-446655440000");
	});

	it("handles empty input", () => {
		const result = parseTimeline("");
		expect(result.title).toBe("");
		expect(result.sections).toHaveLength(0);
		expect(result.milestones).toHaveLength(0);
		expect(result.announcements).toHaveLength(0);
	});
});
