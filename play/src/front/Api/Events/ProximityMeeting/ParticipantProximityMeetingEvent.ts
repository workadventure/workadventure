import { z } from "zod";
import { isAddPlayerEvent } from "../AddPlayerEvent";

export const isParticipantProximityMeetingEvent = z.object({
    user: isAddPlayerEvent,
    spaceName: z.string().optional(),
});

export type ParticipantProximityMeetingEvent = z.infer<typeof isParticipantProximityMeetingEvent>;
