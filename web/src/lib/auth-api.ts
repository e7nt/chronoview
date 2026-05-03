const API_BASE = "/api/auth";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
	const headers: Record<string, string> = { "Content-Type": "application/json" };
	const token = localStorage.getItem("token");
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	const res = await fetch(`${API_BASE}${path}`, { headers, ...options });
	if (!res.ok) {
		const error = await res.json().catch(() => ({ detail: res.statusText }));
		throw new Error(error.detail || "Request failed");
	}
	return res.json();
}

export interface AuthUser {
	id: string;
	email: string | null;
	display_name: string | null;
	avatar_url: string | null;
	auth_provider: string;
}

interface TokenResponse {
	access_token: string;
	token_type: string;
}

export const authApi = {
	register: async (email: string, password: string, displayName: string): Promise<TokenResponse> =>
		request("/register", {
			method: "POST",
			body: JSON.stringify({ email, password, display_name: displayName }),
		}),

	login: async (email: string, password: string): Promise<TokenResponse> =>
		request("/login", {
			method: "POST",
			body: JSON.stringify({ email, password }),
		}),

	googleAuth: async (credential: string): Promise<TokenResponse> =>
		request("/google", {
			method: "POST",
			body: JSON.stringify({ credential }),
		}),

	getMe: async (): Promise<AuthUser> => request("/me"),
};
