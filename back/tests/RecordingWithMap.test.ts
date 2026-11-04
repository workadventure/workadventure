import { describe, expect, it, vi } from "vitest";
import { FilterType, SpaceUser } from "@workadventure/messages";
import { emptySpaceState } from "@workadventure/shared-utils";
import { LivekitCommunicationStrategy } from "../src/Model/Strategies/LivekitCommunicationStrategy";
import type { ICommunicationSpace } from "../src/Model/Interfaces/ICommunicationSpace";
import type * as EnvironmentVariable from "../src/Enum/EnvironmentVariable";

const env = vi.hoisted(() => ({ withMap: true }));

vi.mock("../src/Enum/EnvironmentVariable", async (importOriginal) => ({
    ...(await importOriginal<typeof EnvironmentVariable>()),
    get LIVEKIT_RECORDING_WITH_MAP() {
        return env.withMap;
    },
}));

const WORLD = "http://play.example.com";

async function startRecording(withMap: boolean): Promise<unknown> {
    const space = {
        world: WORLD,
        getSpaceName: () => `${WORLD}.meeting-room`,
        filterType: FilterType.ALL_USERS,
        getState: () => emptySpaceState(),
    } as unknown as ICommunicationSpace;
    const livekitService = {
        startRecording: vi.fn().mockResolvedValue({ egressId: "EG_1", roomName: "room" }),
    };
    const strategy = new LivekitCommunicationStrategy(space, livekitService as never);
    (strategy as unknown as { createRoomPromise: Promise<void> }).createRoomPromise = Promise.resolve();

    const user = SpaceUser.fromPartial({ spaceUserId: "room_1", uuid: "uuid-1", playUri: `${WORLD}/~/office.wam` });
    await strategy.startRecording(user, "session-1", withMap);
    return livekitService.startRecording.mock.calls[0][4];
}

describe("Recording over the map", () => {
    it("films the map only when the user asked for it", async () => {
        env.withMap = true;
        expect(await startRecording(false)).toBeUndefined();
        const url = new URL(String(await startRecording(true)));
        expect(url.pathname).toBe("/~/office.wam");
        expect(url.searchParams.get("space")).toBe("meeting-room");
    });

    it("ignores the request when the server does not allow it", async () => {
        env.withMap = false;
        expect(await startRecording(true)).toBeUndefined();
    });
});
