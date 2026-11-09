import { describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";
import { MatrixEvent, RoomMember } from "matrix-js-sdk";
import type { MatrixClient } from "matrix-js-sdk";

vi.mock("../../../../src/front/Connection/LocalUserStore", () => ({ localUserStore: {} }));
vi.mock("../../../../src/front/Chat/Connection/Matrix/services/WaMatrixProfileService", () => ({
    resolveChatUserColor: () => undefined,
}));
vi.mock("../../../../src/front/Chat/Connection/Matrix/services/MatrixAvatarProfile", () => ({
    matrixAvatarProfile: { createLazyAvatarStore: () => ({ subscribe: () => () => {}, invalidate: () => {} }) },
}));

import { MatrixChatRoomMember } from "../../../../src/front/Chat/Connection/Matrix/MatrixChatRoomMember";

const typing = (...userIds: string[]) => new MatrixEvent({ type: "m.typing", content: { user_ids: userIds } });
const client = { getUser: () => null, getUserId: () => "@me:x" } as unknown as MatrixClient;

describe("MatrixChatRoomMember typing", () => {
    it("clears typing after a stop event", () => {
        const roomMember = new RoomMember("!r", "@bob:x");
        const member = new MatrixChatRoomMember(roomMember, "", client);
        roomMember.setTypingEvent(typing("@bob:x"));
        expect(get(member.isTypingInformation)).not.toBeNull();
        roomMember.setTypingEvent(typing());
        expect(get(member.isTypingInformation)).toBeNull();
    });

    it("shows a member who is already typing when created", () => {
        const roomMember = new RoomMember("!r", "@bob:x");
        roomMember.setTypingEvent(typing("@bob:x"));
        const member = new MatrixChatRoomMember(roomMember, "", client);
        expect(get(member.isTypingInformation)).not.toBeNull();
    });

    it("clears typing when the state is replaced (gappy sync) while typing", () => {
        const roomMember = new RoomMember("!r", "@bob:x");
        const member = new MatrixChatRoomMember(roomMember, "", client);
        roomMember.setTypingEvent(typing("@bob:x"));

        // refreshLiveTimeline / limited sync: a fresh RoomMember, typing=false, and the room calls rebind().
        const fresh = new RoomMember("!r", "@bob:x");
        member.rebind(fresh);
        // Bob stops typing: the SDK only emits RoomMember.typing on a change, and fresh.typing was already false.
        fresh.setTypingEvent(typing());

        expect(get(member.isTypingInformation)).toBeNull();
    });
});
