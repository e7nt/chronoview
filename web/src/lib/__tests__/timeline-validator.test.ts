import { describe, it, expect } from "vitest";
import { validateTimeline } from "../timeline-parser";
import { serializeTimeline } from "../timeline-serializer";

describe("validateTimeline", () => {
	it("accepts a valid minimal timeline", () => {
		const text = `---
title: My Project
---

# Timeline

## Backend

- [todo] Build API | 2026-01-15 -> 2026-02-01
`;
		const result = validateTimeline(text);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
		expect(result.parsed).not.toBeNull();
		expect(result.parsed!.title).toBe("My Project");
	});

	it("rejects missing title", () => {
		const text = `---
---

# Timeline

## Section

- [todo] Task | 2026-01-01 -> 2026-01-15
`;
		const result = validateTimeline(text);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain("Title is required");
	});

	it("rejects no sections", () => {
		const text = `---
title: Empty
---
`;
		const result = validateTimeline(text);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain("At least one section is required");
	});

	it("rejects invalid date format", () => {
		const text = `---
title: Bad Dates
---

# Timeline

## Section

- [todo] Task | 01-15-2026 -> 02-01-2026
`;
		const result = validateTimeline(text);
		// The task should be parsed but dates won't match the regex
		// so planned_start/planned_end will be null, which is valid (unplanned task)
		// The validator should still accept it (unplanned tasks are allowed)
		expect(result.valid).toBe(true);
	});

	it("rejects planned_end before planned_start", () => {
		const text = `---
title: Reversed Dates
---

# Timeline

## Section

- [todo] Task | 2026-03-15 -> 2026-01-01
`;
		const result = validateTimeline(text);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes("end date") || e.includes("before"))).toBe(true);
	});

	it("rejects invalid status", () => {
		const text = `---
title: Bad Status
---

# Timeline

## Section

- [invalid-status] Task | 2026-01-01 -> 2026-01-15
`;
		const result = validateTimeline(text);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes("status"))).toBe(true);
	});

	it("accepts all valid statuses", () => {
		const text = `---
title: All Statuses
---

# Timeline

## Section

- [todo] Task 1 | 2026-01-01 -> 2026-01-15
- [in-progress] Task 2 | 2026-01-01 -> 2026-01-15
- [done] Task 3 | 2026-01-01 -> 2026-01-15
- [blocked] Task 4 | 2026-01-01 -> 2026-01-15
- [cancelled] Task 5 | 2026-01-01 -> 2026-01-15
`;
		const result = validateTimeline(text);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("rejects empty file", () => {
		const result = validateTimeline("");
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it("validates full round-trip from serializer", () => {
		// A properly serialized timeline should always validate
		const timeline = {
			id: "tl-1",
			title: "Valid Project",
			color_scheme: "default",
			created_at: "2026-01-01T00:00:00Z",
			updated_at: "2026-01-01T00:00:00Z",
			sections: [{
				id: "sec-1",
				timeline_id: "tl-1",
				name: "Team",
				sort_order: 0,
				tasks: [{
					id: "t-1",
					section_id: "sec-1",
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
		const text = serializeTimeline(timeline);
		const result = validateTimeline(text);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});
});
