import { EventProcessor } from "./EventProcessor";

export const eventProcessor = new EventProcessor();

eventProcessor.registerPublicEventProcessor("muteAudioForEverybody", (event, sender) => {
    if (!sender || !sender.tags.includes("admin")) {
        throw new Error("Only admins can mute everyone");
    }
    return event;
});

eventProcessor.registerPublicEventProcessor("muteVideoForEverybody", (event, sender) => {
    if (!sender || !sender.tags.includes("admin")) {
        throw new Error("Only admins can mute everyone");
    }
    return event;
});

eventProcessor.registerPrivateEventProcessor("muteAudio", (event, sender) => {
    if (event.$case !== "muteAudio") {
        // FIXME: improve the typing of the method to avoid this
        throw new Error("Invalid event type");
    }

    if (!sender) {
        throw new Error("Sender not found");
    }

    if (sender.tags.includes("admin")) {
        event.muteAudio.force = true;
    }

    return event;
});

eventProcessor.registerPrivateEventProcessor("muteVideo", (event, sender) => {
    if (event.$case !== "muteVideo") {
        // FIXME: improve the typing of the method to avoid this
        throw new Error("Invalid event type");
    }

    if (!sender) {
        throw new Error("Sender not found");
    }

    if (sender.tags.includes("admin")) {
        event.muteVideo.force = true;
    }

    return event;
});

eventProcessor.registerPrivateEventProcessor("kickOffUser", (event, sender) => {
    if (!sender || !sender.tags.includes("admin")) {
        throw new Error("Only admins can kick off a user");
    }
    return event;
});

// Invitations to another map go through the world space, not the room, so the back's per-room limit
// (GameRoom.isMeetingInvitationRequestTooHigh) does not apply: cap them here, per sender, like the back does.
const MEETING_INVITATION_WINDOW_MS = 10 * 60 * 1000;
const MEETING_INVITATION_MAX_REQUESTS = 50;
// ponytail: per pusher and never pruned for senders who leave; a shared store if senders spread over pushers.
const meetingInvitationLogBySender = new Map<string, number[]>();

eventProcessor.registerPrivateEventProcessor("meetingInvitationRequest", (event, sender) => {
    if (!sender) {
        throw new Error("Sender not found");
    }
    if (sender.tags.includes("admin")) {
        return event;
    }
    const now = Date.now();
    const log = (meetingInvitationLogBySender.get(sender.uuid) ?? []).filter(
        (at) => at > now - MEETING_INVITATION_WINDOW_MS,
    );
    if (log.length >= MEETING_INVITATION_MAX_REQUESTS) {
        throw new Error("Too many meeting invitations");
    }
    log.push(now);
    meetingInvitationLogBySender.set(sender.uuid, log);
    return event;
});
