export type ZoomLevel = "day" | "week" | "month";

interface GanttHeaderProps {
	dates: Date[];
	dayWidth: number;
	height: number;
	chartHeight: number;
	zoom: ZoomLevel;
	dark?: boolean;
}

export function GanttHeader({ dates, dayWidth, height, zoom, dark = false }: GanttHeaderProps) {
	const totalWidth = dates.length * dayWidth;
	const splitY = 26;

	const c = dark
		? { topBg: "#1C1C1E", monthText: "#78716C", divider: "#2C2C2E", border: "#2C2C2E", weekendBg: "#1A1A1C", dayText: "#57534E", dayDimText: "#3F3F46", dayBoldText: "#A8A29E", weekText: "#57534E" }
		: { topBg: "#FAFAF9", monthText: "#78716C", divider: "#EEEEEE", border: "#E7E5E4", weekendBg: "#F5F5F4", dayText: "#A8A29E", dayDimText: "#D6D3D1", dayBoldText: "#57534E", weekText: "#A8A29E" };

	const months: { label: string; startX: number; width: number }[] = [];
	let currentMonth = "";
	let monthStart = 0;
	dates.forEach((date, i) => {
		const month = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
		if (month !== currentMonth) {
			if (currentMonth) months.push({ label: currentMonth, startX: monthStart * dayWidth, width: (i - monthStart) * dayWidth });
			currentMonth = month;
			monthStart = i;
		}
	});
	if (currentMonth) months.push({ label: currentMonth, startX: monthStart * dayWidth, width: (dates.length - monthStart) * dayWidth });

	return (
		<g>
			{/* Row 1: Months */}
			<rect x={0} y={0} width={totalWidth} height={splitY} fill={c.topBg} />
			{months.map((month, mi) => (
				<g key={`m-${month.label}`}>
					{mi > 0 && <line x1={month.startX} y1={0} x2={month.startX} y2={height} stroke={c.border} strokeWidth={0.5} />}
					<text x={month.startX + 10} y={18} fill={c.monthText} fontSize={12} fontWeight={600} style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
						{month.label}
					</text>
				</g>
			))}
			<line x1={0} y1={splitY} x2={totalWidth} y2={splitY} stroke={c.divider} strokeWidth={0.5} />

			{/* Row 2: Dates */}
			{zoom === "day" && dates.map((date, i) => {
				const x = i * dayWidth;
				const isWeekend = date.getDay() === 0 || date.getDay() === 6;
				const isMonday = date.getDay() === 1;
				return (
					<g key={`d-${i}`}>
						{isWeekend && <rect x={x} y={splitY} width={dayWidth} height={height - splitY} fill={c.weekendBg} />}
						<text x={x + dayWidth / 2} y={height - 6} textAnchor="middle" fill={isWeekend ? c.dayDimText : isMonday ? c.dayBoldText : c.dayText} fontSize={10} fontWeight={isMonday ? 600 : 400} fontFamily="DM Mono, monospace">
							{date.getDate()}
						</text>
					</g>
				);
			})}

			{zoom === "week" && dates.map((date, i) => {
				const x = i * dayWidth;
				if (date.getDay() !== 1) return null;
				return (
					<g key={`w-${i}`}>
						<text x={x + 4} y={height - 8} fill={c.weekText} fontSize={10} fontFamily="DM Mono, monospace">
							{date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
						</text>
						<line x1={x} y1={splitY + 4} x2={x} y2={splitY + 8} stroke={c.divider} strokeWidth={0.5} />
					</g>
				);
			})}

			{zoom === "month" && dates.map((date, i) => {
				const x = i * dayWidth;
				if (date.getDay() !== 1) return null;
				return <line key={`mo-${i}`} x1={x} y1={height - 3} x2={x} y2={height} stroke={c.divider} strokeWidth={0.5} />;
			})}

			<line x1={0} y1={height} x2={totalWidth} y2={height} stroke={c.border} strokeWidth={1} />
		</g>
	);
}
