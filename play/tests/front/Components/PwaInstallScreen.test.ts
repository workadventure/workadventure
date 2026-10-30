import { afterEach, describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import PwaInstallScreen from "../../../src/front/Components/PwaInstall/PwaInstallScreen.svelte";

const { room } = vi.hoisted(() => ({
    room: { loginSceneLogo: undefined as string | undefined, backgroundSceneImage: undefined as string | undefined },
}));

vi.mock("../../../src/front/Phaser/Game/GameManager", () => ({
    gameManager: { currentStartedRoom: room, currentStartedRoomPromise: Promise.resolve(room) },
}));
vi.mock("../../../src/i18n/i18n-svelte", async () => {
    const { readable } = await import("svelte/store");
    const messages = new Proxy({}, { get: () => () => "Test label" });
    return { LL: readable({ warning: { pwaInstall: messages } }) };
});
vi.mock("../../../src/front/Administration/AnalyticsClient", () => ({
    analyticsClient: { trackAdminEvent: vi.fn() },
}));
vi.mock("../../../src/front/Stores/PwaInstallStore", async () => {
    const { readable } = await import("svelte/store");
    return {
        pwaInstallUiStore: readable({ isIos: false, deferredPrompt: null, installing: false }),
        initPwaInstallUiListeners: () => () => {},
        installPwaFromStore: vi.fn(),
        continuePwaInBrowser: vi.fn(),
        neverShowPwaPage: vi.fn(),
    };
});
vi.mock("../../../src/front/Utils/PwaInstallEligibility", () => ({
    detectIos: () => false,
    markPwaPromptNeverShow: vi.fn(),
}));

describe("PWA install screen branding", () => {
    const target = document.createElement("div");
    let component: ReturnType<typeof mount> | undefined;

    afterEach(async () => {
        const mountedComponent = component;
        component = undefined;
        if (mountedComponent) await unmount(mountedComponent);
        target.replaceChildren();
        room.loginSceneLogo = undefined;
        room.backgroundSceneImage = undefined;
    });

    it.each([
        {
            name: "fully branded",
            logo: "https://cdn.example.com/room-logo.svg",
            background: "https://cdn.example.com/room-background.webp",
        },
        { name: "custom logo only", logo: "https://cdn.example.com/room-logo.svg", background: undefined },
        { name: "custom background only", logo: undefined, background: "https://cdn.example.com/room-background.webp" },
        { name: "unbranded", logo: undefined, background: undefined },
    ])("renders $name room images before mount callbacks run", ({ logo, background }) => {
        room.loginSceneLogo = logo;
        room.backgroundSceneImage = background;

        flushSync(() => {
            component = mount(PwaInstallScreen, { target });
            expect(target.querySelector(".bg-cover.bg-center")?.getAttribute("style")).toContain(
                background ?? "map-exemple.webp",
            );
            const renderedLogo = target.querySelector("img.object-contain")?.getAttribute("src");
            if (logo) {
                expect(renderedLogo).toBe(logo);
            } else {
                expect(renderedLogo).toContain("/images/logo.svg");
            }
        });
    });
});
