import { afterEach, describe, expect, it, vi } from "vitest";
import { trackFormFocus } from "./trackFormFocus";

let stop: (() => void) | undefined;
afterEach(() => {
    stop?.();
    document.body.replaceChildren();
});

describe("form focus after screen annotations", () => {
    it("restores controls when the focused text input disappears without focusout", async () => {
        const input = document.createElement("input");
        document.body.append(input);
        const setFocused = vi.fn();
        stop = trackFormFocus(document, setFocused);
        input.focus();
        expect(setFocused).toHaveBeenLastCalledWith(true);
        input.remove();
        await Promise.resolve();
        expect(setFocused).toHaveBeenLastCalledWith(false);
    });

    it("keeps controls disabled if another input still holds focus", async () => {
        const first = document.createElement("input");
        const second = document.createElement("textarea");
        document.body.append(first, second);
        const setFocused = vi.fn();
        stop = trackFormFocus(document, setFocused);
        first.focus();
        second.focus();
        first.remove();
        await Promise.resolve();
        expect(setFocused).toHaveBeenLastCalledWith(true);
        second.blur();
        expect(setFocused).toHaveBeenLastCalledWith(false);
    });

    it("restores controls on teardown even if an input is still focused", () => {
        const input = document.createElement("input");
        document.body.append(input);
        const setFocused = vi.fn();
        stop = trackFormFocus(document, setFocused);
        input.focus();
        stop();
        expect(setFocused).toHaveBeenLastCalledWith(false);
    });
});
