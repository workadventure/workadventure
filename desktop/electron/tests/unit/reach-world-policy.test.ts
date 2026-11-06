import { expect, test } from "vitest";
import { reachWorldDeadlineAction, reachWorldWatchdogStep } from "../../src/reach-world-policy";

test("reaching the world ends the watchdog, whatever the clock", () => {
    expect(reachWorldWatchdogStep({ inWorld: true, onboarding: false }, true)).toBe("reached");
    expect(reachWorldWatchdogStep({ inWorld: true, onboarding: true }, false)).toBe("reached");
});

test("a first-connection screen pauses the clock instead of letting it bounce the user", () => {
    expect(reachWorldWatchdogStep({ inWorld: false, onboarding: true }, true)).toBe("pause");
    expect(reachWorldWatchdogStep({ inWorld: false, onboarding: true }, false)).toBe("none");
});

test("leaving those screens starts the clock again, once", () => {
    expect(reachWorldWatchdogStep({ inWorld: false, onboarding: false }, false)).toBe("resume");
    expect(reachWorldWatchdogStep({ inWorld: false, onboarding: false }, true)).toBe("none");
});

test("at the deadline, only a world whose front reports its presence is sent back to the Landing", () => {
    expect(reachWorldDeadlineAction({ inWorld: false, onboarding: false }, true)).toBe("bounce");
    // An older WorkAdventure server never reports presence: it would be bounced every 45 seconds.
    expect(reachWorldDeadlineAction({ inWorld: false, onboarding: false }, false)).toBe("unknown");
    expect(reachWorldDeadlineAction({ inWorld: false, onboarding: true }, true)).toBe("wait");
    expect(reachWorldDeadlineAction({ inWorld: true, onboarding: false }, false)).toBe("reached");
});
