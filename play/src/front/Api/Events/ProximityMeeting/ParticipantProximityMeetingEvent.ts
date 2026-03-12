import { z } from "zod";
import { isAddPlayerEvent } from "../AddPlayerEvent.ts";

export const isParticipantProximityMeetingEvent = z.object({
    user: isAddPlayerEvent,
});

export type ParticipantProximityMeetingEvent = z.infer<typeof isParticipantProximityMeetingEvent>;
