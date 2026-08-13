import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearDrainableServices, registerDrainableService, runDrains } from "../../src/pusher/services/ShutdownDrains";

describe("ShutdownDrains", () => {
    beforeEach(() => {
        clearDrainableServices();
    });

    afterEach(() => {
        clearDrainableServices();
    });

    it("drains everything registered and stops each one", async () => {
        const first = { drain: vi.fn().mockResolvedValue(undefined), stop: vi.fn() };
        const second = { drain: vi.fn().mockResolvedValue(undefined), stop: vi.fn() };
        registerDrainableService({ name: "first", ...first });
        registerDrainableService({ name: "second", ...second });

        await runDrains(20_000);

        expect(first.drain).toHaveBeenCalledWith(20_000);
        expect(second.drain).toHaveBeenCalledWith(20_000);
        expect(first.stop).toHaveBeenCalledTimes(1);
        expect(second.stop).toHaveBeenCalledTimes(1);
    });

    it("does not start draining until runDrains is called", () => {
        // The version this replaced built an array of already-started promises, so
        // the drains began when the array was evaluated. Registering must only
        // record the callback, or a service registered at import time would start
        // flushing while the process is still serving.
        const service = { drain: vi.fn().mockResolvedValue(undefined), stop: vi.fn() };
        registerDrainableService({ name: "not-yet", ...service });

        expect(service.drain).not.toHaveBeenCalled();
    });

    it("keeps draining the others when one fails, and names the one that did", async () => {
        // A failed flush is a lost buffer, not a reason to skip the remaining
        // flushes — on SIGTERM every one of them is the last chance that service
        // gets.
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const failing = { drain: vi.fn().mockRejectedValue(new Error("admin unreachable")), stop: vi.fn() };
        const healthy = { drain: vi.fn().mockResolvedValue(undefined), stop: vi.fn() };
        registerDrainableService({ name: "the failing queue", ...failing });
        registerDrainableService({ name: "the healthy queue", ...healthy });

        await expect(runDrains(1_000)).resolves.toBeUndefined();

        expect(healthy.drain).toHaveBeenCalledTimes(1);
        // Stopped even though its drain threw: the timers have to be released or
        // the process will not exit.
        expect(failing.stop).toHaveBeenCalledTimes(1);
        expect(consoleError).toHaveBeenCalledWith(
            "Error while draining the failing queue during shutdown",
            expect.any(Error),
        );

        consoleError.mockRestore();
    });

    it("resolves immediately when nothing is registered", async () => {
        await expect(runDrains(1_000)).resolves.toBeUndefined();
    });
});
