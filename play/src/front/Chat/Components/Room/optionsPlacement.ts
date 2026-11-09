export type OptionsPlacement = "end" | "start";

interface Box {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

/**
 * Where the message options bar sits above its bubble: at the bubble's end corner, unless something of the
 * message above (its bubble, time, reactions, readers) is under it there, then at the start corner. When both
 * are taken it stays at the end: covering the message above beats covering the one being acted on.
 */
export function pickOptionsPlacement(
    bubble: Box,
    bar: { width: number; height: number },
    obstacles: readonly Box[],
    rtl: boolean,
): OptionsPlacement {
    const top = bubble.top - bar.height;
    const atRight = { left: bubble.right - bar.width, right: bubble.right, top, bottom: bubble.top };
    const atLeft = { left: bubble.left, right: bubble.left + bar.width, top, bottom: bubble.top };
    const isFree = (box: Box) =>
        !obstacles.some((o) => o.left < box.right && o.right > box.left && o.top < box.bottom && o.bottom > box.top);
    if (isFree(rtl ? atLeft : atRight)) return "end";
    if (isFree(rtl ? atRight : atLeft)) return "start";
    return "end";
}
