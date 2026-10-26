import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, tick, unmount } from "svelte";
import MessageInput from "./MessageInput.svelte";

let component: ReturnType<typeof mount> | undefined;
afterEach(async () => {
    if (component) await unmount(component);
    component = undefined;
    document.body.replaceChildren();
    vi.restoreAllMocks();
});

describe("chat composer in a child document", () => {
    it("pastes plain text into the child selection without moving the main selection", async () => {
        const frame = document.createElement("iframe");
        document.body.append(frame);
        const child = frame.contentDocument;
        if (!child?.defaultView) throw new Error("Missing child document");
        Object.defineProperty(child.defaultView.HTMLElement.prototype, "scrollIntoView", {
            value: vi.fn(),
            configurable: true,
        });
        component = mount(MessageInput, {
            target: child.body,
            props: {
                message: "",
                inputClass: "message-input",
                dataText: "",
                dataTestid: "composer",
            },
        });
        await tick();
        const composer = child.querySelector("[role=textbox]");
        const selection = child.defaultView?.getSelection();
        if (!composer || !selection) throw new Error("Missing child composer");
        const range = child.createRange();
        range.selectNodeContents(composer);
        selection.addRange(range);
        const mainSelection = vi.spyOn(window, "getSelection");
        const event = new Event("paste", { bubbles: true, cancelable: true });
        Object.defineProperty(event, "clipboardData", { value: { getData: () => "Hello\n<world>", files: [] } });
        composer.dispatchEvent(event);
        await tick();
        expect(composer.textContent).toBe("Hello<world>");
        expect(composer.querySelector("world")).toBeNull();
        expect(mainSelection).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(true);
    });
});
