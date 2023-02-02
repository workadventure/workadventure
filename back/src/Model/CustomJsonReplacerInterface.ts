import { z } from "zod";

export const CustomJsonReplacerInterface = z.object({
    customJsonReplacer: z.function().args(z.unknown(), z.unknown()).returns(z.string().optional()),
});

export type CustomJsonReplacerInterface = z.infer<typeof CustomJsonReplacerInterface>;
