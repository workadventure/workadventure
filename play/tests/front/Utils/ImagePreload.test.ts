import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pickRoomImages, warmUpImageWhenIdle } from "../../../src/front/Utils/ImagePreload";

describe("pickRoomImages", () => {
    const defaults = {
        loadingLogo: "/assets/Workadventure.gif",
        backgroundSceneImage: "/assets/map-exemple.png",
        errorSceneLogo: "/assets/error.gif",
    };

    it("keeps the default images of a room that is not branded", () => {
        const images = pickRoomImages({}, defaults);

        expect(images).toEqual({
            loadingLogo: "/assets/Workadventure.gif",
            backgroundSceneImage: "/assets/map-exemple.png",
            errorSceneLogo: "/assets/error.gif",
        });
    });

    it("replaces every default image of a fully branded room", () => {
        const images = pickRoomImages(
            {
                loadingLogo: "https://cdn.example.com/loading.svg",
                backgroundSceneImage: "https://cdn.example.com/background.jpg",
                errorSceneLogo: "https://cdn.example.com/error.svg",
            },
            defaults,
        );

        expect(images).toEqual({
            loadingLogo: "https://cdn.example.com/loading.svg",
            backgroundSceneImage: "https://cdn.example.com/background.jpg",
            errorSceneLogo: "https://cdn.example.com/error.svg",
        });
    });

    it("keeps the default image of whatever a branded room does not replace", () => {
        const images = pickRoomImages({ backgroundSceneImage: "https://cdn.example.com/background.jpg" }, defaults);

        expect(images).toEqual({
            loadingLogo: "/assets/Workadventure.gif",
            backgroundSceneImage: "https://cdn.example.com/background.jpg",
            errorSceneLogo: "/assets/error.gif",
        });
    });
});

describe("warmUpImageWhenIdle", () => {
    const requestedImages: string[] = [];
    let runWhenIdle: (() => void) | undefined;
    const cancelIdleCallback = vi.fn();

    beforeEach(() => {
        requestedImages.length = 0;
        runWhenIdle = undefined;
        vi.stubGlobal(
            "Image",
            class {
                set src(url: string) {
                    requestedImages.push(url);
                }
            },
        );
        vi.stubGlobal("requestIdleCallback", (callback: () => void) => {
            runWhenIdle = callback;
            return 42;
        });
        vi.stubGlobal("cancelIdleCallback", cancelIdleCallback);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        cancelIdleCallback.mockReset();
    });

    it("does not request the image before the browser is idle", () => {
        warmUpImageWhenIdle("/assets/error.gif");

        expect(requestedImages).toEqual([]);
    });

    it("requests the image once the browser is idle", () => {
        warmUpImageWhenIdle("/assets/error.gif");

        runWhenIdle?.();

        expect(requestedImages).toEqual(["/assets/error.gif"]);
    });

    it("gives up on an image whose download was cancelled before the browser was idle", () => {
        const cancel = warmUpImageWhenIdle("/assets/error.gif");

        cancel();

        expect(cancelIdleCallback).toHaveBeenCalledWith(42);
    });

    it("requests the image after a delay where the browser has no idle callbacks", () => {
        vi.useFakeTimers();
        vi.stubGlobal("requestIdleCallback", undefined);

        warmUpImageWhenIdle("/assets/error.gif");
        vi.advanceTimersByTime(5_000);

        expect(requestedImages).toEqual(["/assets/error.gif"]);
    });

    it("does not request the image once its download was cancelled where the browser has no idle callbacks", () => {
        vi.useFakeTimers();
        vi.stubGlobal("requestIdleCallback", undefined);

        const cancel = warmUpImageWhenIdle("/assets/error.gif");
        cancel();
        vi.advanceTimersByTime(5_000);

        expect(requestedImages).toEqual([]);
    });
});
