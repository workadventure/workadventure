import { EventProcessor } from "./EventProcessor";

export const eventProcessor = new EventProcessor();

eventProcessor.registerPublicEventProcessor("muteAudioForEverybody", (event, sender) => {
    if (!sender.tags.includes("admin")) {
        throw new Error("Only admins can mute everyone");
    }
    return event;
});

eventProcessor.registerPublicEventProcessor("muteVideoForEverybody", (event, sender) => {
    if (!sender.tags.includes("admin")) {
        throw new Error("Only admins can mute everyone");
    }
    return event;
});

eventProcessor.registerPrivateEventProcessor("muteAudio", (event, sender, receiver) => {
    if (event.$case !== "muteAudio") {
        // FIXME: improve the typing of the method to avoid this
        throw new Error("Invalid event type");
    }
    if (sender.tags.includes("admin")) {
        event.muteAudio.force = true;
    }

    return event;
});

eventProcessor.registerPrivateEventProcessor("muteVideo", (event, sender, receiver) => {
    if (event.$case !== "muteVideo") {
        // FIXME: improve the typing of the method to avoid this
        throw new Error("Invalid event type");
    }
    if (sender.tags.includes("admin")) {
        event.muteVideo.force = true;
    }

    return event;
});
