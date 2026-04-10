import { EventProcessor } from "./EventProcessor";

export const eventProcessor = new EventProcessor();

eventProcessor.registerPublicEventProcessor("spaceMessage", (event, senderId, space) => {
    if (event.$case !== "spaceMessage") {
        // FIXME: improve the typing of the method to avoid this
        throw new Error("Invalid event type");
    }

    const sender = space.getUser(senderId);

    if (!sender) {
        throw new Error("Sender not found");
    }

    return Promise.resolve({
        $case: "spaceMessage",
        spaceMessage: {
            message: event.spaceMessage.message,
            characterTextures: sender.characterTextures,
            name: sender.name,
        },
    });
});

eventProcessor.registerPublicEventProcessor("spaceIsTyping", (event, senderId, space) => {
    if (event.$case !== "spaceIsTyping") {
        // FIXME: improve the typing of the method to avoid this
        throw new Error("Invalid event type");
    }

    const sender = space.getUser(senderId);

    if (!sender) {
        throw new Error("Sender not found");
    }

    return Promise.resolve({
        $case: "spaceIsTyping",
        spaceIsTyping: {
            isTyping: event.spaceIsTyping.isTyping,
            characterTextures: sender.characterTextures,
            name: sender.name,
        },
    });
});
