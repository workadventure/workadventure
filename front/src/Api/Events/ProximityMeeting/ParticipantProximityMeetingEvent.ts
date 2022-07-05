import { z } from "zod";
import { isProximityMeetingPlayer } from "./ProximityMeetingPlayer";

export const isParticipantProximityMeetingEvent = z.object({
    user: isProximityMeetingPlayer,
});

export type ParticipantProximityMeetingEvent = z.infer<typeof isParticipantProximityMeetingEvent>;
