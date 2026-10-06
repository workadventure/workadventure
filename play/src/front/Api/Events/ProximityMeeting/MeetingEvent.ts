import { z } from "zod";
import { isAddPlayerEvent } from "../AddPlayerEvent";
import { isAppendPCMDataEvent } from "./AppendPCMDataEvent";
import { isPlaySoundInBubbleEvent } from "./PlaySoundInBubbleEvent";
import { isStartStreamInBubbleEvent } from "./StartStreamInBubbleEvent";

export const isMeetingKind = z.enum(["default", "proximity", "meeting", "listener", "speaker", "area"]);

export const isMeetingIdEvent = z.object({
    meetingId: z.string(),
});

export const isJoinMeetingEvent = isMeetingIdEvent.extend({
    name: z.string(),
    kind: isMeetingKind,
    users: isAddPlayerEvent.array(),
});

export const isParticipantMeetingEvent = isMeetingIdEvent.extend({
    user: isAddPlayerEvent,
});

export const isPlaySoundInMeetingEvent = isPlaySoundInBubbleEvent.extend({
    meetingId: z.string(),
});

export const isStartStreamInMeetingEvent = isStartStreamInBubbleEvent.extend({
    meetingId: z.string(),
});

export const isAppendPCMDataToMeetingEvent = isAppendPCMDataEvent.extend({
    meetingId: z.string(),
});

export type MeetingKind = z.infer<typeof isMeetingKind>;
export type MeetingIdEvent = z.infer<typeof isMeetingIdEvent>;
export type JoinMeetingEvent = z.infer<typeof isJoinMeetingEvent>;
export type ParticipantMeetingEvent = z.infer<typeof isParticipantMeetingEvent>;
export type PlaySoundInMeetingEvent = z.infer<typeof isPlaySoundInMeetingEvent>;
export type StartStreamInMeetingEvent = z.infer<typeof isStartStreamInMeetingEvent>;
export type AppendPCMDataToMeetingEvent = z.infer<typeof isAppendPCMDataToMeetingEvent>;
