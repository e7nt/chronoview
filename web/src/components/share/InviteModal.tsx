import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, UserPlus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Collaborator } from "@/lib/types";

interface InviteModalProps {
	timelineId: string;
	onClose: () => void;
}

export function InviteModal({ timelineId, onClose }: InviteModalProps) {
	const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<"viewer" | "editor">("viewer");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const loadCollaborators = useCallback(async () => {
		try {
			const data = await api.listCollaborators(timelineId);
			setCollaborators(data);
		} catch {
			// ignore
		}
	}, [timelineId]);

	useEffect(() => {
		loadCollaborators();
	}, [loadCollaborators]);

	const handleInvite = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email.trim()) return;
		setError("");
		setLoading(true);
		try {
			await api.inviteCollaborator(timelineId, { email: email.trim(), role });
			setEmail("");
			await loadCollaborators();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to invite");
		} finally {
			setLoading(false);
		}
	};

	const handleRemove = async (collabId: string) => {
		try {
			await api.removeCollaborator(timelineId, collabId);
			await loadCollaborators();
		} catch {
			// ignore
		}
	};

	const handleRoleChange = async (collabId: string, newRole: string) => {
		try {
			await api.updateCollaborator(timelineId, collabId, { role: newRole });
			await loadCollaborators();
		} catch {
			// ignore
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
			<div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
			<motion.div
				initial={{ opacity: 0, scale: 0.95, y: 8 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				transition={{ type: "spring", stiffness: 400, damping: 30 }}
				className="relative bg-white rounded-t-xl sm:rounded-xl shadow-2xl border border-stone-200 w-full sm:max-w-md sm:mx-4 max-h-[80vh] overflow-y-auto"
			>
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
					<h2 className="text-sm font-semibold text-stone-800">Invite People</h2>
					<button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-stone-100 text-stone-400">
						<X size={14} />
					</button>
				</div>

				<div className="p-5 space-y-4">
					{/* Invite form */}
					<form onSubmit={handleInvite} className="flex gap-2">
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="Email address"
							required
							className="flex-1 px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
						/>
						<select
							value={role}
							onChange={(e) => setRole(e.target.value as "viewer" | "editor")}
							className="px-2 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-300"
						>
							<option value="viewer">Viewer</option>
							<option value="editor">Editor</option>
						</select>
						<button
							type="submit"
							disabled={loading}
							className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 disabled:opacity-40 transition-colors"
						>
							<UserPlus size={12} />
							Invite
						</button>
					</form>

					{error && (
						<p className="text-xs text-red-500">{error}</p>
					)}

					{/* Collaborator list */}
					{collaborators.length > 0 && (
						<div className="space-y-2">
							<p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
								Collaborators ({collaborators.length})
							</p>
							{collaborators.map((c) => (
								<div key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-stone-50">
									<div className="flex-1 min-w-0">
										<p className="text-xs font-medium text-stone-700 truncate">{c.email}</p>
										{c.display_name && (
											<p className="text-[10px] text-stone-400">{c.display_name}</p>
										)}
										{!c.user_id && (
											<p className="text-[10px] text-amber-500 italic">Pending registration</p>
										)}
									</div>
									<select
										value={c.role}
										onChange={(e) => handleRoleChange(c.id, e.target.value)}
										className="px-2 py-1 rounded border border-stone-200 text-[10px] font-medium text-stone-600 bg-white"
									>
										<option value="viewer">Viewer</option>
										<option value="editor">Editor</option>
									</select>
									<button
										type="button"
										onClick={() => handleRemove(c.id)}
										className="p-1 rounded hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors"
									>
										<Trash2 size={12} />
									</button>
								</div>
							))}
						</div>
					)}

					{collaborators.length === 0 && (
						<p className="text-xs text-stone-400 text-center py-4">
							No collaborators yet. Invite someone by email.
						</p>
					)}
				</div>
			</motion.div>
		</div>
	);
}
