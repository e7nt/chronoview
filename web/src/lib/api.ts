import type { Collaborator, ShareLink, Timeline, TimelineVersion, TimelineWithRole } from "./types";

const runtimeConfig = (window as Record<string, unknown>).__APP_CONFIG__ as
	| { VITE_API_URL?: string }
	| undefined;
const API_BASE = runtimeConfig?.VITE_API_URL ? `${runtimeConfig.VITE_API_URL}/api` : "/api";

async function getAuthHeaders(): Promise<Record<string, string>> {
	const headers: Record<string, string> = { "Content-Type": "application/json" };
	const token = localStorage.getItem("token");
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}
	return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
	const headers = await getAuthHeaders();
	const res = await fetch(`${API_BASE}${path}`, {
		headers,
		...options,
	});
	if (!res.ok) {
		const error = await res.json().catch(() => ({ detail: res.statusText }));
		throw new Error(error.detail || "Request failed");
	}
	if (res.status === 204) return undefined as T;
	return res.json();
}

export const api = {
	// Timelines
	listTimelines: () => request<TimelineWithRole[]>("/timelines"),
	createTimeline: (data: { title: string; content?: string }) =>
		request<TimelineWithRole>("/timelines", { method: "POST", body: JSON.stringify(data) }),
	getTimeline: (id: string) => request<Timeline>(`/timelines/${id}`),
	updateTimeline: (id: string, data: { title?: string; content?: string }) =>
		request<Timeline>(`/timelines/${id}`, { method: "PUT", body: JSON.stringify(data) }),
	deleteTimeline: (id: string) => request<void>(`/timelines/${id}`, { method: "DELETE" }),

	// Sharing
	createShareLink: (timelineId: string, data: { is_public?: boolean; passcode?: string }) =>
		request<ShareLink>(`/timelines/${timelineId}/share`, {
			method: "POST",
			body: JSON.stringify(data),
		}),
	getSharedTimeline: (slug: string) => request<Timeline>(`/s/${slug}`),
	verifyPasscode: (slug: string, passcode: string) =>
		request<Timeline>(`/s/${slug}/verify`, { method: "POST", body: JSON.stringify({ passcode }) }),

	// Collaborators
	listCollaborators: (timelineId: string) =>
		request<Collaborator[]>(`/timelines/${timelineId}/collaborators`),
	inviteCollaborator: (timelineId: string, data: { email: string; role: string }) =>
		request<Collaborator>(`/timelines/${timelineId}/collaborators`, {
			method: "POST",
			body: JSON.stringify(data),
		}),
	updateCollaborator: (timelineId: string, collabId: string, data: { role: string }) =>
		request<Collaborator>(`/timelines/${timelineId}/collaborators/${collabId}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	removeCollaborator: (timelineId: string, collabId: string) =>
		request<void>(`/timelines/${timelineId}/collaborators/${collabId}`, { method: "DELETE" }),

	// Versions
	listVersions: (timelineId: string) =>
		request<TimelineVersion[]>(`/timelines/${timelineId}/versions`),
	createVersion: (timelineId: string, data: { content: string; label?: string }) =>
		request<TimelineVersion>(`/timelines/${timelineId}/versions`, {
			method: "POST",
			body: JSON.stringify(data),
		}),
	getVersion: (timelineId: string, versionId: string) =>
		request<TimelineVersion & { content: string }>(
			`/timelines/${timelineId}/versions/${versionId}`,
		),
};
