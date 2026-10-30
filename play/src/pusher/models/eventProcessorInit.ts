import { EventProcessor } from "./EventProcessor";

export const eventProcessor = new EventProcessor();

// muteAudio, muteVideo, kickOffUser and the two "for everybody" mutes are checked by the back
// (back/src/Model/ModerationRights.ts): a meeting room can grant moderation rights to a tag of its own
// (livekitRoomAdminTag), which only the back reads from the WAM.

eventProcessor.registerPrivateEventProcessor("proximityFileTransferOffer", (event, sender) => {
    if (event.$case !== "proximityFileTransferOffer") {
        throw new Error("Invalid event type");
    }

    if (!sender) {
        throw new Error("Sender not found");
    }

    return {
        $case: "proximityFileTransferOffer",
        proximityFileTransferOffer: {
            ...event.proximityFileTransferOffer,
            characterTextures: sender.characterTextures,
            name: sender.name,
        },
    };
});
