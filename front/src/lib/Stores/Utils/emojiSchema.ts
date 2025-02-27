import { z } from "zod";

export const isEmoji = z.object({
    emoji: z.string(),
    name: z.string(),
});

export const arrayEmoji = z.array(isEmoji);

export type Emoji = z.infer<typeof isEmoji>;
