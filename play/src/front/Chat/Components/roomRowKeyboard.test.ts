import { afterEach, describe, expect, it } from "vitest";
import { focusAdjacentRoomRow, ROOM_ROW_BUTTON_ATTRIBUTE } from "./roomRowKeyboard";

function renderRows(count: number): HTMLButtonElement[] {
    return Array.from({ length: count }, () => {
        const button = document.createElement("button");
        button.setAttribute(ROOM_ROW_BUTTON_ATTRIBUTE, "");
        document.body.appendChild(button);
        return button;
    });
}

function press(target: HTMLElement, key: string): { handled: boolean; event: KeyboardEvent } {
    const event = new KeyboardEvent("keydown", { key, cancelable: true });
    Object.defineProperty(event, "currentTarget", { value: target });
    return { handled: focusAdjacentRoomRow(event), event };
}

describe("focusAdjacentRoomRow", () => {
    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("moves the focus to the next and previous room", () => {
        const [first, second, third] = renderRows(3);

        expect(press(second, "ArrowDown").handled).toBe(true);
        expect(document.activeElement).toBe(third);

        press(second, "ArrowUp");
        expect(document.activeElement).toBe(first);
    });

    it("stops at both ends of the list and lets the key through", () => {
        const [first, , third] = renderRows(3);

        const atTop = press(first, "ArrowUp");
        expect(atTop.handled).toBe(false);
        expect(atTop.event.defaultPrevented).toBe(false);
        expect(press(third, "ArrowDown").handled).toBe(false);
    });

    it("ignores other keys, Tab included", () => {
        const [first] = renderRows(2);
        first.focus();

        for (const key of ["Tab", "Enter", " ", "a"]) {
            expect(press(first, key).handled).toBe(false);
        }
        expect(document.activeElement).toBe(first);
    });
});
