import { z } from "zod";

export const isRemotePlayerInitializer = z.object({
    id: z.number(),
    uuid: z.string(),
    name: z.string(),
});

export type RemotePlayerInitializer = z.infer<typeof isRemotePlayerInitializer>;
