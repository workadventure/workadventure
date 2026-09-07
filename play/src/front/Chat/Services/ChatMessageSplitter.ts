export const MAX_MATRIX_MESSAGE_CHARS = 40_000;

export function splitChatMessage(message: string, maxChunkLength = MAX_MATRIX_MESSAGE_CHARS): string[] {
    if (maxChunkLength <= 0) {
        throw new Error("maxChunkLength must be greater than 0");
    }

    if (message.length <= maxChunkLength) {
        return [message];
    }

    const chunks: string[] = [];
    let remainingMessage = message;

    while (remainingMessage.length > maxChunkLength) {
        const splitIndex = findSplitIndex(remainingMessage, maxChunkLength);
        chunks.push(remainingMessage.slice(0, splitIndex));
        remainingMessage = remainingMessage.slice(splitIndex);
    }

    if (remainingMessage.length > 0) {
        chunks.push(remainingMessage);
    }

    return chunks;
}

function findSplitIndex(message: string, maxChunkLength: number): number {
    const candidate = message.slice(0, maxChunkLength);
    const paragraphIndex = candidate.lastIndexOf("\n\n");

    if (paragraphIndex > 0) {
        return paragraphIndex + 2;
    }

    const lineIndex = candidate.lastIndexOf("\n");

    if (lineIndex > 0) {
        return lineIndex + 1;
    }

    const wordIndex = candidate.lastIndexOf(" ");

    if (wordIndex > 0) {
        return wordIndex + 1;
    }

    return maxChunkLength;
}
