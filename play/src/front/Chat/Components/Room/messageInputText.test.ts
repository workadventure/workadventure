import { describe, expect, it } from "vitest";
import { messageInputText } from "./messageInputText";

describe("messageInputText", () => {
    it("has nothing to send when the input only holds what an erased text leaves behind", () => {
        expect(messageInputText("")).toBeUndefined();
        expect(messageInputText("<br>")).toBeUndefined();
        expect(messageInputText("<br><br>")).toBeUndefined();
        expect(messageInputText("&nbsp;")).toBeUndefined();
        expect(messageInputText(" \u00a0<br> ")).toBeUndefined();
    });

    it("sends the line breaks as new lines", () => {
        expect(messageInputText("Hello<br>world")).toBe("Hello\nworld");
    });
});
