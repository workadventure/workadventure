import { z } from "zod";

export const NodeError = z.object({
    name: z.string(),
    message: z.string(),
    stack: z.string().optional(),
    code: z.union([z.string(), z.number()]).optional(),
});
