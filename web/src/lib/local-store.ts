/**
 * Local-first timeline storage using localStorage.
 * Data persists without any server calls or authentication.
 */

const PREFIX = "chronoview";
const INDEX_KEY = `${PREFIX}:timelines`;
const ACTIVE_KEY = `${PREFIX}:active`;

export interface LocalTimeline {
	id: string;
	title: string;
	updatedAt: string;
}

function generateId(): string {
	return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const STARTER_TEMPLATE = `---
title: My Project
---

# Phases
~ 2026-01-01 "Phase 1"
~ 2026-02-01 "Phase 2"

# Milestones
@ 2026-03-01 "Alpha Release"

# Timeline

## Getting Started

- [todo] First task | 2026-01-01 -> 2026-01-15
- [todo] Second task | 2026-01-10 -> 2026-01-25
- [in-progress] Third task | 2026-01-20 -> 2026-02-10
`;

function getIndex(): LocalTimeline[] {
	try {
		const raw = localStorage.getItem(INDEX_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch (e) {
		console.error("Failed to parse timeline index from localStorage", e);
		return [];
	}
}

function setIndex(timelines: LocalTimeline[]): void {
	localStorage.setItem(INDEX_KEY, JSON.stringify(timelines));
}

export const localStore = {
	getTimelines(): LocalTimeline[] {
		return getIndex();
	},

	getTimeline(id: string): { meta: LocalTimeline; content: string } | null {
		const index = getIndex();
		const meta = index.find((t) => t.id === id);
		if (!meta) return null;
		const content = localStorage.getItem(`${PREFIX}:timeline:${id}`) || "";
		return { meta, content };
	},

	saveTimeline(id: string, content: string): void {
		try {
			localStorage.setItem(`${PREFIX}:timeline:${id}`, content);
		} catch (e) {
			console.error("Failed to save timeline to localStorage — storage may be full", e);
			throw new Error("Storage is full. Try deleting unused timelines.");
		}

		// Extract title from content
		const titleMatch = content.match(/^title:\s*(.+)$/m);
		const title = titleMatch ? titleMatch[1]!.trim() : "Untitled";

		const index = getIndex();
		const existing = index.find((t) => t.id === id);
		if (existing) {
			existing.title = title;
			existing.updatedAt = new Date().toISOString();
		} else {
			index.unshift({ id, title, updatedAt: new Date().toISOString() });
		}
		setIndex(index);
	},

	createTimeline(title?: string, content?: string): LocalTimeline {
		const id = generateId();
		const text = content || STARTER_TEMPLATE.replace("My Project", title || "My Project");
		localStorage.setItem(`${PREFIX}:timeline:${id}`, text);

		const meta: LocalTimeline = {
			id,
			title: title || "My Project",
			updatedAt: new Date().toISOString(),
		};
		const index = getIndex();
		index.unshift(meta);
		setIndex(index);
		return meta;
	},

	deleteTimeline(id: string): void {
		localStorage.removeItem(`${PREFIX}:timeline:${id}`);
		const index = getIndex().filter((t) => t.id !== id);
		setIndex(index);

		// If active was deleted, clear it
		if (localStore.getActiveId() === id) {
			localStorage.removeItem(ACTIVE_KEY);
		}
	},

	getActiveId(): string | null {
		return localStorage.getItem(ACTIVE_KEY);
	},

	setActiveId(id: string): void {
		localStorage.setItem(ACTIVE_KEY, id);
	},

	/** Get or create the active timeline. Returns id + content. */
	getOrCreateActive(): { id: string; content: string } {
		const activeId = localStore.getActiveId();

		// Try loading active
		if (activeId) {
			const data = localStore.getTimeline(activeId);
			if (data) return { id: activeId, content: data.content };
		}

		// Try first available
		const all = localStore.getTimelines();
		if (all.length > 0) {
			const first = all[0]!;
			localStore.setActiveId(first.id);
			const data = localStore.getTimeline(first.id);
			if (data) return { id: first.id, content: data.content };
		}

		// Create starter
		const created = localStore.createTimeline();
		localStore.setActiveId(created.id);
		return {
			id: created.id,
			content: localStorage.getItem(`${PREFIX}:timeline:${created.id}`) || STARTER_TEMPLATE,
		};
	},
};
