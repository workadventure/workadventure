import { z } from "zod";

export const isMucRoomDefinition = z.object({
    name: z.optional(z.string()),
    uri: z.optional(z.string()),
});
export type MucRoomDefinitionInterface = z.infer<typeof isMucRoomDefinition>;
