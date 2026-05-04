import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export function Register() {
	const { register } = useAuth();
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			await register(email, password, name);
			navigate("/app");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Registration failed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ type: "spring", stiffness: 300, damping: 30 }}
				className="w-full max-w-sm"
			>
				<div className="flex items-center justify-center gap-2.5 mb-6">
					<svg width={36} height={36} viewBox="0 0 32 32">
						<rect width="32" height="32" rx="7" fill="#1C1C1E" />
						<rect x="5" y="8" width="14" height="4" rx="2" fill="#6366F1" opacity="0.9" />
						<rect x="9" y="14" width="18" height="4" rx="2" fill="#0EA5E9" opacity="0.9" />
						<rect x="7" y="20" width="12" height="4" rx="2" fill="#A855F7" opacity="0.9" />
					</svg>
					<h1 className="text-xl font-bold text-stone-900 tracking-tight">Chronoview</h1>
				</div>

				<p className="text-stone-500 text-sm mb-6 text-center">Create your account</p>

				<form
					onSubmit={handleSubmit}
					className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm space-y-4"
				>
					{error && (
						<div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
							{error}
						</div>
					)}

					<div>
						<label className="block text-[10px] font-semibold uppercase tracking-widest text-stone-500 mb-1.5">
							Name
						</label>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
							placeholder="Your name"
						/>
					</div>

					<div>
						<label className="block text-[10px] font-semibold uppercase tracking-widest text-stone-500 mb-1.5">
							Email
						</label>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
							placeholder="you@example.com"
						/>
					</div>

					<div>
						<label className="block text-[10px] font-semibold uppercase tracking-widest text-stone-500 mb-1.5">
							Password
						</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength={6}
							className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
							placeholder="At least 6 characters"
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full py-2.5 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 disabled:opacity-40 transition-colors"
					>
						{loading ? "Creating account..." : "Create account"}
					</button>
				</form>

				<p className="text-center text-xs text-stone-400 mt-4">
					Already have an account?{" "}
					<Link to="/login" className="text-stone-700 hover:underline font-medium">
						Sign in
					</Link>
				</p>
			</motion.div>
		</div>
	);
}
