import type { PrivateSpaceEvent } from "@workadventure/messages";

type CorePrivateEvent = NonNullable<PrivateSpaceEvent["event"]>;

/**
 * The private events a moderator sends to another user of a conversation (videobox menu, moderation modal).
 * The pusher cannot tell who moderates a meeting room (the admin tag lives in the WAM), so the back decides.
 */
export function isModerationEvent(event: CorePrivateEvent | undefined): event is CorePrivateEvent {
    return event?.$case === "muteAudio" || event?.$case === "muteVideo" || event?.$case === "kickOffUser";
}

/**
 * Applies the sender's moderation rights to a moderation event: a moderator mutes for real, anybody else only
 * asks to mute; only a moderator can remove a user from the conversation (undefined = drop the event).
 * `force` is always overwritten, so a client cannot force a mute by sending `force: true` itself.
 */
export function applyModerationRights(event: CorePrivateEvent, canModerate: boolean): CorePrivateEvent | undefined {
    switch (event.$case) {
        case "muteAudio":
            return { $case: "muteAudio", muteAudio: { ...event.muteAudio, force: canModerate } };
        case "muteVideo":
            return { $case: "muteVideo", muteVideo: { ...event.muteVideo, force: canModerate } };
        case "kickOffUser":
            return canModerate ? event : undefined;
        default:
            return event;
    }
}
