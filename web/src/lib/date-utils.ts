/**
 * Parse an ISO date string (YYYY-MM-DD) into a Date in local timezone.
 * Uses UTC to avoid DST issues when calculating day differences.
 */
export function parseDate(dateStr: string): Date {
	const [year, month, day] = dateStr.split("-").map(Number);
	return new Date(Date.UTC(year!, month! - 1, day!));
}

export function daysBetween(start: Date, end: Date): number {
	return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDate(date: Date): string {
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function formatDateFull(date: Date): string {
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
	});
}

export function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setUTCDate(result.getUTCDate() + days);
	return result;
}

export function toISODate(date: Date): string {
	return date.toISOString().split("T")[0]!;
}

export function getDateRange(
	sections: {
		tasks: {
			planned_start: string;
			planned_end: string;
			actual_start?: string | null;
			actual_end?: string | null;
		}[];
	}[],
): { start: Date; end: Date } {
	let minDate: Date | null = null;
	let maxDate: Date | null = null;

	for (const section of sections) {
		for (const task of section.tasks) {
			if (!task.planned_start || !task.planned_end) continue;
			const dateStrs = [
				task.planned_start,
				task.planned_end,
				task.actual_start,
				task.actual_end,
			].filter(Boolean) as string[];

			for (const d of dateStrs) {
				const date = parseDate(d);
				if (!minDate || date < minDate) minDate = date;
				if (!maxDate || date > maxDate) maxDate = date;
			}
		}
	}

	const now = new Date();
	return {
		start: addDays(minDate ?? now, -7),
		end: addDays(maxDate ?? now, 14),
	};
}
