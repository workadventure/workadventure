import {asError} from "catch-unknown";
import {expect, test} from '@playwright/test';
import { createRoomApiClient } from '../../libs/room-api-clients/room-api-client-js/src';
import {Value} from "../../libs/room-api-clients/room-api-client-js/src/compiled_proto/google/protobuf/struct";
import {evaluateScript} from "./utils/scripting";
import {RENDERER_MODE} from "./utils/environment";
import {maps_domain, play_url, publicTestMapUrl} from "./utils/urls";
import { getCoWebsiteIframe } from "./utils/iframe";
import {getPage } from "./utils/auth";
import {isMobile} from "./utils/isMobile";

const apiKey = process.env.ROOM_API_SECRET_KEY;

if (!apiKey) {
  throw new Error("No ROOM_API_SECRET_KEY defined on environment variables!");
}

const client = createRoomApiClient(apiKey, process.env.ROOM_API_HOSTNAME ?? "room-api.workadventure.localhost", process.env.ROOM_API_PORT ? Number(process.env.ROOM_API_PORT) : 80);

const roomUrl = `${play_url}/_/room-api/${maps_domain}/tests/Variables/shared_variables.json`;
const variableName = "textField";

test.describe('Room API @nomobile @nofirefox @nowebkit', () => {
    test.beforeEach(async ({ browserName, page }) => {
        // This test does not depend on the browser. Let's only run it in Chromium.
        test.skip(browserName !== 'chromium' || isMobile(page), 'Run only on Chromium and skip on mobile');
    });
    test("With a bad API key", async ({ browser }) => {
        const badClient = createRoomApiClient("BAD KEY", process.env.ROOM_API_HOSTNAME ?? "room-api.workadventure.localhost", process.env.ROOM_API_PORT ? Number(process.env.ROOM_API_PORT) : 80);
        try {
            await badClient.saveVariable({
                 name: variableName,
                 room: roomUrl,
                 value: 'Bad Value',
            });
            throw new Error("Should not be here");
        } catch (error) {
            // eslint-disable-next-line playwright/no-conditional-expect
            expect(error.message).toContain("UNAUTHENTICATED: Wrong API key");
        }
    });
    test("Save & read a variable", async ({ browser }) => {
        const newValue =  "New Value - " + Math.random().toString(36).substring(2,7);
        await using page = await getPage(browser, "Alice", roomUrl + "?phaserMode=" + RENDERER_MODE);

        const textField = getCoWebsiteIframe(page).locator("#textField");

        await expect(client.saveVariable({
            name: variableName,
            room: roomUrl,
            value: newValue,
        })).resolves.not.toThrow();
        // Check reading on browser
        await expect(textField).toHaveValue(newValue);

        const value = await client.readVariable({
            name: variableName,
            room: roomUrl,
        });

        // Check reading on GRPC
        expect(Value.unwrap(value)).toEqual(newValue);


        await page.context().close();
    });

    test("Listen to a variable", async ({ browser }) => {
        const newValue = "New Value - " + Math.random().toString(36).substring(2, 7);

        const listenVariable = client.listenVariable({
            name: variableName,
            room: roomUrl,
        });
        await using page = await getPage(browser, "Alice", roomUrl + "?phaserMode=" + RENDERER_MODE);

        const textField = getCoWebsiteIframe(page).locator("#textField");

        setTimeout(() => {
            // eslint-disable-next-line playwright/no-conditional-expect
            expect(client.saveVariable({
                name: variableName,
                room: roomUrl,
                value: newValue,
            })).resolves.not.toThrow().catch((e) => { test.fail(); throw e; });
        }, 5000);

        for await (const value of listenVariable) {
            expect(Value.unwrap(value)).toEqual(newValue);
            await expect(textField).toHaveValue(newValue);
            break;
        }

        await page.context().close();
    });

    test("Listen to an event emitted from the game", async ({ browser }) => {
        const listenEvent = client.listenToEvent({
            name: "my-event",
            room: `${play_url}/_/room-api/${maps_domain}/tests/E2E/empty.json`,
        });

        let resolved = false;
        (async () => {
            for await (const event of listenEvent) {
                //eslint-disable-next-line playwright/no-conditional-expect
                expect(event.data.foo).toEqual("bar");
                break;
            }
        })().then(() => {
            resolved = true;
        }).catch((e) => {
            test.fail(true, asError(e).message);
        });
        await using page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "room-api"));

        await evaluateScript(page, async () => {
            await WA.onInit();

            await WA.event.broadcast("my-event", {"foo": "bar"});
        });

        await expect.poll(() => resolved).toBeTruthy();


        await page.context().close();
    });

    test("Send an event from the Room API", async ({ browser }) => {
        await using page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "room-api"));

        let gotExpectedBroadcastNotification = false;
        page.on('console', async (msg) => {
            const text = msg.text();
            if (text === 'Broadcast event triggered') {
                gotExpectedBroadcastNotification = true;
            }
        });

        await evaluateScript(page, async () => {
            await WA.onInit();
            WA.event.on("key").subscribe((event) => {
                if (event.name !== "key") {
                    return;
                }
                if (event.data !== "value") {
                    return;
                }

                console.log("Broadcast event triggered");
            });
        });

        await client.broadcastEvent({
            name: "key",
            room: `${play_url}/_/room-api/${maps_domain}/tests/E2E/empty.json`,
            data: "value",
        });

        await expect.poll(() => gotExpectedBroadcastNotification).toBe(true);


        await page.context().close();
    });
});
