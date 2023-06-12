import { z } from "zod";

/*
 * WARNING! The original file is in /messages/JsonMessages.
 * All other files are automatically copied from this file on container startup / build
 */
const EmbeddableSuccessResponse = z.object({
    state: z.literal("success"),
    embeddable: z.boolean()
});

const EmbeddableErrorResponse = z.object({
    state: z.literal("error"),
    message: z.string().optional()
});

export const EmbeddableResponse = z.discriminatedUnion("state", [
    EmbeddableSuccessResponse,
    EmbeddableErrorResponse
]);

export type EmbeddableResponse = z.infer<typeof EmbeddableResponse>;