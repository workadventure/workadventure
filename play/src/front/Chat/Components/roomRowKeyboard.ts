/** Marks the button that opens a room from the room list (`data-room-row-button` in the markup). */
export const ROOM_ROW_BUTTON_ATTRIBUTE = "data-room-row-button";
/** Marks a folder (or section) whose header toggle `→` opens and `←` closes; set on the folder's root element. */
export const ROVING_GROUP_ATTRIBUTE = "data-roving-group";
/** Marks the "..." button of a row (set by ChatMenu): Shift+F10 opens it. */
export const ROW_MENU_ATTRIBUTE = "data-chat-menu-button";

type RovingOptions = {
    /** The focusable items, in document order. */
    items: string;
    /** `→` opens the row's "..." menu (member lists) instead of only opening folders. */
    arrowRightOpensMenu?: boolean;
};

/**
 * Roving tabindex for a list: the list is a single Tab stop (the last focused item, else the first),
 * ↑ ↓ Home End move between items, → ← open and close folders (← on a row goes up to its folder),
 * Shift+F10 or the context-menu key opens the row's "..." menu. The rows' "..." buttons leave the Tab order.
 */
export function rovingFocus(node: HTMLElement, options: RovingOptions) {
    let current: HTMLElement | undefined;
    const items = () => Array.from(node.querySelectorAll<HTMLElement>(options.items));
    const rowOf = (item: HTMLElement) => item.closest<HTMLElement>("[data-roving-row]") ?? item;

    const sync = () => {
        const list = items();
        if (!current || !list.includes(current)) current = list[0];
        for (const item of list) {
            item.tabIndex = item === current ? 0 : -1;
            rowOf(item)
                .querySelectorAll<HTMLElement>(`[${ROW_MENU_ATTRIBUTE}]`)
                .forEach((button) => (button.tabIndex = -1));
        }
    };

    const onFocusIn = (event: FocusEvent) => {
        const target = event.target instanceof HTMLElement ? event.target : undefined;
        const item = items().find((candidate) => candidate === target || rowOf(candidate).contains(target ?? null));
        if (item && item !== current) {
            current = item;
            sync();
        }
    };

    const groupToggle = (group: Element | null | undefined) =>
        group?.querySelector<HTMLElement>(`${options.items}[aria-expanded]`) ?? undefined;

    const onKeyDown = (event: KeyboardEvent) => {
        const list = items();
        const item = list.find((candidate) => candidate === event.target);
        if (!item) return;
        let next: HTMLElement | undefined;
        const expanded = item.getAttribute("aria-expanded");

        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            next = list[list.indexOf(item) + (event.key === "ArrowDown" ? 1 : -1)];
        } else if (event.key === "Home") {
            next = list[0];
        } else if (event.key === "End") {
            next = list[list.length - 1];
        } else if (event.key === "ArrowRight" && expanded === "false") {
            item.click();
        } else if (event.key === "ArrowLeft" && expanded === "true") {
            item.click();
        } else if (event.key === "ArrowLeft") {
            // Up to the folder holding this row (or holding this closed folder).
            const ownGroup = item.closest(`[${ROVING_GROUP_ATTRIBUTE}]`);
            const group =
                expanded === null ? ownGroup : ownGroup?.parentElement?.closest(`[${ROVING_GROUP_ATTRIBUTE}]`);
            next = groupToggle(group);
            if (next === item) next = undefined;
        } else if (
            (event.key === "F10" && event.shiftKey) ||
            event.key === "ContextMenu" ||
            (event.key === "ArrowRight" && options.arrowRightOpensMenu)
        ) {
            rowOf(item).querySelector<HTMLElement>(`[${ROW_MENU_ATTRIBUTE}]`)?.click();
        } else {
            return;
        }
        event.preventDefault();
        next?.focus();
    };

    // Rows come and go (search, folders opening, sync): keep exactly one of them in the Tab order.
    const observer = new MutationObserver(sync);
    observer.observe(node, { childList: true, subtree: true });
    node.addEventListener("focusin", onFocusIn);
    node.addEventListener("keydown", onKeyDown);
    sync();

    return {
        update(newOptions: RovingOptions) {
            options = newOptions;
            sync();
        },
        destroy() {
            observer.disconnect();
            node.removeEventListener("focusin", onFocusIn);
            node.removeEventListener("keydown", onKeyDown);
        },
    };
}
