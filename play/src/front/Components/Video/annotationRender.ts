import type { ScreenAnnotationElement, ScreenAnnotationPoint } from "@workadventure/messages";

/**
 * Pure rendering & hit-testing helpers for screen-sharing annotations.
 *
 * These functions have NO dependency on Svelte, the DOM lifecycle, or app stores: they take a
 * plain 2D canvas context (or geometry) and normalized 0..1 coordinates. This lets the same code
 * drive every surface that renders annotations:
 *  - the WorkAdventure video-tile overlay ({@link ScreenAnnotationOverlay.svelte}),
 *  - the Electron transparent screen overlay (plain HTML canvas), and
 *  - the outgoing-stream compositor.
 * Keeping a single implementation avoids the rendering drifting between surfaces.
 */

// Eraser hit tolerance, expressed in aspect-corrected normalized units (roughly a fraction of the
// smallest side of the visible video area).
export const HIT_THRESHOLD = 0.02;

export function clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
}

/**
 * Shortest distance from point `p` to segment `[a, b]`.
 * The horizontal axis is scaled by the video `aspect` ratio so the tolerance is isotropic in
 * screen pixels (normalized x and y otherwise map to different pixel lengths on a non-square video).
 */
export function distanceToSegment(
    p: ScreenAnnotationPoint,
    a: ScreenAnnotationPoint,
    b: ScreenAnnotationPoint,
    aspect: number,
): number {
    const ax = a.x * aspect;
    const bx = b.x * aspect;
    const pxc = p.x * aspect;
    const dx = bx - ax;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) {
        return Math.hypot(pxc - ax, p.y - a.y);
    }
    let t = ((pxc - ax) * dx + (p.y - a.y) * dy) / lengthSquared;
    t = Math.min(1, Math.max(0, t));
    return Math.hypot(pxc - (ax + t * dx), p.y - (a.y + t * dy));
}

/** True when the normalized point `p` is within {@link HIT_THRESHOLD} of the element (for erasing). */
export function hitTest(element: ScreenAnnotationElement, p: ScreenAnnotationPoint, aspect: number): boolean {
    // The eraser goes through what disappears on its own.
    if (element.tool === "pointer" || element.tool === "highlight") return false;
    const points = element.points;
    if (points.length === 0) {
        return false;
    }
    if (element.tool === "rect" && points.length >= 2) {
        const edges: [ScreenAnnotationPoint, ScreenAnnotationPoint][] = [
            [
                { x: points[0].x, y: points[0].y },
                { x: points[1].x, y: points[0].y },
            ],
            [
                { x: points[1].x, y: points[0].y },
                { x: points[1].x, y: points[1].y },
            ],
            [
                { x: points[1].x, y: points[1].y },
                { x: points[0].x, y: points[1].y },
            ],
            [
                { x: points[0].x, y: points[1].y },
                { x: points[0].x, y: points[0].y },
            ],
        ];
        return edges.some(([a, b]) => distanceToSegment(p, a, b, aspect) < HIT_THRESHOLD);
    }
    if (points.length === 1) {
        return Math.hypot((p.x - points[0].x) * aspect, p.y - points[0].y) < HIT_THRESHOLD;
    }
    for (let i = 1; i < points.length; i++) {
        if (distanceToSegment(p, points[i - 1], points[i], aspect) < HIT_THRESHOLD) {
            return true;
        }
    }
    return false;
}

/** Black or white text, whichever reads better on `color` (white unless it is a light #rrggbb color). */
function textColorOn(color: string): string {
    const hex = /^#([0-9a-f]{6})$/i.exec(color)?.[1];
    if (!hex) return "#ffffff";
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return 0.299 * r + 0.587 * g + 0.114 * b > 128 ? "#000000" : "#ffffff";
}

/**
 * Render a single annotation element onto a 2D canvas context.
 * Coordinates are normalized 0..1 and mapped to the context's backing-store pixel size, so the
 * caller only needs to size the canvas correctly (including devicePixelRatio).
 * A pointer shows `label` (who points) to its right.
 */
export function drawElement(ctx: CanvasRenderingContext2D, element: ScreenAnnotationElement, label?: string): void {
    if (element.tool === "highlight") {
        // A highlighter stroke: translucent, so what it covers stays readable.
        ctx.save();
        ctx.globalAlpha *= 0.4;
        drawElement(ctx, { ...element, tool: "pen" });
        ctx.restore();
        return;
    }
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const minSide = Math.min(w, h);
    const lineWidth = Math.max(1, element.width * minSide);
    ctx.strokeStyle = element.color;
    ctx.fillStyle = element.color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const points = element.points;
    if (points.length === 0) {
        return;
    }

    if (element.tool === "pointer") {
        ctx.save();
        ctx.translate(points[0].x * w, points[0].y * h);
        const size = Math.max(12, minSide * 0.025);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(size * 0.25, size);
        ctx.lineTo(size * 0.5, size * 0.6);
        ctx.lineTo(size, size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = Math.max(1, minSide * 0.002);
        ctx.stroke();
        if (label) {
            const fontSize = Math.max(11, size * 0.6);
            ctx.font = `${fontSize}px sans-serif`;
            const padding = fontSize * 0.4;
            const labelWidth = ctx.measureText(label).width + padding * 2;
            const labelHeight = fontSize + padding * 2;
            // To the left of the arrow when it would leave the canvas on the right.
            const x = points[0].x * w + size * 1.1 + labelWidth > w ? -labelWidth - padding : size * 1.1;
            // In the pointer's color, outlined in white like the arrow.
            ctx.beginPath();
            ctx.roundRect(x, size * 0.5, labelWidth, labelHeight, labelHeight / 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = textColorOn(element.color);
            ctx.textBaseline = "middle";
            ctx.fillText(label, x + padding, size * 0.5 + labelHeight / 2);
        }
        ctx.restore();
        return;
    }

    if (element.tool === "rect" && points.length >= 2) {
        const x = points[0].x * w;
        const y = points[0].y * h;
        ctx.strokeRect(x, y, (points[1].x - points[0].x) * w, (points[1].y - points[0].y) * h);
        return;
    }

    if (points.length === 1) {
        ctx.beginPath();
        ctx.arc(points[0].x * w, points[0].y * h, lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x * w, points[0].y * h);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x * w, points[i].y * h);
    }
    ctx.stroke();

    if (element.tool === "arrow") {
        const from = points[points.length - 2];
        const to = points[points.length - 1];
        const angle = Math.atan2((to.y - from.y) * h, (to.x - from.x) * w);
        const headLength = Math.max(lineWidth * 3, minSide * 0.03);
        ctx.beginPath();
        ctx.moveTo(to.x * w, to.y * h);
        ctx.lineTo(
            to.x * w - headLength * Math.cos(angle - Math.PI / 6),
            to.y * h - headLength * Math.sin(angle - Math.PI / 6),
        );
        ctx.moveTo(to.x * w, to.y * h);
        ctx.lineTo(
            to.x * w - headLength * Math.cos(angle + Math.PI / 6),
            to.y * h - headLength * Math.sin(angle + Math.PI / 6),
        );
        ctx.stroke();
    }
}
