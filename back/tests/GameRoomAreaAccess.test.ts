import { afterEach, describe, expect, it, vi } from "vitest";
import { JoinRoomMessage, PositionMessage_Direction, RoomJoinedMessage } from "@workadventure/messages";
import { mapFetcher } from "@workadventure/map-editor/src/MapFetcher";
import type { AreaData, WAMFileFormat } from "@workadventure/map-editor";
import { GameRoom } from "../src/Model/GameRoom";
import { Point } from "../src/Model/Websocket/MessageUserPosition";
import type { User, UserSocket } from "../src/Model/User";
import type { EmoteCallback } from "../src/Model/Zone";

const ROOM_URL = "https://play.workadventu.re/_/global/localhost/test.json";
const emote: EmoteCallback = () => {};

// Restricted area occupying x ∈ [100, 200], y ∈ [100, 200], readable/writable by "member" only.
const RESTRICTED_AREA: AreaData = {
    id: "restricted",
    name: "Restricted",
    x: 100,
    y: 100,
    width: 100,
    height: 100,
    visible: true,
    properties: [
        {
            id: "rights",
            type: "restrictedRightsPropertyData",
            writeTags: ["member"],
            readTags: ["member"],
        },
    ],
};
// A point well inside the area (the Woka Y offset keeps it inside), and a point clearly outside.
const INSIDE = { x: 150, y: 150 };
const OUTSIDE = { x: 300, y: 300 };

function createWam(areas: AreaData[]): WAMFileFormat {
    return {
        version: "1",
        mapUrl: "https://example.com/maps/test.tmj",
        entities: {},
        areas,
        entityCollections: [],
        settings: {},
    };
}

function createMockUserSocket() {
    const write = vi.fn().mockReturnValue(true);
    const end = vi.fn();
    return { socket: { write, end } as unknown as UserSocket, write, end };
}

function isServerMessageChunk(chunk: unknown): chunk is { message: { $case: string } } {
    return typeof chunk === "object" && chunk !== null && "message" in chunk;
}

function writtenMessageCases(socket: ReturnType<typeof createMockUserSocket>): string[] {
    return socket.write.mock.calls
        .map((call): unknown => call[0])
        .filter(isServerMessageChunk)
        .map((chunk) => chunk.message.$case);
}

function joinMessage(uuid: string, x: number, y: number, opts?: { tags?: string[]; canEdit?: boolean }): JoinRoomMessage {
    return JoinRoomMessage.fromPartial({
        userUuid: uuid,
        IPAddress: "10.0.0.2",
        name: "foo",
        positionMessage: { x, y, direction: PositionMessage_Direction.DOWN, moving: false },
        tag: opts?.tags ?? [],
        canEdit: opts?.canEdit ?? false,
    });
}

// Flips the user into the "room joined" state so that later writes go straight to the socket.
function flushPendingMessages(user: User): void {
    user.write({
        $case: "roomJoinedMessage",
        roomJoinedMessage: RoomJoinedMessage.fromPartial({ currentUserId: user.id }),
    });
}

async function createRoomWithRestrictedArea(): Promise<GameRoom> {
    vi.spyOn(
        GameRoom as unknown as { getMapDetails(roomUrl: string): Promise<unknown> },
        "getMapDetails",
    ).mockResolvedValue({
        mapUrl: undefined,
        wamUrl: "http://map-storage.test/test.wam",
        editable: false,
        group: null,
        thirdParty: undefined,
        authenticationMandatory: null,
        showPoweredBy: true,
        enableChat: true,
        enableChatUpload: true,
    });
    vi.spyOn(mapFetcher, "fetchWamFile").mockResolvedValue(createWam([RESTRICTED_AREA]));

    return GameRoom.create(
        ROOM_URL,
        () => {},
        () => {},
        160,
        160,
        () => {},
        () => {},
        () => {},
        emote,
        () => {},
        () => {},
        () => {},
    );
}

describe("GameRoom restricted-area enforcement", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("rejects a forbidden move from a tampered client and re-syncs it, without applying the position", async () => {
        const world = await createRoomWithRestrictedArea();
        const socket = createMockUserSocket();
        // A user without the "member" tag, spawned outside the area.
        const user = await world.join(socket.socket, joinMessage("hacker", OUTSIDE.x, OUTSIDE.y));
        flushPendingMessages(user);

        // Simulate a tampered client sending a position inside the restricted area.
        world.updatePosition(user, new Point(INSIDE.x, INSIDE.y));

        // The server did not apply the illegal position...
        expect(world.isPositionAllowedForUser(user, user.getPosition())).toBe(true);
        expect({ x: user.getPosition().x, y: user.getPosition().y }).toEqual(OUTSIDE);
        // ...and it re-synced the client with a correction.
        expect(writtenMessageCases(socket)).toContain("moveToPositionMessage");
    });

    it("applies a move for a user who has the required tag", async () => {
        const world = await createRoomWithRestrictedArea();
        const socket = createMockUserSocket();
        const user = await world.join(socket.socket, joinMessage("member", OUTSIDE.x, OUTSIDE.y, { tags: ["member"] }));

        world.updatePosition(user, new Point(INSIDE.x, INSIDE.y));

        expect({ x: user.getPosition().x, y: user.getPosition().y }).toEqual(INSIDE);
    });

    it("lets map editors move freely into a restricted area", async () => {
        const world = await createRoomWithRestrictedArea();
        const socket = createMockUserSocket();
        const user = await world.join(socket.socket, joinMessage("editor", OUTSIDE.x, OUTSIDE.y, { canEdit: true }));

        world.updatePosition(user, new Point(INSIDE.x, INSIDE.y));

        expect({ x: user.getPosition().x, y: user.getPosition().y }).toEqual(INSIDE);
    });

    it("does not let a user without access spawn inside a restricted area", async () => {
        const world = await createRoomWithRestrictedArea();
        const socket = createMockUserSocket();
        // The user tries to join with a spawn position inside the restricted area.
        const user = await world.join(socket.socket, joinMessage("hacker", INSIDE.x, INSIDE.y));

        // The spawn was moved to an allowed position.
        expect(world.isPositionAllowedForUser(user, user.getPosition())).toBe(true);
        expect({ x: user.getPosition().x, y: user.getPosition().y }).not.toEqual(INSIDE);
    });
});
