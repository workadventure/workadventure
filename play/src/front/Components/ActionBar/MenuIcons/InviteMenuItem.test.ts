import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import { get, readable, writable } from "svelte/store";
import { floatingUiComponents } from "../../../Utils/svelte-floatingui-show";
import InviteMenuItem from "./InviteMenuItem.svelte";

// jsdom has neither ResizeObserver nor IntersectionObserver, which autoUpdate() relies on.
vi.mock("@floating-ui/dom", () => ({
    autoUpdate: () => () => {},
    computePosition: () => Promise.resolve({ x: 0, y: 0, placement: "bottom", middlewareData: {} }),
    arrow: () => ({}),
    flip: () => ({}),
    shift: () => ({}),
    offset: () => ({}),
    limitShift: () => ({}),
}));

vi.mock("../../../Stores/MenuStore", () => ({
    inviteUserActivated: writable(true),
}));

vi.mock("../../../Administration/AnalyticsClient", () => ({
    analyticsClient: { openInvite: vi.fn() },
}));

vi.mock("../../Menu/GuestSubMenu.svelte", () => ({
    default: () => undefined,
}));

vi.mock("../../../../i18n/i18n-svelte", () => ({
    default: readable({ menu: { invite: { share: () => "Share" } } }),
}));

let target: HTMLElement;

function clickShareButton() {
    const button = target.querySelector("button");
    if (button === null) {
        throw new Error("The share button was not rendered");
    }
    button.click();
}

/**
 * FloatingUiPopupList renders the popup and applies the registered action to its content node.
 * Doing it by hand is what arms the click-outside listener.
 */
function mountPopupContent(): HTMLElement {
    const entry = [...get(floatingUiComponents).values()][0];
    if (entry === undefined) {
        throw new Error("No popup was registered");
    }
    const content = document.createElement("div");
    document.body.appendChild(content);
    entry.action(content);
    return content;
}

beforeEach(() => {
    target = document.createElement("div");
    document.body.appendChild(target);
});

afterEach(() => {
    target.remove();
    floatingUiComponents.set(new Map());
});

describe("InviteMenuItem", () => {
    it("opens and closes the popup when the button is toggled", async () => {
        const component = mount(InviteMenuItem, { target });
        flushSync();

        clickShareButton();
        expect(get(floatingUiComponents).size).toBe(1);

        clickShareButton();
        expect(get(floatingUiComponents).size).toBe(0);

        await unmount(component);
    });

    it("closes the popup when the button is destroyed", async () => {
        // The action bar is unmounted as soon as the chat or the map editor leaves less than 285px
        // of room. The popup is rendered at the root of the app, so without an onDestroy it would
        // stay on screen with no button left to close it.
        const component = mount(InviteMenuItem, { target });
        flushSync();

        clickShareButton();
        expect(get(floatingUiComponents).size).toBe(1);

        await unmount(component);

        expect(get(floatingUiComponents).size).toBe(0);
    });

    it("reopens the popup on the next click after a click outside closed it", async () => {
        const component = mount(InviteMenuItem, { target });
        flushSync();

        clickShareButton();
        mountPopupContent();

        document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        expect(get(floatingUiComponents).size).toBe(0);

        // A single click has to be enough: if the component tracked its open state separately from
        // the close handle, this click would be swallowed by a stale "close" branch.
        clickShareButton();
        expect(get(floatingUiComponents).size).toBe(1);

        await unmount(component);
    });

    it("does not close the popup when the button itself is clicked", async () => {
        const component = mount(InviteMenuItem, { target });
        flushSync();

        clickShareButton();
        mountPopupContent();

        // The click-outside listener must ignore mousedown on the trigger, otherwise it would race
        // with the button's own toggle and reopen the popup immediately.
        const button = target.querySelector("button");
        button?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        expect(get(floatingUiComponents).size).toBe(1);

        await unmount(component);
    });
});
