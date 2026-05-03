// Parsed structures (from .timeline text)
export interface TimelineTask {
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

export interface Section {
	id: string | null;
	name: string;
	sort_order: number;
	tasks: TimelineTask[];
}

export interface Milestone {
	id: string | null;
	date: string | null;
	label: string;
	kind: "milestone" | "phase";
	sort_order: number;
}

export interface Announcement {
	id: string | null;
	date: string | null;
	content: string;
	type: "note" | "downtime" | "general";
}

// The timeline as returned by the API
export interface Timeline {
	id: string;
	title: string;
	content: string;
	parsed: {
		title: string;
		sections: Section[];
		milestones: Milestone[];
		announcements: Announcement[];
	};
	color_scheme: string;
	user_role?: "owner" | "editor" | "viewer";
	created_at: string;
	updated_at: string;
}

export interface TimelineWithRole {
	id: string;
	owner_id: string;
	title: string;
	role: "owner" | "editor" | "viewer";
	created_at: string;
	updated_at: string;
}

export interface ShareLink {
	id: string;
	timeline_id: string;
	slug: string;
	is_public: boolean;
	expires_at: string | null;
	created_at: string;
}

export interface Collaborator {
	id: string;
	timeline_id: string;
	email: string;
	role: "viewer" | "editor";
	user_id: string | null;
	display_name: string | null;
	created_at: string;
}

export interface TimelineVersion {
	id: string;
	timeline_id: string;
	label: string | null;
	created_by: string;
	created_at: string;
}
