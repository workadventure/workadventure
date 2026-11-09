export interface CreationErrorMessages {
    forbidden: string;
    rateLimited: string;
    generic: string;
    /** Already translated: thrown as is when the new room could not be added to its folder. */
    addToFolder: string;
}

/** Turns a room or folder creation failure into a sentence for the user, never the raw (English) server message. */
export function creationErrorMessage(error: unknown, messages: CreationErrorMessages): string {
    if (error instanceof Error && error.message === messages.addToFolder) {
        return messages.addToFolder;
    }
    const cause: unknown = error instanceof Error ? error.cause : undefined;
    const errcode = typeof cause === "object" && cause !== null && "errcode" in cause ? cause.errcode : undefined;
    if (errcode === "M_FORBIDDEN") {
        return messages.forbidden;
    }
    if (errcode === "M_LIMIT_EXCEEDED") {
        return messages.rateLimited;
    }
    return messages.generic;
}
