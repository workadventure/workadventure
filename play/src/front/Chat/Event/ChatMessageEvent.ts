import { z } from "zod";
import { isPlayer } from "./Player";

export const isAddChatMessageEvent = z.object({
    type: z.number(),
    date: z.any(),
    author: z.nullable(isPlayer),
    name: z.optional(z.nullable(z.string())),
    targets: z.undefined(z.array(isPlayer)),
    text: z.nullable(z.array(z.string())),
});

export type JoinMucEvent = z.infer<typeof isAddChatMessageEvent>;
