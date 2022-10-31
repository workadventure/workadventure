import { z } from "zod";

/*
 * WARNING! The original file is in /messages/JsonMessages.
 * All other files are automatically copied from this file on container startup / build
 */

export const isRegisterData = z.object({
    roomUrl: z.string(),
    email: z.string().nullable(),
    organizationMemberToken: z.string().nullable(),
    mapUrlStart: z.string(),
    userUuid: z.string(),
    authToken: z.string(),
    messages: z.optional(z.array(z.unknown())),
});

export type RegisterData = z.infer<typeof isRegisterData>;
