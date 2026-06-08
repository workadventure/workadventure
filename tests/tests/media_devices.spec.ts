import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { publicTestMapUrl } from "./utils/urls";

declare global {
    interface Window {
        __disconnectCamera: (deviceId: string) => void;
        __disconnectMicrophone: (deviceId: string) => void;
        __disconnectSpeaker: (deviceId: string) => void;
        __lastRequestedAudioDeviceId: () => string | undefined;
        __lastRequestedVideoDeviceId: () => string | undefined;
    }
}

test.describe("Media devices @nomobile @nowebkit", () => {
    test("should fallback from the last microphone until no microphone remains", async ({ browser, browserName }) => {
        test.skip(browserName === "webkit", "WebKit has issues with camera/microphone");
        test.skip(
            browserName === "firefox",
            "Firefox does not trigger devicechange event when a device is disconnected",
        );

        const url = publicTestMapUrl("tests/E2E/empty.json", "microphone-device-fallback");
        const context = await createContextWithMockedMediaDevices(browser, {
            preferredAudioInputDevice: "macbook",
        });
        const page = await context.newPage();

        await loginWithMockedMediaDevices(page, url);
        await openMediaSettings(page);

        await expect(page.getByRole("button", { name: "AirPods", exact: true })).toBeVisible();
        await expect(page.getByText("iPhone Microphone")).toBeVisible();
        await expect(page.getByText("MacBook Pro Microphone")).toBeVisible();

        await expect.poll(() => page.evaluate(() => window.__lastRequestedAudioDeviceId())).toBe("macbook");

        await page.evaluate(() => window.__disconnectMicrophone("macbook"));

        await expect(page.getByText("MacBook Pro Microphone")).toBeHidden();
        await expect(page.getByRole("button", { name: "AirPods", exact: true })).toHaveClass(/bg-secondary/);
        await expect.poll(() => page.evaluate(() => window.__lastRequestedAudioDeviceId())).toBe("airpods");

        await page.evaluate(() => window.__disconnectMicrophone("airpods"));

        await expect(page.getByRole("button", { name: "AirPods", exact: true })).toBeHidden();
        await expect(page.getByRole("button", { name: /iPhone Microphone/ })).toHaveClass(/bg-secondary/);
        await expect.poll(() => page.evaluate(() => window.__lastRequestedAudioDeviceId())).toBe("iphone");

        await page.evaluate(() => window.__disconnectMicrophone("iphone"));

        await expect(page.getByText("iPhone Microphone")).toBeHidden();
        await expect(page.getByText("No usable microphone")).toBeVisible();
        await expect(page.getByTestId("microphone-button")).toHaveClass(/opacity-50/);

        await context.close();
    });

    test("should fallback from the last camera until no camera remains", async ({ browser, browserName }) => {
        test.skip(browserName === "webkit", "WebKit has issues with camera/microphone");
        test.skip(
            browserName === "firefox",
            "Firefox does not trigger devicechange event when a device is disconnected",
        );
        const url = publicTestMapUrl("tests/E2E/empty.json", "camera-device-fallback");
        const context = await createContextWithMockedMediaDevices(browser, {
            preferredVideoInputDevice: "facetime-camera",
        });
        const page = await context.newPage();

        await loginWithMockedMediaDevices(page, url);
        await openMediaSettings(page);

        await expect(page.getByText("iPhone Camera")).toBeVisible();
        await expect(page.getByText("FaceTime HD Camera")).toBeVisible();
        await expect.poll(() => page.evaluate(() => window.__lastRequestedVideoDeviceId())).toBe("facetime-camera");

        await page.evaluate(() => window.__disconnectCamera("facetime-camera"));

        await expect(page.getByText("FaceTime HD Camera")).toBeHidden();
        await expect(page.getByRole("button", { name: /iPhone Camera/ })).toHaveClass(/bg-secondary/);
        await expect.poll(() => page.evaluate(() => window.__lastRequestedVideoDeviceId())).toBe("iphone-camera");

        await page.evaluate(() => window.__disconnectCamera("iphone-camera"));

        await expect(page.getByText("iPhone Camera")).toBeHidden();
        await expect(page.getByText("No usable camera")).toBeVisible();
        await expect(page.getByTestId("camera-button")).toHaveClass(/opacity-50/);

        await context.close();
    });

    test("should fallback from the last speaker until no speaker remains", async ({ browser, browserName }) => {
        test.skip(browserName === "webkit", "WebKit has issues with camera/microphone");
        test.skip(
            browserName === "firefox",
            "Firefox does not trigger devicechange event when a device is disconnected",
        );
        const url = publicTestMapUrl("tests/E2E/empty.json", "speaker-device-fallback");
        const context = await createContextWithMockedMediaDevices(browser, {
            speakerDeviceId: "macbook-speakers",
        });
        const page = await context.newPage();

        await loginWithMockedMediaDevices(page, url);
        await openMediaSettings(page);

        await expect(page.getByText("AirPods Speaker")).toBeVisible();
        await expect(page.getByText("MacBook Speakers")).toBeVisible();
        await expect(page.getByRole("button", { name: /MacBook Speakers/ })).toHaveClass(/bg-secondary/);

        await page.evaluate(() => window.__disconnectSpeaker("macbook-speakers"));

        await expect(page.getByText("MacBook Speakers")).toBeHidden();
        await expect(page.getByRole("button", { name: /AirPods Speaker/ })).toHaveClass(/bg-secondary/);

        await page.evaluate(() => window.__disconnectSpeaker("airpods-speaker"));

        await expect(page.getByText("AirPods Speaker")).toBeHidden();
        await expect(page.getByText("No speaker device found")).toBeVisible();

        await context.close();
    });
});

