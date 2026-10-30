import { describe, expect, it } from "vitest";
import { creationErrorMessage } from "./creationErrorMessage";

const messages = { forbidden: "forbidden", rateLimited: "rate", generic: "generic", addToFolder: "folder" };

describe("creationErrorMessage", () => {
    it("maps Matrix error codes carried as the cause", () => {
        expect(creationErrorMessage(new Error("x", { cause: { errcode: "M_FORBIDDEN" } }), messages)).toBe("forbidden");
        expect(creationErrorMessage(new Error("x", { cause: { errcode: "M_LIMIT_EXCEEDED" } }), messages)).toBe("rate");
    });

    it("keeps the translated folder error", () => {
        expect(creationErrorMessage(new Error("folder"), messages)).toBe("folder");
    });

    it("never shows the raw server message", () => {
        expect(creationErrorMessage(new Error("Internal server error"), messages)).toBe("generic");
        expect(creationErrorMessage("oops", messages)).toBe("generic");
    });
});
