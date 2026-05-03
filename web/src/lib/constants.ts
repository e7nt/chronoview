export const STATUS_COLORS: Record<string, string> = {
	todo: "#6B7280",
	"in-progress": "#3B82F6",
	done: "#22C55E",
	blocked: "#EF4444",
	cancelled: "#9CA3AF",
};

export const STATUS_LABELS: Record<string, { label: string; className: string }> = {
	todo: { label: "To Do", className: "bg-stone-100 text-stone-600" },
	"in-progress": { label: "In Progress", className: "bg-blue-50 text-blue-700" },
	done: { label: "Done", className: "bg-green-50 text-green-700" },
	blocked: { label: "Blocked", className: "bg-red-50 text-red-700" },
	cancelled: { label: "Cancelled", className: "bg-stone-100 text-stone-400" },
};
