import { describe, expect, it, vi } from "vitest";
import { AccessToken } from "livekit-server-sdk";
import { JoinRoomMessage, PositionMessage_Direction } from "@workadventure/messages";
import { GameRoom } from "../src/Model/GameRoom";
import type { User, UserSocket } from "../src/Model/User";
import type { Group } from "../src/Model/Group";
import type { RoomSocket } from "../src/RoomManager";
import type { EmoteCallback } from "../src/Model/Zone";
import type * as EnvironmentVariable from "../src/Enum/EnvironmentVariable";
import { mintRecorderToken, recorderPageUrl } from "../src/Services/RecorderToken";

const API_KEY = "devkey";
const API_SECRET = "recorder_test_secret_recorder_test";

vi.mock("../src/Enum/EnvironmentVariable", async (importOriginal) => ({
    ...(await importOriginal<typeof EnvironmentVariable>()),
    LIVEKIT_API_KEY: "devkey",
    LIVEKIT_API_SECRET: "recorder_test_secret_recorder_test",
}));

const emote: EmoteCallback = () => {};

function createWorld(
    onConnect: (user: User, group: Group) => void,
    onDisconnect: (user: User, group: Group) => void = () => {},
): Promise<GameRoom> {
    return GameRoom.create(
        "https://play.workadventu.re/_/global/localhost/test.json",
        onConnect,
        onDisconnect,
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

const socket = () => ({ write: vi.fn().mockReturnValue(true), end: vi.fn() }) as unknown as UserSocket;

function join(uuid: string, x: number, recorderToken?: string): JoinRoomMessage {
    return JoinRoomMessage.fromPartial({
        userUuid: uuid,
        name: uuid,
        positionMessage: { x, y: 100, direction: PositionMessage_Direction.DOWN, moving: false },
        recorderToken,
    });
}

async function token(recorder: boolean, secret = API_SECRET): Promise<string> {
    const accessToken = new AccessToken(API_KEY, secret, { identity: "EG_test" });
    accessToken.addGrant({ room: "room", roomJoin: true, canSubscribe: true, hidden: true, recorder });
    return accessToken.toJwt();
}

describe("GameRoom recorder", () => {
    it("keeps a recorder out of every zone and bubble", async () => {
        let connections = 0;
        const world = await createWorld(() => connections++);

        const recorder = await world.join(socket(), join("recorder", 100, await token(true)));
        expect(recorder.isRecorder).toBe(true);

        // A user right next to the recorder: no bubble with it.
        const alice = await world.join(socket(), join("alice", 101));
        expect(connections).toBe(0);
        expect(alice.group).toBeUndefined();

        // Whoever watches the zone sees Alice, never the recorder.
        const watched = world.addZoneListener({} as RoomSocket, 0, 0);
        expect([...watched]).toEqual([alice]);

        world.leave(recorder);
        expect(world.isEmpty()).toBe(false);
    });

    it("follows one person in and out of their bubbles, whichever bubble it is", async () => {
        const events: string[] = [];
        const world = await createWorld(
            (user, group) => events.push(`${user.uuid} joins ${group.getId()}`),
            (user, group) => events.push(`${user.uuid} leaves ${group.getId()}`),
        );

        const alice = await world.join(socket(), join("alice", 100));
        const bob = await world.join(socket(), join("bob", 101));
        const first = alice.group?.getId();
        // Joining while Alice is already in a bubble puts the recorder in it.
        const recorder = await world.join(socket(), join("recorder", 500, await mintRecorderToken("alice")));
        world.startFollowing(recorder);
        expect(events).toContain(`recorder joins ${first}`);

        // The bubble breaks up, and Alice forms a new one with Carol: the recorder moves with her.
        world.leave(bob);
        const carol = await world.join(socket(), join("carol", 102));
        const second = alice.group?.getId();
        expect(second).not.toBe(first);
        expect(events.filter((event) => event.startsWith("recorder"))).toEqual([
            `recorder joins ${first}`,
            `recorder leaves ${first}`,
            `recorder joins ${second}`,
        ]);
        expect(carol.group?.getId()).toBe(second);
    });

    it("refuses a token without the recorder grant or signed with another secret", async () => {
        const world = await createWorld(() => {});
        await expect(world.join(socket(), join("spy", 100, await token(false)))).rejects.toThrow("recorder grant");
        await expect(
            world.join(socket(), join("spy", 100, await token(true, "another_secret_another_secret_xx"))),
        ).rejects.toThrow();
    });
});

describe("recorderPageUrl", () => {
    it("opens the recording user's map in recorder mode, on the local name of the space", () => {
        const world = "http://play.example.com";
        const url = new URL(
            recorderPageUrl(
                "http://play.example.com/~/office.wam?foo=1#moveTo=Desk",
                world,
                `${world}.http://play.example.com/~/office.wam#8#1793805819841`,
                0,
            ),
        );
        expect(url.origin + url.pathname).toBe("http://play.example.com/~/office.wam");
        expect(url.hash).toBe("");
        expect(url.searchParams.has("recorder")).toBe(true);
        expect(url.searchParams.has("foo")).toBe(false);
        expect(url.searchParams.get("space")).toBe("http://play.example.com/~/office.wam#8#1793805819841");
        expect(url.searchParams.get("filter")).toBe("0");
    });
});
