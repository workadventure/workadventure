import type { ChatSendMessageResult } from "../ChatConnection";
import { splitChatMessage } from "../../Services/ChatMessageSplitter";

export async function sendMatrixTextMessageInChunks(
    message: string,
    maxChunkLength: number,
    sendChunk: (chunk: string) => Promise<unknown>,
): Promise<ChatSendMessageResult> {
    const chunks = splitChatMessage(message, maxChunkLength);

    for (let index = 0; index < chunks.length; index += 1) {
        try {
            await sendChunk(chunks[index]);
        } catch {
            return {
                status: index === 0 ? "failed" : "partial",
                remainingMessage: chunks.slice(index).join(""),
            };
        }
    }

    return { status: "sent" };
}
