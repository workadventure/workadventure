import { afterEach, describe, expect, it, vi } from "vitest";
import { ROOM_ROW_BUTTON_ATTRIBUTE, ROVING_GROUP_ATTRIBUTE, ROW_MENU_ATTRIBUTE, rovingFocus } from "./roomRowKeyboard";

// A list: two rooms, then a folder (open) holding one room. Each room row has a "..." button.
function renderList() {
    document.body.innerHTML = `
        <div id="list">
            <div data-roving-row><button ${ROOM_ROW_BUTTON_ATTRIBUTE} id="a"></button><button ${ROW_MENU_ATTRIBUTE} id="a-menu"></button></div>
            <div data-roving-row><button ${ROOM_ROW_BUTTON_ATTRIBUTE} id="b"></button></div>
            <div ${ROVING_GROUP_ATTRIBUTE}>
                <button ${ROOM_ROW_BUTTON_ATTRIBUTE} id="folder" aria-expanded="true"></button>
                <div data-roving-row><button ${ROOM_ROW_BUTTON_ATTRIBUTE} id="c"></button></div>
            </div>
        </div>`;
    const list = document.getElementById("list") as HTMLElement;
    const action = rovingFocus(list, { items: `[${ROOM_ROW_BUTTON_ATTRIBUTE}]` });
    const el = (id: string) => document.getElementById(id) as HTMLElement;
    const press = (id: string, key: string, shiftKey = false) => {
        const event = new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true });
        el(id).dispatchEvent(event);
        return event;
    };
    return { action, el, press };
}

describe("rovingFocus", () => {
    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("keeps a single Tab stop, which follows the focus", () => {
        const { action, el } = renderList();
        expect(["a", "b", "folder", "c"].map((id) => el(id).tabIndex)).toEqual([0, -1, -1, -1]);
        expect(el("a-menu").tabIndex).toBe(-1);

        el("c").focus();
        expect(["a", "b", "folder", "c"].map((id) => el(id).tabIndex)).toEqual([-1, -1, -1, 0]);
        action.destroy();
    });

    it("moves with the arrows, Home and End, and stops at the ends", () => {
        const { action, el, press } = renderList();
        el("a").focus();
        expect(press("a", "ArrowDown").defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(el("b"));
        press("b", "End");
        expect(document.activeElement).toBe(el("c"));
        press("c", "ArrowDown");
        expect(document.activeElement).toBe(el("c"));
        press("c", "Home");
        expect(document.activeElement).toBe(el("a"));
        expect(press("a", "Tab").defaultPrevented).toBe(false);
        action.destroy();
    });

    it("closes an open folder with ←, goes up to it from a row, and opens it with →", () => {
        const { action, el, press } = renderList();
        const toggle = vi.fn(() => {
            const expanded = el("folder").getAttribute("aria-expanded") === "true";
            el("folder").setAttribute("aria-expanded", String(!expanded));
        });
        el("folder").addEventListener("click", toggle);

        el("c").focus();
        press("c", "ArrowLeft");
        expect(document.activeElement).toBe(el("folder"));
        press("folder", "ArrowLeft");
        expect(el("folder").getAttribute("aria-expanded")).toBe("false");
        press("folder", "ArrowRight");
        expect(el("folder").getAttribute("aria-expanded")).toBe("true");
        expect(toggle).toHaveBeenCalledTimes(2);
        el("folder").removeEventListener("click", toggle);
        action.destroy();
    });

    it("opens the row's menu with Shift+F10", () => {
        const { action, el, press } = renderList();
        const open = vi.fn();
        el("a-menu").addEventListener("click", open);
        el("a").focus();
        press("a", "F10", true);
        expect(open).toHaveBeenCalledTimes(1);
        el("a-menu").removeEventListener("click", open);
        action.destroy();
    });
});
