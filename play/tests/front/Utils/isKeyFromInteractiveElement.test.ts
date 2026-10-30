import { afterEach, describe, expect, it } from "vitest";
import { isKeyFromInteractiveElement } from "../../../src/front/Utils/isKeyFromInteractiveElement";

function keyFrom(target: EventTarget): KeyboardEvent {
    let received: KeyboardEvent | undefined;
    const listener = (event: Event) => {
        received = event as KeyboardEvent;
    };
    window.addEventListener("keyup", listener);
    target.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
    window.removeEventListener("keyup", listener);
    if (!received) throw new Error("The key event did not reach the window");
    return received;
}

describe("isKeyFromInteractiveElement", () => {
    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("ignores Enter pressed on a room of the chat list", () => {
        document.body.innerHTML =
            '<div class="wa-chat-item"><button data-room-row-button><span>Room</span></button></div>';
        const span = document.querySelector("span");
        if (!span) throw new Error("missing span");
        expect(isKeyFromInteractiveElement(keyFrom(span))).toBe(true);
    });

    it("ignores keys typed in a form field or an element acting as a button", () => {
        document.body.innerHTML = '<input /><div role="button" tabindex="0"></div><div contenteditable="true"></div>';
        for (const element of Array.from(document.body.children)) {
            expect(isKeyFromInteractiveElement(keyFrom(element))).toBe(true);
        }
    });

    it("lets the game handle a key pressed while nothing interactive has the focus", () => {
        document.body.innerHTML = "<canvas></canvas>";
        const canvas = document.querySelector("canvas");
        if (!canvas) throw new Error("missing canvas");
        expect(isKeyFromInteractiveElement(keyFrom(canvas))).toBe(false);
        expect(isKeyFromInteractiveElement(keyFrom(document.body))).toBe(false);
    });
});
