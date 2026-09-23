import { beforeEach, describe, expect, it, vi } from "vitest";

const { withinWindow, livekitAvailable, identities } = vi.hoisted(() => ({
    withinWindow: { value: true },
    livekitAvailable: { value: true },
    identities: { value: [] as string[] },
}));

vi.mock("../src/Model/Services/BackRestartWindow", () => ({
    isWithinBackRestartWindow: () => withinWindow.value,
}));
vi.mock("../src/Model/Services/LivekitAvailabilityService", () => ({
    LivekitAvailabilityService: class {
        isAvailable() {
            return livekitAvailable.value;
        }
    },
}));
const { roomHasLivekit } = vi.hoisted(() => ({ roomHasLivekit: { value: true } }));
vi.mock("../src/Model/Services/LivekitCredentials", () => ({
    getLivekitCredentialsIfAny: () =>
        Promise.resolve(
            roomHasLivekit.value
                ? { livekitHost: "http://livekit", livekitApiKey: "key", livekitApiSecret: "secret" }
                : undefined,
        ),
}));
vi.mock("../src/Model/Services/LivekitService", () => ({
    LiveKitService: class {
        participantIdentities(roomName: string) {
            expect(roomName).toBe("world.room#1#1");
            return Promise.resolve(identities.value);
        }
    },
}));

import { canResumeBubbleAfterRestart } from "../src/Model/Services/BubbleResume";

// The bubble name comes from the client: bringing a bubble back must never let anyone into a conversation they
// were not part of.
describe("canResumeBubbleAfterRestart", () => {
    const request = { spaceName: "room#1#1", world: "world", spaceUserId: "room_alice", playUri: "room" };

    beforeEach(() => {
        withinWindow.value = true;
        livekitAvailable.value = true;
        identities.value = [];
        roomHasLivekit.value = true;
    });

    it("allows a bubble of a room the admin gives no LiveKit server: it is P2P", async () => {
        roomHasLivekit.value = false;
        identities.value = ["room_bob"];
        expect(await canResumeBubbleAfterRestart(request)).toBe(true);
    });

    it("refuses once the back has been up for a while", async () => {
        withinWindow.value = false;
        expect(await canResumeBubbleAfterRestart(request)).toBe(false);
    });

    it("allows a P2P bubble when there is no LiveKit", async () => {
        livekitAvailable.value = false;
        expect(await canResumeBubbleAfterRestart(request)).toBe(true);
    });

    it("allows an empty LiveKit room: nothing to overhear", async () => {
        expect(await canResumeBubbleAfterRestart(request)).toBe(true);
    });

    it("allows a participant still connected to the room", async () => {
        identities.value = ["room_bob", "room_alice"];
        expect(await canResumeBubbleAfterRestart(request)).toBe(true);
    });

    it("refuses someone who is not in the room", async () => {
        identities.value = ["room_bob", "room_carol"];
        expect(await canResumeBubbleAfterRestart(request)).toBe(false);
    });
});
