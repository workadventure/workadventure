import type { PrivateSpaceEvent } from "@workadventure/messages";
import { Subject } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { ProximityFileTransferService, validateProximityFiles } from "../ProximityFileTransferService";

describe("validateProximityFiles", () => {
    it("should reject more than three files", () => {
        const files = [
            new File(["a"], "a.txt"),
            new File(["b"], "b.txt"),
            new File(["c"], "c.txt"),
            new File(["d"], "d.txt"),
        ];

        const result = validateProximityFiles(files);

        expect(result).toEqual({ ok: false, reason: "too-many-files" });
    });
});

describe("ProximityFileTransferService", () => {
    it("should emit one private offer per recipient", () => {
        const emitPrivateMessage = vi.fn();
        const service = new ProximityFileTransferService({
            localSpaceUserId: "sender",
            space: {
                emitPrivateMessage,
                observePrivateEvent: () => new Subject() as never,
            },
            getIceServers: () => Promise.resolve([]),
        });

        service.createOutgoingOffers(
            [new File(["hello"], "hello.txt", { type: "text/plain" })],
            [{ spaceUserId: "recipient-1" }, { spaceUserId: "recipient-2" }]
        );

        expect(
            emitPrivateMessage.mock.calls.map(([message, receiver]) => [
                (message as NonNullable<PrivateSpaceEvent["event"]>).$case,
                receiver,
            ])
        ).toEqual([
            ["proximityFileTransferOffer", "recipient-1"],
            ["proximityFileTransferOffer", "recipient-2"],
        ]);
    });
});
