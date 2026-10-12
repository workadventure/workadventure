import type { IContent } from "matrix-js-sdk";
import { describe, expect, it, vi } from "vitest";
import type { ChatMessageContent, ChatMessageType } from "../../ChatConnection";
import { MatrixChatMessage } from "../MatrixChatMessage";

vi.mock(
    "../../../../Enum/EnvironmentVariable.ts",
    () => import("../../../../../../tests/front/mocks/frontEnvironmentVariableMock"),
);

function getMessageContent(type: ChatMessageType, content: IContent): ChatMessageContent {
    // The constructor needs a whole room and timeline: only the content mapping is under test here.
    const message = Object.create(MatrixChatMessage.prototype) as MatrixChatMessage;
    Object.assign(message, {
        type,
        event: {
            isDecryptionFailure: () => false,
            getContent: () => content,
            getOriginalContent: () => content,
            replyEventId: undefined,
        },
        // Like matrix-js-sdk, an empty string (not null) when there is no mxc URL.
        room: { client: { mxcUrlToHttp: (mxc: string | undefined) => (mxc ? `https://example.org/${mxc}` : "") } },
    });
    return (message as unknown as { getMessageContent(): ChatMessageContent }).getMessageContent();
}

const encryptedFile = {
    url: "mxc://example.org/ciphertext",
    v: "v2",
    key: { alg: "A256CTR", ext: true, k: "key", key_ops: ["encrypt", "decrypt"], kty: "oct" },
    iv: "iv",
    hashes: { sha256: "hash" },
};

describe("MatrixChatMessage", () => {
    describe("getMessageContent", () => {
        it.each<[ChatMessageType, string]>([
            ["file", "m.file"],
            ["image", "m.image"],
            ["audio", "m.audio"],
            ["video", "m.video"],
        ])("should not give an encrypted %s the URL of its ciphertext", (type, msgtype) => {
            const content = getMessageContent(type, { msgtype, body: "figures", file: encryptedFile });

            // Until resolveImageMedia() or resolveAttachmentMedia() decrypts it, a download link or an <img> would
            // only get the ciphertext.
            expect(content.url).toBeUndefined();
            expect(content.mediaState).toBe("loading");
        });

        it("should not give an image without a thumbnail an empty thumbnail URL", () => {
            const content = getMessageContent("image", { msgtype: "m.image", body: "figures", file: encryptedFile });

            // An empty string is not undefined: the image would show as broken instead of loading.
            expect(content.thumbnailUrl).toBeUndefined();
        });

        it("should give an unencrypted attachment its URL right away", () => {
            const content = getMessageContent("file", {
                msgtype: "m.file",
                body: "figures",
                url: "mxc://example.org/plain",
            });

            expect(content.url).toBe("https://example.org/mxc://example.org/plain");
            expect(content.mediaState).toBe("ready");
        });
    });
});
