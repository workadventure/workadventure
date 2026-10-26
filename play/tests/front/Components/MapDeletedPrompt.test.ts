import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, unmount } from "svelte";
import MapDeletedPrompt from "../../../src/front/Components/MapDeletedPrompt.svelte";

const { room } = vi.hoisted(() => ({
    room: { loginSceneLogo: undefined as string | undefined, errorSceneLogo: undefined as string | undefined },
}));
vi.mock("../../../src/front/Phaser/Game/GameManager", () => ({ gameManager: { currentStartedRoom: room } }));
vi.mock("../../../src/i18n/i18n-svelte", async () => {
    const { readable } = await import("svelte/store");
    return {
        LL: readable({
            mapEditor: {
                map: {
                    deletePrompt: () => "Map deleted",
                    deletePromptSubtitle: () => "Subtitle",
                    deletePromptDetails: () => "Details",
                },
            },
        }),
    };
});

describe("map deleted screen branding", () => {
    const target = document.createElement("div");
    let component: ReturnType<typeof mount> | undefined;

    afterEach(async () => {
        const mountedComponent = component;
        component = undefined;
        if (mountedComponent) await unmount(mountedComponent, { outro: false });
        target.replaceChildren();
        room.loginSceneLogo = undefined;
        room.errorSceneLogo = undefined;
    });

    it("displays the room logo and error illustration", () => {
        room.loginSceneLogo = "https://cdn.example.com/room-logo.svg";
        room.errorSceneLogo = "https://cdn.example.com/room-error.svg";
        component = mount(MapDeletedPrompt, { target, intro: false });

        expect(target.querySelector("img[alt='Logo']")?.getAttribute("src")).toBe(room.loginSceneLogo);
        expect(target.querySelector("img[alt='Map deleted']")?.getAttribute("src")).toBe(room.errorSceneLogo);
    });

    it("keeps default images for a room without branding", () => {
        component = mount(MapDeletedPrompt, { target, intro: false });

        expect(target.querySelector("img[alt='Logo']")?.getAttribute("src")).toContain("logo-min-white.png");
        expect(target.querySelector("img[alt='Map deleted']")?.getAttribute("src")).toContain("error.gif");
    });
});
