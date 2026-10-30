import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRawSnippet, flushSync, mount, unmount } from "svelte";
import ChatMenu from "./ChatMenu.svelte";

const items = createRawSnippet(() => ({
    render: () =>
        '<span><button role="menuitem" tabindex="-1">Mute</button><button role="menuitem" tabindex="-1">Leave</button></span>',
}));

let target: HTMLElement;
let component: ReturnType<typeof mount>;

function press(key: string, shiftKey = false) {
    (document.activeElement ?? document.body).dispatchEvent(
        new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true }),
    );
    flushSync();
}

function focusedText() {
    return document.activeElement?.textContent;
}

describe("ChatMenu keyboard", () => {
    beforeEach(() => {
        target = document.createElement("div");
        document.body.appendChild(target);
        component = mount(ChatMenu, {
            target,
            props: { label: "Options for general", buttonClass: "", menuClass: "", children: items },
        });
        flushSync();
    });

    afterEach(async () => {
        await unmount(component);
        target.remove();
    });

    it("opens on a keyboard click with focus on the first item, keeps Tab inside, and Escape goes back to the button", async () => {
        const button = target.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]');
        if (button === null) throw new Error("The menu button was not rendered");
        button.focus();
        // A keyboard Enter or Space fires a click with detail 0.
        button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 0 }));
        // openMenu() moves the focus after its own tick().
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 0);
        });
        flushSync();
        expect(button.getAttribute("aria-expanded")).toBe("true");
        expect(focusedText()).toBe("Mute");

        press("Tab");
        expect(focusedText()).toBe("Leave");
        press("Tab");
        expect(focusedText()).toBe("Mute");
        press("Tab", true);
        expect(focusedText()).toBe("Leave");
        expect(button.getAttribute("aria-expanded")).toBe("true");

        press("Escape");
        expect(button.getAttribute("aria-expanded")).toBe("false");
        expect(document.activeElement).toBe(button);
    });
});

describe("ChatMenu, several menus", () => {
    it("closes the open menu when another one opens", async () => {
        const targets = [document.createElement("div"), document.createElement("div")];
        const menus = targets.map((menuTarget, index) => {
            document.body.appendChild(menuTarget);
            return mount(ChatMenu, {
                target: menuTarget,
                props: { label: `Options for room ${index}`, buttonClass: "", menuClass: "", children: items },
            });
        });
        flushSync();
        const [first, second] = targets.map((menuTarget) => {
            const button = menuTarget.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]');
            if (button === null) throw new Error("The menu button was not rendered");
            return button;
        });

        first.click();
        flushSync();
        expect(first.getAttribute("aria-expanded")).toBe("true");

        // The button stops its click: the first menu never sees it as a click outside.
        second.click();
        flushSync();
        expect(second.getAttribute("aria-expanded")).toBe("true");
        expect(first.getAttribute("aria-expanded")).toBe("false");

        second.click();
        flushSync();
        first.click();
        flushSync();
        expect(first.getAttribute("aria-expanded")).toBe("true");

        await Promise.all(menus.map((menu) => unmount(menu)));
        targets.forEach((menuTarget) => menuTarget.remove());
    });
});
