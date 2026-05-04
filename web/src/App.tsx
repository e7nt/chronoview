import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SignIn } from "@/components/auth/SignIn";
import { AuthProvider, useAuth } from "@/lib/auth";
import { localStore } from "@/lib/local-store";
import { Editor } from "@/pages/Editor";
import { Home } from "@/pages/Home";
import { Landing } from "@/pages/Landing";
import { Register } from "@/pages/Register";
import { TimelineView } from "@/pages/TimelineView";
import { Navigate, Route, Routes } from "react-router-dom";

/** Show Landing for new visitors, Editor for returning visitors */
function SmartHome() {
	const hasLocalTimelines = localStore.getTimelines().length > 0;
	if (hasLocalTimelines) {
		return <Editor />;
	}
	return <Landing />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
	const { isAuthenticated, isLoading } = useAuth();
	if (isLoading) return null;
	if (isAuthenticated) return <Navigate to="/app" replace />;
	return <>{children}</>;
}

export default function App() {
	return (
		<ErrorBoundary>
			<AuthProvider>
				<Routes>
					{/* Smart home: Landing for new visitors, Editor for returning */}
					<Route path="/" element={<SmartHome />} />

					{/* Local-first editor — no auth needed */}
					<Route path="/t/new" element={<Editor createNew />} />
					<Route path="/t/:localId" element={<Editor />} />

					{/* Auth */}
					<Route
						path="/login"
						element={
							<PublicRoute>
								<SignIn />
							</PublicRoute>
						}
					/>
					<Route
						path="/register"
						element={
							<PublicRoute>
								<Register />
							</PublicRoute>
						}
					/>

					{/* Server timelines — auth required */}
					<Route
						path="/app"
						element={
							<ProtectedRoute>
								<Home />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/timeline/:id"
						element={
							<ProtectedRoute>
								<TimelineView />
							</ProtectedRoute>
						}
					/>
				</Routes>
			</AuthProvider>
		</ErrorBoundary>
	);
}
