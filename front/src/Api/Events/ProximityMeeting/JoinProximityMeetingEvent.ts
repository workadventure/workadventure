import { z } from "zod";
import { isProximityMeetingPlayer } from "./ProximityMeetingPlayer";

export const isJoinProximityMeetingEvent = z.object({
    users: isProximityMeetingPlayer.array(),
});

export type JoinProximityMeetingEvent = z.infer<typeof isJoinProximityMeetingEvent>;
