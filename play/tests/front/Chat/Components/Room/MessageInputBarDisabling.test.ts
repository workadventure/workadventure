import { describe, expect, it } from "vitest";
import {
    canAttachFiles,
    shouldDisableMessageInput,
    shouldDisableSendButton,
} from "../../../../../src/front/Chat/Components/Room/MessageInputBarDisabling";

describe("shouldDisableMessageInput", () => {
    it("disables non-default proximity room input while left and enables it after rejoin", () => {
        expect(
            shouldDisableMessageInput({
                isProximityChatRoom: true,
                isDefaultProximityRoom: false,
                isProximityChatDisabled: false,
                isProximityRoomJoined: false,
                disabled: false,
            }),
        ).toBe(true);

        expect(
            shouldDisableMessageInput({
                isProximityChatRoom: true,
                isDefaultProximityRoom: false,
                isProximityChatDisabled: false,
                isProximityRoomJoined: true,
                disabled: false,
            }),
        ).toBe(false);
    });

    it("keeps the default proximity room input governed by the legacy disabled flags", () => {
        expect(
            shouldDisableMessageInput({
                isProximityChatRoom: true,
                isDefaultProximityRoom: true,
                isProximityChatDisabled: false,
                isProximityRoomJoined: false,
                disabled: false,
            }),
        ).toBe(false);
    });

    it("disables the send button when the message input is disabled", () => {
        expect(
            shouldDisableSendButton({
                isMessageInputDisabled: true,
                applicationPropertyInProcessing: false,
            }),
        ).toBe(true);
    });

    it("allows attaching files only when uploads are enabled, outside the proximity chat, with send rights", () => {
        expect(canAttachFiles({ isUploadEnabled: true, isProximityChatRoom: false, canSendMessages: true })).toBe(true);
        expect(canAttachFiles({ isUploadEnabled: false, isProximityChatRoom: false, canSendMessages: true })).toBe(
            false,
        );
        expect(canAttachFiles({ isUploadEnabled: true, isProximityChatRoom: true, canSendMessages: true })).toBe(false);
        expect(canAttachFiles({ isUploadEnabled: true, isProximityChatRoom: false, canSendMessages: false })).toBe(
            false,
        );
    });
});
