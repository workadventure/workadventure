import type { ChatSendMessageResult } from "../ChatConnection";
import { splitChatMessage } from "../../Services/ChatMessageSplitter";

export async function sendMatrixTextMessageInChunks(
    message: string,
    maxChunkLength: number,
    sendChunk: (chunk: string) => Promise<unknown>,
): Promise<ChatSendMessageResult> {
    const chunks = splitChatMessage(message, maxChunkLength);
    return sendChunkAtIndex(chunks, sendChunk, 0);
}

async function sendChunkAtIndex(
    chunks: string[],
    sendChunk: (chunk: string) => Promise<unknown>,
    index: number,
): Promise<ChatSendMessageResult> {
    if (index >= chunks.length) {
        return { status: "sent" };
    }

    try {
        await sendChunk(chunks[index]);
    } catch {
        return {
            status: index === 0 ? "failed" : "partial",
            remainingMessage: chunks.slice(index).join(""),
        };
    }

    return sendChunkAtIndex(chunks, sendChunk, index + 1);
}