type MockedMediaDevicePreferences = {
    preferredAudioInputDevice?: string;
    preferredVideoInputDevice?: string;
    speakerDeviceId?: string;
};

async function createContextWithMockedMediaDevices(
    browser: Browser,
    preferences: MockedMediaDevicePreferences = {},
): Promise<BrowserContext> {
    const context = await browser.newContext({
        permissions: ["microphone", "camera"],
    });

    await context.addInitScript((preferences: MockedMediaDevicePreferences) => {
        let devices: MediaDeviceInfo[] = [
            {
                kind: "audioinput",
                deviceId: "airpods",
                label: "AirPods",
                groupId: "airpods-group",
                toJSON: () => ({}),
            },
            {
                kind: "audioinput",
                deviceId: "iphone",
                label: "iPhone Microphone",
                groupId: "iphone-group",
                toJSON: () => ({}),
            },
            {
                kind: "audioinput",
                deviceId: "macbook",
                label: "MacBook Pro Microphone",
                groupId: "macbook-group",
                toJSON: () => ({}),
            },
            {
                kind: "videoinput",
                deviceId: "iphone-camera",
                label: "iPhone Camera",
                groupId: "iphone-camera-group",
                toJSON: () => ({}),
            },
            {
                kind: "videoinput",
                deviceId: "facetime-camera",
                label: "FaceTime HD Camera",
                groupId: "facetime-camera-group",
                toJSON: () => ({}),
            },
            {
                kind: "audiooutput",
                deviceId: "airpods-speaker",
                label: "AirPods Speaker",
                groupId: "airpods-speaker-group",
                toJSON: () => ({}),
            },
            {
                kind: "audiooutput",
                deviceId: "macbook-speakers",
                label: "MacBook Speakers",
                groupId: "macbook-speakers-group",
                toJSON: () => ({}),
            },
        ];
        let lastRequestedAudioDeviceId: string | undefined;
        let lastRequestedVideoDeviceId: string | undefined;

        try {
            if (preferences.preferredAudioInputDevice !== undefined) {
                localStorage.setItem("preferredAudioInputDevice", preferences.preferredAudioInputDevice);
            }
            if (preferences.preferredVideoInputDevice !== undefined) {
                localStorage.setItem("preferredVideoInputDevice", preferences.preferredVideoInputDevice);
            }
            if (preferences.speakerDeviceId !== undefined) {
                localStorage.setItem("speakerDeviceId", preferences.speakerDeviceId);
            }
        } catch {
            // addInitScript also runs on about:blank, where localStorage can be unavailable.
        }

        Object.defineProperty(navigator.mediaDevices, "enumerateDevices", {
            configurable: true,
            writable: true,
            value: async () => devices,
        });

        Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
            configurable: true,
            writable: true,
            value: async (constraints: MediaStreamConstraints) => {
                const stream = new MediaStream();

                if (constraints.audio !== false && constraints.audio !== undefined) {
                    const deviceId = getRequestedDeviceId(constraints.audio) ?? getFirstDeviceId("audioinput");
                    const audioTrack = createAudioTrack(deviceId);
                    lastRequestedAudioDeviceId = deviceId;
                    stream.addTrack(audioTrack);
                }

                if (constraints.video !== false && constraints.video !== undefined) {
                    const deviceId = getRequestedDeviceId(constraints.video) ?? getFirstDeviceId("videoinput");
                    lastRequestedVideoDeviceId = deviceId;
                    stream.addTrack(createVideoTrack(deviceId));
                }

                return stream;
            },
        });

        window.__disconnectCamera = (deviceId: string) => {
            devices = devices.filter((device) => device.kind !== "videoinput" || device.deviceId !== deviceId);
            navigator.mediaDevices.dispatchEvent(new Event("devicechange"));
        };

        window.__disconnectMicrophone = (deviceId: string) => {
            devices = devices.filter((device) => device.kind !== "audioinput" || device.deviceId !== deviceId);
            navigator.mediaDevices.dispatchEvent(new Event("devicechange"));
        };

        window.__disconnectSpeaker = (deviceId: string) => {
            devices = devices.filter((device) => device.kind !== "audiooutput" || device.deviceId !== deviceId);
            navigator.mediaDevices.dispatchEvent(new Event("devicechange"));
        };

        window.__lastRequestedAudioDeviceId = () => lastRequestedAudioDeviceId;
        window.__lastRequestedVideoDeviceId = () => lastRequestedVideoDeviceId;

        function getRequestedDeviceId(constraints: boolean | MediaTrackConstraints): string | undefined {
            if (typeof constraints === "boolean") {
                return undefined;
            }
            if (typeof constraints.deviceId === "string") {
                return constraints.deviceId;
            }
            const deviceId = constraints.deviceId as ConstrainDOMStringParameters | undefined;
            if (typeof deviceId?.exact === "string") {
                return deviceId.exact;
            }
            return undefined;
        }

        function getFirstDeviceId(kind: MediaDeviceKind): string {
            const device = devices.find((candidate) => candidate.kind === kind);
            if (!device) {
                throw new DOMException("Device not found", "NotFoundError");
            }
            return device.deviceId;
        }

        function createAudioTrack(deviceId: string): MediaStreamTrack {
            if (!devices.some((device) => device.kind === "audioinput" && device.deviceId === deviceId)) {
                const error = new DOMException("Device not found", "OverconstrainedError") as DOMException & {
                    constraint?: string;
                };
                error.constraint = "deviceId";
                throw error;
            }

            const context = new AudioContext();
            const track = context.createMediaStreamDestination().stream.getAudioTracks()[0];
            Object.defineProperty(track, "getSettings", {
                configurable: true,
                value: () => ({ deviceId }),
            });
            return track;
        }

        function createVideoTrack(deviceId: string): MediaStreamTrack {
            if (!devices.some((device) => device.kind === "videoinput" && device.deviceId === deviceId)) {
                const error = new DOMException("Device not found", "OverconstrainedError") as DOMException & {
                    constraint?: string;
                };
                error.constraint = "deviceId";
                throw error;
            }
            const canvas = document.createElement("canvas");
            canvas.width = 16;
            canvas.height = 16;
            const track = canvas.captureStream().getVideoTracks()[0];
            Object.defineProperty(track, "getSettings", {
                configurable: true,
                value: () => ({ deviceId }),
            });
            return track;
        }
    }, preferences);

    return context;
}

