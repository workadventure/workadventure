import { z } from "zod";

export const isProximityMeetingPlayer = z.object({
    userId: z.number(),
    userUuid: z.string(),
    name: z.string(),
});

export type ProximityMeetingPlayer = z.infer<typeof isProximityMeetingPlayer>;
