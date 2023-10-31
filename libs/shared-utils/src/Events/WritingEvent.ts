import { z } from "zod";

export const isStartWritingEvent = z.object({
    author: z.string().optional(),
});

export type StartWritingEvent = z.infer<typeof isStartWritingEvent>;

export const isStopWritingEvent = z.object({
    author: z.string().optional(),
});

export type StopWritingEvent = z.infer<typeof isStopWritingEvent>;