async function loginWithMockedMediaDevices(page: Page, url: string): Promise<void> {
    await page.goto(url);

    const firstVisibleStep = await Promise.race([
        page
            .getByTestId("loginSceneNameInput")
            .waitFor({ state: "visible" })
            .then(() => "login" as const),
        page
            .locator("button.selectCharacterSceneFormSubmit")
            .waitFor({ state: "visible" })
            .then(() => "character" as const),
        page
            .locator("h2", { hasText: "Turn on your camera and microphone" })
            .waitFor({ state: "visible" })
            .then(() => "media" as const),
        page
            .getByTestId("microphone-button")
            .waitFor({ state: "visible" })
            .then(() => "map" as const),
    ]);

    if (firstVisibleStep === "login") {
        await page.getByTestId("loginSceneNameInput").fill("Alice");
        await page.getByTestId("loginSceneNameInput").press("Enter");
    }

    if (firstVisibleStep === "login" || firstVisibleStep === "character") {
        await expect(page.locator("button.selectCharacterSceneFormSubmit")).toBeVisible();
        await page.locator("button.selectCharacterSceneFormSubmit").click();
    }

    if (firstVisibleStep !== "map") {
        await expect(page.locator("h2", { hasText: "Turn on your camera and microphone" })).toBeVisible();
        await page.getByText("Save").click();
    }

    await waitForMapAfterOnboarding(page);
}

async function openMediaSettings(page: Page): Promise<void> {
    if (
        await page
            .getByTestId("onboarding-step")
            .isVisible()
            .catch(() => false)
    ) {
        await page.addStyleTag({ content: '[data-testid="onboarding-step"] { display: none !important; }' });
    }

    await page.locator(".group\\/hardware").hover();
    await page.locator(".group\\/hardware > div.absolute").click({ force: true });
}

async function waitForMapAfterOnboarding(page: Page): Promise<void> {
    for (let i = 0; i < 3; i++) {
        const nextVisibleStep = await Promise.race([
            page
                .getByTestId("microphone-button")
                .waitFor({ state: "visible", timeout: 30_000 })
                .then(() => "map" as const),
            page
                .getByTestId("onboarding-button-welcome-skip")
                .waitFor({ state: "visible", timeout: 30_000 })
                .then(() => "onboarding" as const),
        ]);

        if (nextVisibleStep === "map") {
            return;
        }

        await page.getByTestId("onboarding-button-welcome-skip").click();
    }

    await expect(page.getByTestId("microphone-button")).toBeVisible({ timeout: 30_000 });
}
