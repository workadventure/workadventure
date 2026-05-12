import { readable } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import {
    hasChatRoomPollCreation,
    type ChatPollCreationCapability,
    type ChatRoom,
} from "../../../../src/front/Chat/Connection/ChatConnection";

describe("hasChatRoomPollCreation", () => {
    it("rejects rooms without poll creation capability", () => {
        expect(hasChatRoomPollCreation({} as ChatRoom)).toBe(false);
    });

    it("accepts rooms exposing the generic poll creation capability", () => {
        const pollCreation: ChatPollCreationCapability = {
            canCreate: readable(true),
            supportedKinds: ["open"],
            limits: {
                questionMaxLength: 340,
                answerMaxLength: 340,
                minAnswers: 2,
                maxAnswers: 20,
            },
            create: vi.fn(),
        };
        const room = { pollCreation } as unknown as ChatRoom;

        expect(hasChatRoomPollCreation(room)).toBe(true);

        if (hasChatRoomPollCreation(room)) {
            expect(room.pollCreation.supportedKinds).toEqual(["open"]);
        }
    });
});
