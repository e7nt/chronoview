/**
 * Export the Gantt chart as PNG screenshot using html2canvas.
 * Captures the actual DOM — labels, bars, milestones, everything.
 * Adds a "Generated with Chronoview" watermark at the bottom.
 */

interface ExportOptions {
	scrollContainer: HTMLDivElement;
	title: string;
}

const WATERMARK_HEIGHT = 36;

export async function exportChart(opts: ExportOptions): Promise<void> {
	const { scrollContainer, title } = opts;
	const html2canvas = (await import("html2canvas")).default;

	const chartCanvas = await html2canvas(scrollContainer, {
		scale: 2,
		useCORS: true,
		backgroundColor: "#FFFFFF",
		scrollX: 0,
		scrollY: 0,
		windowWidth: scrollContainer.scrollWidth,
		windowHeight: scrollContainer.scrollHeight,
	});

	// Create final canvas with watermark bar at bottom
	const scale = 2;
	const finalCanvas = document.createElement("canvas");
	finalCanvas.width = chartCanvas.width;
	finalCanvas.height = chartCanvas.height + WATERMARK_HEIGHT * scale;

	const ctx = finalCanvas.getContext("2d")!;

	// Draw chart
	ctx.drawImage(chartCanvas, 0, 0);

	// Draw watermark bar
	const wmY = chartCanvas.height;
	ctx.fillStyle = "#FAFAF9";
	ctx.fillRect(0, wmY, finalCanvas.width, WATERMARK_HEIGHT * scale);

	// Top border
	ctx.fillStyle = "#E7E5E4";
	ctx.fillRect(0, wmY, finalCanvas.width, 1 * scale);

	// Watermark text
	ctx.fillStyle = "#A8A29E";
	ctx.font = `${11 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(
		"Generated with Chronoview",
		finalCanvas.width / 2,
		wmY + (WATERMARK_HEIGHT * scale) / 2,
	);

	const filename = `${title.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-").toLowerCase()}-timeline.png`;

	finalCanvas.toBlob((blob) => {
		if (!blob) return;
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}, "image/png");
}
