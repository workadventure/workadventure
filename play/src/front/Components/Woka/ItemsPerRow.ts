/**
 * Returns the number of items for the first row of a flexbox container.
 */
export function getItemsPerRow(container: HTMLElement | null | undefined): number {
    if (!container) return 1;
    const children = Array.from(container.children);
    if (children.length === 0) return 0;

    if (!(children[0] instanceof HTMLElement)) return 1;
    const firstRowTop = children[0].offsetTop;
    let count = 0;

    for (const child of children) {
        if (!(child instanceof HTMLElement)) continue;
        if (child.offsetTop !== firstRowTop) break;
        count++;
    }

    return count;
}
