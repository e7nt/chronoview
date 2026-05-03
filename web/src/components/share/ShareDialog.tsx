import { useState } from "react";
import { motion } from "framer-motion";
import { X, Copy, Check, Link2, Lock, Globe, Mail } from "lucide-react";
import { api } from "@/lib/api";
import type { ShareLink } from "@/lib/types";

interface ShareDialogProps {
	timelineId: string;
	onClose: () => void;
}

export function ShareDialog({ timelineId, onClose }: ShareDialogProps) {
	const [isPublic, setIsPublic] = useState(true);
	const [passcode, setPasscode] = useState("");
	const [contactEmail, setContactEmail] = useState("");
	const [shareLink, setShareLink] = useState<ShareLink | null>(null);
	const [creating, setCreating] = useState(false);
	const [copied, setCopied] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleCreate = async () => {
		setCreating(true);
		setError(null);
		try {
			const link = await api.createShareLink(timelineId, {
				is_public: isPublic,
				passcode: isPublic ? undefined : passcode || undefined,
			});
			setShareLink(link);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create link");
		} finally {
			setCreating(false);
		}
	};

	const shareUrl = shareLink
		? `${window.location.origin}/s/${shareLink.slug}`
		: null;

	const fullShareText = shareUrl
		? isPublic
			? shareUrl
			: `${shareUrl}\n\nThis timeline is passcode-protected.${contactEmail ? `\nContact ${contactEmail} for access.` : ""}`
		: null;

	const handleCopy = async () => {
		if (!fullShareText) return;
		await navigator.clipboard.writeText(fullShareText);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
			<div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
			<motion.div
				initial={{ opacity: 0, scale: 0.95, y: 8 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				transition={{ type: "spring", stiffness: 400, damping: 30 }}
				className="relative bg-white dark:bg-stone-900 rounded-t-xl sm:rounded-xl shadow-2xl border border-stone-200 dark:border-stone-700 w-full sm:max-w-md sm:mx-4 max-h-[90vh] overflow-y-auto"
			>
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800">
					<div className="flex items-center gap-2.5">
						<Link2 size={16} className="text-stone-500" />
						<h2 className="text-sm font-semibold text-stone-800 dark:text-stone-200">Share Timeline</h2>
					</div>
					<button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 transition-colors">
						<X size={14} />
					</button>
				</div>

				<div className="p-5 space-y-4">
					{!shareLink ? (
						<>
							{/* Access type toggle */}
							<div>
								<label className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-2 block">
									Access
								</label>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => setIsPublic(true)}
										className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
											isPublic
												? "border-stone-800 bg-stone-800 text-white"
												: "border-stone-200 dark:border-stone-700 text-stone-500 hover:border-stone-300"
										}`}
									>
										<Globe size={13} />
										Public
									</button>
									<button
										type="button"
										onClick={() => setIsPublic(false)}
										className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
											!isPublic
												? "border-stone-800 bg-stone-800 text-white"
												: "border-stone-200 dark:border-stone-700 text-stone-500 hover:border-stone-300"
										}`}
									>
										<Lock size={13} />
										Passcode
									</button>
								</div>
							</div>

							{/* Passcode + email fields */}
							{!isPublic && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: "auto" }}
									className="space-y-3"
								>
									<div>
										<label className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5 block">
											Passcode
										</label>
										<input
											type="text"
											value={passcode}
											onChange={(e) => setPasscode(e.target.value)}
											placeholder="Enter a passcode..."
											className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-800 dark:text-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
										/>
									</div>
									<div>
										<label className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
											<Mail size={10} />
											Contact email for passcode requests
										</label>
										<input
											type="email"
											value={contactEmail}
											onChange={(e) => setContactEmail(e.target.value)}
											placeholder="you@company.com"
											className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-800 dark:text-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
										/>
										<p className="text-[10px] text-stone-400 mt-1">
											Shown to viewers who need the passcode.
										</p>
									</div>
								</motion.div>
							)}

							{error && (
								<p className="text-xs text-red-600">{error}</p>
							)}

							<button
								type="button"
								onClick={handleCreate}
								disabled={creating || (!isPublic && !passcode.trim())}
								className="w-full py-2.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-40 transition-colors"
							>
								{creating ? "Creating..." : "Create Share Link"}
							</button>
						</>
					) : (
						<>
							{/* Share link created */}
							<div className="text-center py-2">
								<div className="w-10 h-10 mx-auto mb-3 rounded-full bg-green-50 flex items-center justify-center">
									<Check size={18} className="text-green-600" />
								</div>
								<p className="text-sm font-medium text-stone-800 dark:text-stone-200">Link created</p>
							</div>

							<div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
								<div className="flex items-center gap-2">
									{isPublic ? (
										<Globe size={12} className="text-green-500 shrink-0" />
									) : (
										<Lock size={12} className="text-amber-500 shrink-0" />
									)}
									<code className="text-xs text-stone-600 dark:text-stone-300 font-mono truncate flex-1">
										{shareUrl}
									</code>
									<button
										type="button"
										onClick={handleCopy}
										className="p-1.5 rounded-md hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 transition-colors shrink-0"
									>
										{copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
									</button>
								</div>

								{!isPublic && (
									<div className="mt-2 pt-2 border-t border-stone-200 dark:border-stone-700">
										<p className="text-[10px] text-stone-400">
											Passcode: <span className="font-mono text-stone-600 dark:text-stone-300">{passcode}</span>
										</p>
										{contactEmail && (
											<p className="text-[10px] text-stone-400 mt-0.5">
												Contact: <span className="text-stone-600 dark:text-stone-300">{contactEmail}</span>
											</p>
										)}
									</div>
								)}
							</div>

							<button
								type="button"
								onClick={() => { setShareLink(null); setPasscode(""); setContactEmail(""); }}
								className="w-full py-2 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
							>
								Create another link
							</button>
						</>
					)}
				</div>
			</motion.div>
		</div>
	);
}
