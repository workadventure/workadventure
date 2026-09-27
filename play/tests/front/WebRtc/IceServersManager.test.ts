import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/front/Enum/EnvironmentVariable", () => ({ TURN_CREDENTIALS_RENEWAL_TIME: 1_000 }));

const RENEWAL_TIME = 1_000;

import { iceServersManager } from "../../../src/front/WebRtc/IceServersManager";

function iceServersAnswer(username: string) {
    return { iceServers: [{ urls: ["turn:turn.example.com:3478"], username, credential: "secret" }] };
}

describe("IceServersManager", () => {
    afterEach(() => {
        iceServersManager.finalize();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("queries fresh credentials at each renewal instead of serving the cached set", async () => {
        vi.useFakeTimers();
        const queryIceServers = vi
            .fn()
            .mockResolvedValueOnce(iceServersAnswer("first"))
            .mockResolvedValueOnce(iceServersAnswer("second"));

        iceServersManager.init({ queryIceServers } as never);

        expect((await iceServersManager.getIceServersConfig())[0].username).toBe("first");

        await vi.advanceTimersByTimeAsync(RENEWAL_TIME);

        expect(queryIceServers).toHaveBeenCalledTimes(2);
        expect((await iceServersManager.getIceServersConfig())[0].username).toBe("second");
    });

    it("keeps serving the previous credentials while a renewal is in flight", async () => {
        vi.useFakeTimers();
        let resolveSecond: (value: unknown) => void = () => {};
        const queryIceServers = vi
            .fn()
            .mockResolvedValueOnce(iceServersAnswer("first"))
            .mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        resolveSecond = resolve;
                    }),
            );

        iceServersManager.init({ queryIceServers } as never);
        await iceServersManager.getIceServersConfig();

        await vi.advanceTimersByTimeAsync(RENEWAL_TIME);

        expect((await iceServersManager.getIceServersConfig())[0].username).toBe("first");
        resolveSecond(iceServersAnswer("second"));
        await vi.advanceTimersByTimeAsync(0);
        expect((await iceServersManager.getIceServersConfig())[0].username).toBe("second");
    });
});
