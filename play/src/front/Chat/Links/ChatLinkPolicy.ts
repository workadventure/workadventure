export type ChatLinkAction = { kind: "native" } | { kind: "cowebsite"; url: string };

function parseUrl(href: string): URL | undefined {
    try {
        return new URL(href);
    } catch {
        return undefined;
    }
}

/**
 * Decides what a click on a link inside a chat message should do.
 *
 * Deliberately kept in a module of its own, free of side effects and of imports: the opener it
 * serves reaches into the game scene, and pulling Phaser in just to test this would be absurd.
 */
export function resolveChatLinkClick(anchor: HTMLAnchorElement, event: MouseEvent): ChatLinkAction {
    // Anything but a plain left click keeps its usual browser meaning.
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        return { kind: "native" };
    }

    const href = anchor.getAttribute("href");
    if (href === null) {
        return { kind: "native" };
    }

    const url = parseUrl(href);
    if (url === undefined || (url.protocol !== "http:" && url.protocol !== "https:")) {
        return { kind: "native" };
    }

    // Embedding WorkAdventure into itself is never what the user meant.
    if (url.origin === window.location.origin) {
        return { kind: "native" };
    }

    return { kind: "cowebsite", url: href };
}
