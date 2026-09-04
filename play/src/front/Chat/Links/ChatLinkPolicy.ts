/**
 * Decides what a click on a link inside a chat message should do: returns the URL to open as a
 * co-website, or undefined to leave the click to the browser.
 *
 * Deliberately kept in a module of its own, free of side effects and of imports: the opener it
 * serves reaches into the game scene, and pulling Phaser in just to test this would be absurd.
 */
export function resolveChatLinkClick(anchor: HTMLAnchorElement, event: MouseEvent): string | undefined {
    // Anything but a plain left click keeps its usual browser meaning.
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        return undefined;
    }

    // The anchor has already parsed its href: a relative link, a bare fragment and a missing href
    // all resolve against our own document, so the origin check below covers them for free.
    if (anchor.protocol !== "http:" && anchor.protocol !== "https:") {
        return undefined;
    }

    // Embedding WorkAdventure into itself is never what the user meant.
    if (anchor.origin === window.location.origin) {
        return undefined;
    }

    return anchor.href;
}
