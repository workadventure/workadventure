import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { SpaceUser } from "@workadventure/messages";
import { eventProcessor } from "../src/Model/EventProcessorInit";
import type { Space } from "../src/Model/Space";

describe("EventProcessorInit", () => {
    const space = mock<Space>({
        getUser: () => SpaceUser.fromPartial({ spaceUserId: "sender", name: "Real name" }),
    });

    it("keeps the id and the quote of a proximity message, and takes the name from the sender", async () => {
        const event = await eventProcessor.processPublicEvent(
            {
                $case: "spaceMessage",
                spaceMessage: {
                    message: "Agreed",
                    characterTextures: [],
                    name: "Spoofed name",
                    id: "message-2",
                    quote: { messageId: "message-1", excerpt: "Lunch at noon?", senderName: "Alice" },
                },
            },
            "sender",
            space,
        );

        expect(event).toEqual({
            $case: "spaceMessage",
            spaceMessage: {
                message: "Agreed",
                characterTextures: [],
                name: "Real name",
                id: "message-2",
                quote: { messageId: "message-1", excerpt: "Lunch at noon?", senderName: "Alice" },
            },
        });
    });

    it("relays a reaction untouched", async () => {
        const reaction = {
            $case: "spaceMessageReaction" as const,
            spaceMessageReaction: { messageId: "message-1", reaction: "👍", added: true },
        };

        expect(await eventProcessor.processPublicEvent(reaction, "sender", space)).toEqual(reaction);
    });
});
