import type { Component } from "svelte";
import { flushSync, mount, unmount } from "svelte";
import { on } from "svelte/events";
import Debug from "debug";

const debug = Debug("app:childWindow");

// Svelte 5 delegates these DOM handlers to the document it mounts in.
const DELEGATED_EVENTS = [
    "beforeinput",
    "click",
    "change",
    "contextmenu",
    "dblclick",
    "focusin",
    "focusout",
    "input",
    "keydown",
    "keyup",
    "mousedown",
    "mousemove",
    "mouseout",
    "mouseover",
    "mouseup",
    "pointerdown",
    "pointermove",
    "pointerout",
    "pointerover",
    "pointerup",
    "touchend",
    "touchmove",
    "touchstart",
];

/**
 * Copy the page's styles into another window of this renderer (the browser's picture-in-picture, a
 * desktop child window). Keeping these windows in the Play renderer, instead of opening a second web
 * page, avoids another websocket/WebRTC session that would duplicate presence and media.
 */
export function copyStyleSheets(target: Window): void {
    [...document.styleSheets].forEach((styleSheet) => {
        try {
            const style = document.createElement("style");
            style.textContent = [...styleSheet.cssRules].map((rule) => rule.cssText).join("");
            target.document.head.appendChild(style);
        } catch (e) {
            console.error("Could not copy stylesheet: ", e);
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.type = styleSheet.type;
            link.media = styleSheet.media.mediaText;
            link.href = styleSheet.href || "";
            target.document.head.appendChild(link);
        }
    });
}

/**
 * Svelte 5 delegates DOM handlers to the mount document. DOM moved into another window's document
 * needs a no-op svelte/events listener there to run Svelte's delegation. Returns the way to stop it.
 */
export function delegateSvelteEvents(target: Window): () => void {
    const stops = DELEGATED_EVENTS.map((eventName) => on(target.document, eventName, () => {}));
    return () => stops.forEach((stop) => stop());
}

export type DesktopChildWindow = { window: Window; close: () => void };

/**
 * Open a desktop child window (`window.open`, which the desktop app only lets through while it asks for
 * that window) and mount `component` in it. `onClose` runs once when the window closes, whoever closes
 * it: the desktop app, the page leaving, or `close()`.
 */
// Same constraints as svelte's own mount(): an interface of props is only assignable to `any` values.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function openDesktopChildWindow<Props extends Record<string, any>>(
    name: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: Component<Props, any, any>,
    props: (ownerDocument: Document) => Props,
    options: {
        /** Runs once when the window closes. */
        onClose?: () => void;
        /** Styles of this window only. */
        styles?: string;
        /** Copy the page's styles too (for the app's components). */
        pageStyles?: boolean;
    } = {},
): DesktopChildWindow | undefined {
    const { onClose, styles, pageStyles = true } = options;
    // Same origin as this page (about:blank), so this page renders into it directly.
    const child = window.open("about:blank", name);
    if (!child) return undefined;
    child.document.title = "WorkAdventure";
    for (const attribute of ["lang", "dir", "class"]) {
        const value = document.documentElement.getAttribute(attribute);
        if (value !== null) child.document.documentElement.setAttribute(attribute, value);
    }
    if (pageStyles) copyStyleSheets(child);
    if (styles) {
        const style = child.document.createElement("style");
        style.textContent = styles;
        child.document.head.appendChild(style);
    }
    const stopDelegation = delegateSvelteEvents(child);
    const app = mount(component, { target: child.document.body, props: props(child.document) });
    // Bindings (an element the caller moves DOM into) are set before the caller goes on.
    flushSync();

    let closed = false;
    const close = () => {
        if (closed) return;
        closed = true;
        stopChildPageHide();
        stopPageHide();
        onClose?.();
        unmount(app).catch((error: unknown) => debug(`${name}: unmount failed`, error));
        stopDelegation();
        if (!child.closed) child.close();
    };
    const stopChildPageHide = on(child, "pagehide", close);
    // A child window outlives the page that opened it: close it with the page.
    const stopPageHide = on(window, "pagehide", close);
    return { window: child, close };
}
