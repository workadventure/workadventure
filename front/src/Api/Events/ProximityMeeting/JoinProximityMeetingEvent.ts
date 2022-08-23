import { z } from "zod";
import { isAddPlayerEvent } from "../AddPlayerEvent";

export const isJoinProximityMeetingEvent = z.object({
    users: isAddPlayerEvent.array(),
});

export type JoinProximityMeetingEvent = z.infer<typeof isJoinProximityMeetingEvent>;
