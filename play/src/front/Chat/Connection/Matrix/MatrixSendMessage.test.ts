import { describe, expect, it, vi } from "vitest";
import { sendMatrixTextMessageInChunks } from "./MatrixSendMessage";

describe("MatrixSendMessage", () => {
    it("sends chunks sequentially and reports success", async () => {
        const sentChunks: string[] = [];

        const result = await sendMatrixTextMessageInChunks("alpha beta gamma", 6, (chunk) => {
            sentChunks.push(chunk);
            return Promise.resolve();
        });

        expect(result).toEqual({ status: "sent" });
        expect(sentChunks).toEqual(["alpha ", "beta ", "gamma"]);
    });

    it("returns the remaining unsent message when a later chunk fails", async () => {
        const sendChunk = vi
            .fn<(chunk: string) => Promise<void>>()
            .mockResolvedValueOnce()
            .mockRejectedValueOnce(new Error("Matrix is unavailable"));

        const result = await sendMatrixTextMessageInChunks("alpha beta gamma", 6, sendChunk);

        expect(result).toEqual({ status: "partial", remainingMessage: "beta gamma" });
        expect(sendChunk).toHaveBeenCalledTimes(2);
    });

    it("returns the full message when the first chunk fails", async () => {
        const sendChunk = vi.fn<(chunk: string) => Promise<void>>().mockRejectedValueOnce(new Error("M_TOO_LARGE"));

        const result = await sendMatrixTextMessageInChunks("alpha beta", 6, sendChunk);

        expect(result).toEqual({ status: "failed", remainingMessage: "alpha beta" });
    });
});
