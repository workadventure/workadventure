export interface MinimapViewport {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** Convert CSS overlay coordinates into Phaser canvas coordinates, including HiDPI and game scaling. */
export function getMinimapViewport(
    overlay: MinimapViewport,
    canvas: MinimapViewport,
    gameSize: { width: number; height: number },
): MinimapViewport | undefined {
    if (canvas.width <= 0 || canvas.height <= 0 || overlay.width <= 0 || overlay.height <= 0) {
        return;
    }
    const scaleX = gameSize.width / canvas.width;
    const scaleY = gameSize.height / canvas.height;
    return {
        x: (overlay.x - canvas.x) * scaleX,
        y: (overlay.y - canvas.y) * scaleY,
        width: overlay.width * scaleX,
        height: overlay.height * scaleY,
    };
}

export function projectOnMinimap(point: { x: number; y: number }, view: MinimapViewport): { x: number; y: number } {
    return { x: ((point.x - view.x) / view.width) * 100, y: ((point.y - view.y) / view.height) * 100 };
}

export interface MinimapArea {
    id: string;
    name: string;
    x: number;
    y: number;
}

export interface MinimapAreaGroup extends MinimapArea {
    count: number;
    members: MinimapArea[];
}

/** Group nearby markers in CSS pixels so labels remain usable at every zoom level. */
export function groupMinimapAreas(areas: MinimapArea[], width: number, height: number): MinimapAreaGroup[] {
    const groups: MinimapAreaGroup[] = [];
    for (const area of areas) {
        const x = (area.x * width) / 100;
        const y = (area.y * height) / 100;
        if (x < 12 || x > width - 12 || y < 12 || y > height - 12) continue;
        const group = groups.find(
            (point) => Math.hypot(((point.x - area.x) * width) / 100, ((point.y - area.y) * height) / 100) < 26,
        );
        if (group) {
            group.name += ` · ${area.name}`;
            group.count += 1;
            group.members.push(area);
        } else {
            groups.push({ ...area, count: 1, members: [area] });
        }
    }
    return groups;
}

/** Cut the minimap out of Phaser's HTML layer, whose CSS scale can differ from the canvas. */
export function getMinimapDomClipPath(
    overlay: MinimapViewport,
    dom: MinimapViewport,
    size: { width: number; height: number },
): string | undefined {
    if (size.width <= 0 || size.height <= 0) return;
    const hole = getMinimapViewport(overlay, dom, size);
    if (!hole) return;
    const left = hole.x;
    const top = hole.y;
    const right = left + hole.width;
    const bottom = top + hole.height;
    return `polygon(evenodd, 0px 0px, ${size.width}px 0px, ${size.width}px ${size.height}px, 0px ${size.height}px, 0px 0px, ${left}px ${top}px, ${right}px ${top}px, ${right}px ${bottom}px, ${left}px ${bottom}px, ${left}px ${top}px, 0px 0px)`;
}
