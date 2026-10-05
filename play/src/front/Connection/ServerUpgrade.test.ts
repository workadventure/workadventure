import { Subject } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import type { ReceiveEventEvent } from "../Api/Events/ReceiveEventEvent";

vi.mock("../Enum/EnvironmentVariable", () => ({ KEEP_CONVERSATIONS_ON_RESTART: true }));

import { isServerUpgrading, listenToServerUpgradeAnnouncements } from "./ServerUpgrade";

describe("ServerUpgrade", () => {
    const events = new Subject<ReceiveEventEvent>();
    listenToServerUpgradeAnnouncements({ receivedEventMessageStream: events.asObservable() });

    it("reads a lost connection as the upgrade the server announced, until it announces the end", () => {
        expect(isServerUpgrading()).toBe(false);

        events.next({ name: "workadventure:reboot", data: "", senderId: undefined });
        expect(isServerUpgrading()).toBe(true);

        events.next({ name: "workadventure:rebooted", data: "", senderId: undefined });
        expect(isServerUpgrading()).toBe(false);
    });

    it("forgets an announcement whose end never came", () => {
        events.next({ name: "workadventure:reboot", data: "", senderId: undefined });

        expect(isServerUpgrading(Date.now() + 21 * 60_000)).toBe(false);
    });

    it("ignores the other events", () => {
        events.next({ name: "workadventure:rebooted", data: "", senderId: undefined });
        events.next({ name: "my-script-event", data: "", senderId: undefined });

        expect(isServerUpgrading()).toBe(false);
    });
});
