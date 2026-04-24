import { expect, type Page, test } from "@playwright/test";
import { getPage } from "./utils/auth";
import Map from "./utils/map";
import Menu from "./utils/menu";
import { publicTestMapUrl } from "./utils/urls";

test.use({
    launchOptions: {
        args: ["--use-fake-device-for-media-stream"],
    },
});

async function expectCameraPermissionState(page: Page, state: PermissionState) {
    await expect
        .poll(
            () =>
                page.evaluate(async () => {
                    if (!navigator.permissions?.query) {
                        return null;
                    }

                    const permissionStatus = await navigator.permissions.query({
                        name: "camera",
                    } as PermissionDescriptor);

                    return permissionStatus.state;
                }),
            { timeout: 15_000 },
        )
        .toBe(state);
}

test.describe("Camera permission prompt placeholder @nowebkit @nomobile", () => {
    test("should render the local camera-off placeholder while camera permission is still prompt", async ({
        browser,
    }) => {
        await using alice = await getPage(browser, "Alice", publicTestMapUrl("tests/E2E/empty.json", "meeting"), {
            clearPermissions: true,
        });
        await using bob = await getPage(browser, "Bob", publicTestMapUrl("tests/E2E/empty.json", "meeting"), {
            permissions: ["camera", "microphone", "notifications"],
        });

        await Menu.turnOffCamera(alice);
        await expectCameraPermissionState(alice, "prompt");

        await Map.teleportToPosition(alice, 160, 160);
        await Map.teleportToPosition(bob, 160, 160);

        await alice.getByTestId("camera-button").click();
        await expectCameraPermissionState(alice, "prompt");

        const aliceLocalCameraBox = alice.getByTestId("camera-box-You");
        const aliceRemoteBobCameraBox = alice.getByTestId("camera-box-Bob");
        const bobRemoteAliceCameraBox = bob.getByTestId("camera-box-Alice");

        await expect(aliceLocalCameraBox).toBeVisible({
            timeout: 30_000,
        });
        await expect(aliceRemoteBobCameraBox).toBeVisible({
            timeout: 30_000,
        });
        await expect(bobRemoteAliceCameraBox).toBeVisible({
            timeout: 30_000,
        });

        await expect(aliceLocalCameraBox.locator("video")).toHaveCount(0);
        await expect(aliceLocalCameraBox.locator("img.noselect")).toBeVisible();
        await expect(bobRemoteAliceCameraBox.locator("video")).toHaveCount(0);
        await expect(bobRemoteAliceCameraBox.locator("img.noselect")).toBeVisible();
    });
});
