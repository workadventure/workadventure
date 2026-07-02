import { FilterType } from "@workadventure/messages";
import { EventProcessor } from "./EventProcessor";

export const eventProcessor = new EventProcessor();

// Only admins or speakers (and anyone in an ALL_USERS proximity space, where everyone already speaks) may
// give/revoke the floor. This protects the direct speaker-promotion in megaphone spaces from being abused.
const assertCanManageFloor = (
    sender: { tags: string[]; megaphoneState: boolean } | undefined,
    filterType: FilterType | undefined,
): void => {
    if (!sender) {
        throw new Error("Sender not found");
    }
    const isProximity = filterType === FilterType.ALL_USERS;
    if (!isProximity && !sender.tags.includes("admin") && !sender.megaphoneState) {
        throw new Error("Only admins or speakers can give or revoke the floor");
    }
};

eventProcessor.registerPrivateEventProcessor("giveFloor", (event, sender, filterType) => {
    assertCanManageFloor(sender, filterType);
    return event;
});

eventProcessor.registerPrivateEventProcessor("revokeFloor", (event, sender, filterType) => {
    assertCanManageFloor(sender, filterType);
    return event;
});

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
