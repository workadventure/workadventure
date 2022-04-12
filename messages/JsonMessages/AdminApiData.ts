import { z } from "zod";

/*
 * WARNING! The original file is in /messages/JsonMessages.
 * All other files are automatically copied from this file on container startup / build
 */

export const isAdminApiData = z.object({
    userUuid: z.string(),
    email: z.nullable(z.string()),
    roomUrl: z.string(),
    mapUrlStart: z.string(),
    messages: z.optional(z.array(z.unknown())),
});

export type AdminApiData = z.infer<typeof isAdminApiData>;
