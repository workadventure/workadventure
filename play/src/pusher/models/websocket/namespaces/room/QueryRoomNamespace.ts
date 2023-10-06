import { z } from "zod";

export const QueryRoomNamespace = z.object({
    roomId: z.string(),
    token: z.string().optional(),
    name: z.string(),
    characterTextureIds: z.union([z.string(), z.string().array()]),
    x: z.coerce.number(),
    y: z.coerce.number(),
    top: z.coerce.number(),
    bottom: z.coerce.number(),
    left: z.coerce.number(),
    right: z.coerce.number(),
    companionTextureId: z.string().optional(),
    availabilityStatus: z.coerce.number(),
    lastCommandId: z.string().optional(),
    version: z.string(),
});

export type QueryRoomNamespace = z.infer<typeof QueryRoomNamespace>;
