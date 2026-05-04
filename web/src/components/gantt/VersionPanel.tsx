import { api } from "@/lib/api";
import type { TimelineVersion } from "@/lib/types";
import { motion } from "framer-motion";
import { Clock, Download, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface VersionPanelProps {
	timelineId: string;
	dark?: boolean;
	onClose: () => void;
	onRestore: (content: string) => void;
}

export function VersionPanel({ timelineId, dark, onClose, onRestore }: VersionPanelProps) {
	const [versions, setVersions] = useState<TimelineVersion[]>([]);
	const [loading, setLoading] = useState(true);
	const [previewContent, setPreviewContent] = useState<string | null>(null);
	const [previewId, setPreviewId] = useState<string | null>(null);

	const loadVersions = useCallback(async () => {
		try {
			const data = await api.listVersions(timelineId);
			setVersions(data);
		} catch {
			// ignore
		} finally {
			setLoading(false);
		}
	}, [timelineId]);

	useEffect(() => {
		loadVersions();
	}, [loadVersions]);

	const handlePreview = async (versionId: string) => {
		if (previewId === versionId) {
			setPreviewContent(null);
			setPreviewId(null);
			return;
		}
		try {
			const data = await api.getVersion(timelineId, versionId);
			setPreviewContent(data.content);
			setPreviewId(versionId);
		} catch {
			// ignore
		}
	};

	const handleDownload = (version: TimelineVersion) => {
		if (!previewContent || previewId !== version.id) return;
		const filename = `${version.label || "version"}-${version.created_at.slice(0, 10)}.timeline`;
		const blob = new Blob([previewContent], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const handleRestore = async (versionId: string) => {
		if (!confirm("Restore this version? Current changes will be replaced.")) return;
		try {
			const data = await api.getVersion(timelineId, versionId);
			onRestore(data.content);
			onClose();
		} catch {
			// ignore
		}
	};

	const formatDate = (iso: string) => {
		const d = new Date(iso);
		return d.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const bg = dark ? "bg-stone-900 border-stone-700" : "bg-white border-stone-200";
	const text = dark ? "text-stone-200" : "text-stone-800";
	const textMuted = dark ? "text-stone-400" : "text-stone-500";

	return (
		<motion.div
			initial={{ x: "100%" }}
			animate={{ x: 0 }}
			exit={{ x: "100%" }}
			transition={{ type: "spring", stiffness: 400, damping: 35 }}
			className={`fixed right-0 top-0 bottom-0 w-[400px] max-w-[90vw] z-50 ${bg} border-l shadow-2xl flex flex-col`}
		>
			{/* Header */}
			<div
				className={`flex items-center gap-2 px-4 py-3 border-b ${dark ? "border-stone-700" : "border-stone-200"}`}
			>
				<Clock size={14} className={textMuted} />
				<h2 className={`text-sm font-semibold ${text} mr-auto`}>Version History</h2>
				<button
					type="button"
					onClick={onClose}
					className={`p-1 rounded-md hover:bg-stone-100 ${textMuted}`}
				>
					<X size={14} />
				</button>
			</div>

			{/* Version list */}
			<div className="flex-1 overflow-y-auto">
				{loading ? (
					<div className="p-4 text-center">
						<p className={`text-xs ${textMuted}`}>Loading versions...</p>
					</div>
				) : versions.length === 0 ? (
					<div className="p-8 text-center">
						<Clock size={24} className={`mx-auto mb-3 ${textMuted} opacity-30`} />
						<p className={`text-xs ${textMuted}`}>No versions yet.</p>
						<p className={`text-[10px] ${textMuted} mt-1`}>
							Versions are created automatically when you save.
						</p>
					</div>
				) : (
					<div className="divide-y divide-stone-100 dark:divide-stone-800">
						{versions.map((v) => (
							<div key={v.id} className="px-4 py-3">
								<div className="flex items-center gap-2 mb-1">
									<span className={`text-xs font-medium ${text}`}>{v.label || "Auto-save"}</span>
									<span className={`text-[10px] ${textMuted} ml-auto`}>
										{formatDate(v.created_at)}
									</span>
								</div>

								<div className="flex items-center gap-1.5 mt-2">
									<button
										type="button"
										onClick={() => handlePreview(v.id)}
										className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
											previewId === v.id
												? "bg-stone-800 text-white"
												: `bg-stone-100 ${textMuted} hover:bg-stone-200`
										}`}
									>
										{previewId === v.id ? "Hide" : "Preview"}
									</button>
									{previewId === v.id && previewContent && (
										<button
											type="button"
											onClick={() => handleDownload(v)}
											className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-stone-100 ${textMuted} hover:bg-stone-200 transition-colors`}
										>
											<Download size={10} />
											Download
										</button>
									)}
									<button
										type="button"
										onClick={() => handleRestore(v.id)}
										className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
									>
										<RotateCcw size={10} />
										Restore
									</button>
								</div>

								{/* Preview content */}
								{previewId === v.id && previewContent && (
									<pre
										className={`mt-2 p-3 rounded-lg text-[11px] leading-5 font-mono overflow-x-auto max-h-[300px] overflow-y-auto ${
											dark ? "bg-stone-800 text-stone-300" : "bg-stone-50 text-stone-600"
										}`}
									>
										{previewContent}
									</pre>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</motion.div>
	);
}
