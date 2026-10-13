import type { CalendarEventInterface } from "@workadventure/shared-utils";
import { describe, expect, it, vi } from "vitest";

import { openMeeting } from "../../../../src/front/Components/Calendar/openMeeting";
import type { ExtensionModule } from "../../../../src/front/ExternalModule/ExtensionModule";
import { extensionModuleStore } from "../../../../src/front/Stores/GameSceneStore";

vi.mock("../../../../src/front/Phaser/Game/GameManager", () => ({
    gameManager: { getCurrentGameScene: () => ({}) },
}));

const event: CalendarEventInterface = {
    id: "meeting",
    title: "Meeting",
    description: "",
    start: new Date(),
    end: new Date(),
    resource: { onlineMeeting: { joinUrl: "https://meet.google.com/abc-defg-hij" } },
};

function withModule(openPopupMeeting: ExtensionModule["openPopupMeeting"]) {
    extensionModuleStore.set([
        {
            id: "module",
            init: vi.fn(),
            destroy: vi.fn(),
            openPopupMeeting,
            calendarSynchronised: true,
            todoListSynchronized: false,
        },
    ]);
}

describe("openMeeting", () => {
    it("lets the link open when the module does not handle the meeting", () => {
        withModule(() => false);
        expect(openMeeting(event)).toBe(false);
        // Modules written before openPopupMeeting answered.
        withModule(vi.fn());
        expect(openMeeting(event)).toBe(false);
    });

    it("cancels the link when a module opened the meeting itself", () => {
        withModule(() => true);
        expect(openMeeting(event)).toBe(true);
    });
});
