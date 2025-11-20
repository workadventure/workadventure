import { z } from "zod";

export const IceServer = z.object({
    urls: z.string().array(),
    username: z.string().optional(),
    credential: z.string().optional(),
    credentialType: z.enum(["password", "oauth"]).optional(),
});

export type IceServer = z.infer<typeof IceServer>;
