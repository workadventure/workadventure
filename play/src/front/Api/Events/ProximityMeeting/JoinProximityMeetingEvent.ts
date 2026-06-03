import { z } from "zod";
import { isAddPlayerEvent } from "../AddPlayerEvent";

export const isJoinProximityMeetingEvent = z.object({
    users: isAddPlayerEvent.array(),
    spaceName: z.string().optional(),
});

export type JoinProximityMeetingEvent = z.infer<typeof isJoinProximityMeetingEvent>;
