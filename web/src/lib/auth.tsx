import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi, type AuthUser } from "./auth-api";

interface AuthContextType {
	user: AuthUser | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	error: string | null;
	login: (email: string, password: string) => Promise<void>;
	register: (email: string, password: string, displayName: string) => Promise<void>;
	googleLogin: (credential: string) => Promise<void>;
	logout: () => void;
	clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// On mount: restore session from localStorage token
	useEffect(() => {
		const token = localStorage.getItem("token");
		if (token) {
			authApi
				.getMe()
				.then(setUser)
				.catch((err) => {
					console.warn("Session restore failed:", err.message);
					localStorage.removeItem("token");
				})
				.finally(() => setIsLoading(false));
		} else {
			setIsLoading(false);
		}
	}, []);

	const login = async (email: string, password: string) => {
		setError(null);
		try {
			const { access_token } = await authApi.login(email, password);
			localStorage.setItem("token", access_token);
			const me = await authApi.getMe();
			setUser(me);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Login failed";
			setError(msg);
			throw err;
		}
	};

	const register = async (email: string, password: string, displayName: string) => {
		setError(null);
		try {
			const { access_token } = await authApi.register(email, password, displayName);
			localStorage.setItem("token", access_token);
			const me = await authApi.getMe();
			setUser(me);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Registration failed";
			setError(msg);
			throw err;
		}
	};

	const googleLogin = async (credential: string) => {
		setError(null);
		try {
			const { access_token } = await authApi.googleAuth(credential);
			localStorage.setItem("token", access_token);
			const me = await authApi.getMe();
			setUser(me);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Google sign-in failed";
			setError(msg);
			throw err;
		}
	};

	const logout = () => {
		localStorage.removeItem("token");
		setUser(null);
		setError(null);
	};

	const clearError = () => setError(null);

	return (
		<AuthContext.Provider
			value={{
				user,
				isLoading,
				isAuthenticated: !!user,
				error,
				login,
				register,
				googleLogin,
				logout,
				clearError,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
