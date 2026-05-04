import type { ChartTask } from "@/lib/build-chart-timeline";
import { STATUS_COLORS } from "@/lib/constants";
import { motion } from "framer-motion";
import { memo } from "react";

interface GanttBarProps {
	task: ChartTask;
	x: number;
	y: number;
	width: number;
	height: number;
	actualX?: number;
	actualWidth?: number;
	index: number;
	isSelected: boolean;
	dark?: boolean;
	editMode?: boolean;
	isDirty?: boolean;
	onClick: () => void;
	onDragStart?: (e: React.PointerEvent) => void;
	onResizeStartLeft?: (e: React.PointerEvent) => void;
	onResizeStartRight?: (e: React.PointerEvent) => void;
}

const HANDLE_WIDTH = 8;

export const GanttBar = memo(function GanttBar({
	task,
	x,
	y,
	width,
	height,
	actualX,
	actualWidth,
	index,
	isSelected,
	dark = false,
	editMode = false,
	isDirty = false,
	onClick,
	onDragStart,
	onResizeStartLeft,
	onResizeStartRight,
}: GanttBarProps) {
	const color = task.color || STATUS_COLORS[task.status] || STATUS_COLORS.todo!;
	const hasActual = actualX !== undefined && actualWidth !== undefined;
	const barX = hasActual ? actualX : x;
	const barWidth = Math.max(hasActual ? actualWidth! : width, 4);
	const isCancelled = task.status === "cancelled";
	const isBlocked = task.status === "blocked";
	const isInProgress = task.status === "in-progress";

	return (
		<motion.g
			initial={{ opacity: 0, x: -20 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ delay: index * 0.03, type: "spring", stiffness: 300, damping: 30 }}
			className={editMode ? "cursor-grab" : "cursor-pointer"}
			onClick={onClick}
		>
			{/* Selection ring */}
			{isSelected && (
				<rect
					x={barX - 2}
					y={y - 2}
					width={barWidth + 4}
					height={height + 4}
					rx={7}
					fill="none"
					stroke={color}
					strokeWidth={2}
					opacity={0.6}
				/>
			)}

			{/* Shadow (planned) when actual differs */}
			{hasActual && (
				<rect
					x={x}
					y={y + 2}
					width={Math.max(width, 4)}
					height={height - 4}
					rx={4}
					fill={color}
					opacity={0.15}
					strokeDasharray="4 2"
					stroke={color}
					strokeWidth={0.5}
					strokeOpacity={0.3}
				/>
			)}

			{/* Main bar */}
			<rect
				x={barX}
				y={y}
				width={barWidth}
				height={height}
				rx={5}
				fill={color}
				opacity={isCancelled ? 0.1 : isSelected ? 0.45 : 0.3}
				onPointerDown={editMode ? onDragStart : undefined}
			/>

			{/* In-progress pulse */}
			{isInProgress && (
				<rect x={barX} y={y} width={barWidth} height={height} rx={5} fill={color} opacity={0}>
					<animate attributeName="opacity" values="0;0.15;0" dur="2s" repeatCount="indefinite" />
				</rect>
			)}

			{/* Blocked hatch */}
			{isBlocked && (
				<>
					<defs>
						<pattern
							id={`hatch-${task.id}`}
							width="6"
							height="6"
							patternUnits="userSpaceOnUse"
							patternTransform="rotate(45)"
						>
							<line x1="0" y1="0" x2="0" y2="6" stroke="#EF4444" strokeWidth="1" opacity="0.3" />
						</pattern>
					</defs>
					<rect
						x={barX}
						y={y}
						width={barWidth}
						height={height}
						rx={5}
						fill={`url(#hatch-${task.id})`}
					/>
				</>
			)}

			{/* Cancelled strikethrough */}
			{isCancelled && (
				<line
					x1={barX + 6}
					y1={y + height / 2}
					x2={barX + barWidth - 6}
					y2={y + height / 2}
					stroke="#9CA3AF"
					strokeWidth={1.5}
					opacity={0.6}
				/>
			)}

			{/* Task name */}
			<text
				x={barX + 10}
				y={y + height / 2 + 1}
				dominantBaseline="middle"
				fill={
					isCancelled
						? dark
							? "#57534E"
							: "#A8A29E"
						: isSelected
							? dark
								? "#E7E5E4"
								: "#1C1917"
							: dark
								? "#A8A29E"
								: "#44403C"
				}
				fontWeight={isCancelled ? 400 : 500}
				fontSize={13}
				textDecoration={isCancelled ? "line-through" : undefined}
				style={editMode ? { pointerEvents: "none" } : undefined}
			>
				{task.name}
			</text>

			{/* Dirty indicator */}
			{isDirty && (
				<circle
					cx={barX + barWidth - 4}
					cy={y + 4}
					r={3}
					fill="#F59E0B"
					stroke="white"
					strokeWidth={1}
				/>
			)}

			{/* Edit mode: resize handles */}
			{editMode && barWidth > HANDLE_WIDTH * 2 && (
				<>
					{/* Left resize handle */}
					<rect
						x={barX}
						y={y}
						width={HANDLE_WIDTH}
						height={height}
						rx={5}
						fill="transparent"
						className="cursor-col-resize"
						onPointerDown={onResizeStartLeft}
					/>
					{/* Left grip lines */}
					<line
						x1={barX + 3}
						y1={y + height * 0.3}
						x2={barX + 3}
						y2={y + height * 0.7}
						stroke={color}
						strokeWidth={1}
						opacity={0.4}
						style={{ pointerEvents: "none" }}
					/>
					<line
						x1={barX + 5}
						y1={y + height * 0.3}
						x2={barX + 5}
						y2={y + height * 0.7}
						stroke={color}
						strokeWidth={1}
						opacity={0.4}
						style={{ pointerEvents: "none" }}
					/>

					{/* Right resize handle */}
					<rect
						x={barX + barWidth - HANDLE_WIDTH}
						y={y}
						width={HANDLE_WIDTH}
						height={height}
						rx={5}
						fill="transparent"
						className="cursor-col-resize"
						onPointerDown={onResizeStartRight}
					/>
					{/* Right grip lines */}
					<line
						x1={barX + barWidth - 5}
						y1={y + height * 0.3}
						x2={barX + barWidth - 5}
						y2={y + height * 0.7}
						stroke={color}
						strokeWidth={1}
						opacity={0.4}
						style={{ pointerEvents: "none" }}
					/>
					<line
						x1={barX + barWidth - 3}
						y1={y + height * 0.3}
						x2={barX + barWidth - 3}
						y2={y + height * 0.7}
						stroke={color}
						strokeWidth={1}
						opacity={0.4}
						style={{ pointerEvents: "none" }}
					/>
				</>
			)}
		</motion.g>
	);
});
