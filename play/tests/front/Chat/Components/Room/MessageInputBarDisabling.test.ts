import { describe, expect, it } from "vitest";
import {
    shouldDisableMessageInput,
    shouldDisableSendButton,
} from "../../../../../src/front/Chat/Components/Room/MessageInputBarDisabling";

describe("shouldDisableMessageInput", () => {
    it("disables a proximity room input while left and enables it after rejoin", () => {
        expect(
            shouldDisableMessageInput({
                isProximityChatRoom: true,
                isProximityChatDisabled: false,
                isProximityRoomJoined: false,
                disabled: false,
            }),
        ).toBe(true);

        expect(
            shouldDisableMessageInput({
                isProximityChatRoom: true,
                isProximityChatDisabled: false,
                isProximityRoomJoined: true,
                disabled: false,
            }),
        ).toBe(false);
    });

    it("disables the default proximity room input once the bubble is left: nobody would receive the message", () => {
        expect(
            shouldDisableMessageInput({
                isProximityChatRoom: true,
                isProximityChatDisabled: false,
                isProximityRoomJoined: false,
                disabled: false,
            }),
        ).toBe(true);
    });

    it("disables the send button when the message input is disabled", () => {
        expect(
            shouldDisableSendButton({
                isMessageInputDisabled: true,
                applicationPropertyInProcessing: false,
            }),
        ).toBe(true);
    });
});
