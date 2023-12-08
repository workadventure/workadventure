import {chromium, expect, test} from '@playwright/test';
import { createRoomApiClient } from '../../libs/room-api-clients/room-api-client-js/src';
import {Value} from "../../libs/room-api-clients/room-api-client-js/src/compiled_proto/google/protobuf/struct";
import { gotoWait200 } from './utils/containers';
import { login } from './utils/roles';
import {evaluateScript} from "./utils/scripting";
import {RENDERER_MODE} from "./utils/environment";

const apiKey = process.env.ROOM_API_SECRET_KEY;

if (!apiKey) {
  throw new Error("No ROOM_API_SECRET_KEY defined on environment variables!");
}

const client = createRoomApiClient(apiKey, process.env.ROOM_API_HOSTNAME ?? "room-api.workadventure.localhost", process.env.ROOM_API_PORT ? Number(process.env.ROOM_API_PORT) : 80);

const protocol = process.env.ROOM_API_HOSTNAME && process.env.ROOM_API_HOSTNAME.startsWith("https") ? "https" : "http";

const roomUrl = `${protocol}://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json`;
const variableName = "textField";

test.describe('Room API', async () => {
    test("With a bad API key", async ({ browser }) => {
        // This test does not depend on the browser. Let's only run it in Chromium.
        if(browser.browserType() !== chromium) {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }

        const badClient = createRoomApiClient("BAD KEY", process.env.ROOM_API_HOSTNAME ?? "room-api.workadventure.localhost", process.env.ROOM_API_PORT ? Number(process.env.ROOM_API_PORT) : 80);

        try {
            await badClient.saveVariable({
                 name: variableName,
                 room: roomUrl,
                 value: 'Bad Value',
            });

            throw new Error("Should not be here");
        } catch (error) {
            expect(error.message).toContain("UNAUTHENTICATED: Wrong API key");
        }
    });

    test("Save & read a variable", async ({ page, browser }) => {
        // This test does not depend on the browser. Let's only run it in Chromium.
        if(browser.browserType() !== chromium) {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }

        const newValue =  "New Value - " + Math.random().toString(36).substring(2,7);

        await gotoWait200(page, roomUrl+"?phaserMode="+RENDERER_MODE);
        await login(page);

        const textField = page
            .frameLocator('#cowebsite-buffer iframe')
            .locator('#textField');

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
    });

    test("Listen to a variable", async ({ page, browser }) => {
        // This test does not depend on the browser. Let's only run it in Chromium.
        if(browser.browserType() !== chromium) {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }

        const newValue =  "New Value - " + Math.random().toString(36).substring(2,7);

        const listenVariable = client.listenVariable({
            name: variableName,
            room: roomUrl,
        });

        await gotoWait200(page, roomUrl+"?phaserMode="+RENDERER_MODE);
        await login(page);

        const textField = page
            .frameLocator('#cowebsite-buffer iframe')
            .locator('#textField');

        setTimeout(async () => {
            await expect(client.saveVariable({
                name: variableName,
                room: roomUrl,
                value: newValue,
            })).resolves.not.toThrow();
        }, 5000);

        for await (const value of listenVariable) {
            expect(Value.unwrap(value)).toEqual(newValue);
            await expect(textField).toHaveValue(newValue);
            break;
        }
    });

    test("Listen to an event emitted from the game", async ({ page, browser }) => {
        // This test does not depend on the browser. Let's only run it in Chromium.
        if(browser.browserType() !== chromium) {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }

        const listenEvent = client.listenToEvent({
            name: "my-event",
            room: protocol + '://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json',
        });

        let resolved = false;
        (async () => {
            for await (const event of listenEvent) {
                expect(event.data.foo).toEqual("bar");
                break;
            }
        })().then(() => {
            resolved = true;
        })

        await page.goto(`${protocol}://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`);
        await login(page);

        await evaluateScript(page, async () => {
            await WA.onInit();

            await WA.event.broadcast("my-event", {"foo": "bar"});
        });

        await expect.poll(() => resolved).toBeTruthy();
    });

    test("Send an event from the Room API", async ({ page, browser }) => {
        // This test does not depend on the browser. Let's only run it in Chromium.
        if(browser.browserType() !== chromium) {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }

        await page.goto(`${protocol}://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`);
        await login(page);

        let gotExpectedBroadcastNotification = false;
        page.on('console', async (msg) => {
            const text = await msg.text();
            //console.log(text);
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
            room: protocol + '://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json',
            data: "value",
        });

        await expect.poll(() => gotExpectedBroadcastNotification).toBe(true);
    });
});
