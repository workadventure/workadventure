import { z } from "zod";
import { isAddPlayerEvent } from "../AddPlayerEvent";

export const isParticipantProximityMeetingEvent = z.object({
    user: isAddPlayerEvent,
});

export type ParticipantProximityMeetingEvent = z.infer<typeof isParticipantProximityMeetingEvent>;
