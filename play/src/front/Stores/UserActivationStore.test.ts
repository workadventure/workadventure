// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserActivationManager } from "./UserActivationStore";

describe("UserActivationManager", () => {
    const originalUserActivationDescriptor = Object.getOwnPropertyDescriptor(navigator, "userActivation");

    beforeEach(() => {
        if (originalUserActivationDescriptor) {
            Object.defineProperty(navigator, "userActivation", originalUserActivationDescriptor);
        } else {
            // navigator.userActivation is not defined in jsdom by default
            Reflect.deleteProperty(navigator, "userActivation");
        }
    });

    afterEach(() => {
        if (originalUserActivationDescriptor) {
            Object.defineProperty(navigator, "userActivation", originalUserActivationDescriptor);
        } else {
            Reflect.deleteProperty(navigator, "userActivation");
        }
    });

    it("resolves immediately when the activation API is unavailable", async () => {
        const manager = new UserActivationManager();
        const onActivated = vi.fn();

        await manager.waitForUserActivation().then(onActivated);

        expect(onActivated).toHaveBeenCalledOnce();
    });

    it("resolves immediately when the browser already reports activation", async () => {
        Object.defineProperty(navigator, "userActivation", {
            configurable: true,
            value: {
                hasBeenActive: true,
            },
        });

        const manager = new UserActivationManager();
        const onActivated = vi.fn();

        await manager.waitForUserActivation().then(onActivated);

        expect(onActivated).toHaveBeenCalledOnce();
    });

    it("polls until the browser reports activation", async () => {
        vi.useFakeTimers();

        try {
            const userActivation = {
                hasBeenActive: false,
            };

            Object.defineProperty(navigator, "userActivation", {
                configurable: true,
                value: userActivation,
            });

            const manager = new UserActivationManager();
            const onActivated = vi.fn();

            const activationPromise = manager.waitForUserActivation().then(onActivated);

            await vi.advanceTimersByTimeAsync(500);
            expect(onActivated).not.toHaveBeenCalled();

            userActivation.hasBeenActive = true;
            await vi.advanceTimersByTimeAsync(500);
            await activationPromise;

            expect(onActivated).toHaveBeenCalledOnce();
        } finally {
            vi.useRealTimers();
        }
    });
});
