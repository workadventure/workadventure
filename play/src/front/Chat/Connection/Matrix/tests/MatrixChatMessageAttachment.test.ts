import type { MatrixEvent, Room } from "matrix-js-sdk";
import { get } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import { Deferred } from "@workadventure/shared-utils";
import { MatrixChatMessage } from "../MatrixChatMessage";
import { resolveAttachmentMediaFromEvent, resolveImageMediaFromEvent } from "../MatrixMediaResolver";

vi.mock("../MatrixChatUser", () => ({ chatUserFactoryFromEvent: () => undefined }));
vi.mock("../MatrixMediaResolver", () => ({
    resolveImageMediaFromEvent: vi.fn(),
    resolveAttachmentMediaFromEvent: vi.fn(),
}));

function createMessage(content: Record<string, unknown>): MatrixChatMessage {
    const event = {
        getId: () => "$event",
        getDate: () => new Date(0),
        getSender: () => "@alice:matrix.test",
        getContent: () => content,
        getOriginalContent: () => content,
        isDecryptionFailure: () => false,
        isRedacted: () => false,
        replacingEventId: () => undefined,
        replyEventId: undefined,
        status: null,
        on: vi.fn(),
        off: vi.fn(),
    } as unknown as MatrixEvent;
    const roomState = { maySendEvent: () => true, hasSufficientPowerLevelFor: () => true };
    const room = {
        client: {
            getUserId: () => "@alice:matrix.test",
            getSafeUserId: () => "@alice:matrix.test",
            mxcUrlToHttp: (url: string | undefined) => (url ? `https://matrix.test/${url}` : null),
        },
        getLiveTimeline: () => ({ getState: () => roomState }),
        getUnfilteredTimelineSet: () => ({ relations: { getChildEventsForEvent: () => undefined } }),
        getMember: () => null,
    } as unknown as Room;
    return new MatrixChatMessage(event, room);
}

describe("MatrixChatMessage attachment", () => {
    it("has no attachment on a text message", () => {
        expect(createMessage({ msgtype: "m.text", body: "hello" }).attachment).toBeUndefined();
    });

    it("is loading while an encrypted image is decrypted, then ready with its URL", async () => {
        const media = new Deferred<Awaited<ReturnType<typeof resolveImageMediaFromEvent>>>();
        vi.mocked(resolveImageMediaFromEvent).mockReturnValue(media.promise);

        const message = createMessage({
            msgtype: "m.image",
            body: "red.png",
            info: { mimetype: "image/png" },
            file: { url: "mxc://matrix.test/red" },
        });

        expect(get(message.attachment!.status)).toEqual({ state: "loading" });
        media.resolve({
            sourceUrl: "blob:red",
            thumbnailUrl: undefined,
            isEncrypted: true,
            error: undefined,
            cleanup: () => {},
        });
        await vi.waitFor(() => expect(get(message.attachment!.status)).toEqual({ state: "ready" }));
        expect(get(message.content).url).toBe("blob:red");
    });

    it("reports a file that cannot be decrypted", async () => {
        vi.mocked(resolveAttachmentMediaFromEvent).mockResolvedValue({
            sourceUrl: undefined,
            isEncrypted: true,
            error: "decrypt",
            cleanup: () => {},
        });

        const message = createMessage({
            msgtype: "m.file",
            body: "notes.txt",
            file: { url: "mxc://matrix.test/notes" },
        });

        await vi.waitFor(() => expect(get(message.attachment!.status)).toEqual({ state: "error", error: "decrypt" }));
    });
});
