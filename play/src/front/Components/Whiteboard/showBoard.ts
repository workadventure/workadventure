/**
 * Moves a board's element into this node, and out of it when the node goes: what displays a board (the stage tile,
 * the panel) comes and goes, the board (and its session) must outlive it.
 */
export function showBoard(node: HTMLElement, host: HTMLElement) {
    node.appendChild(host);
    return {
        destroy() {
            if (host.parentElement === node) {
                host.remove();
            }
        },
    };
}
