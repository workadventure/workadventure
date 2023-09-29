import {chromium, expect, test} from '@playwright/test';
import { createRoomApiClient } from '../../libs/room-api-clients/room-api-client-js/src';
import { Value } from '../../libs/room-api-clients/room-api-client-js/src/compiled_proto/google/protobuf/struct';
import { gotoWait200 } from './utils/containers';
import { login } from './utils/roles';

const apiKey = process.env.ROOM_API_SECRET_KEY;

if (!apiKey) {
  throw new Error("No ROOM_API_SECRET_KEY defined on environment variables!");
}

const client = createRoomApiClient(apiKey, process.env.ROOM_API_HOSTNAME ?? "room-api.workadventure.localhost", process.env.ROOM_API_PORT ? Number(process.env.ROOM_API_PORT) : 80);

const protocol = process.env.ROOM_API_HOSTNAME && process.env.ROOM_API_HOSTNAME.startsWith("https") ? "https" : "http";

const roomUrl = protocol + "://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json";
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

        await gotoWait200(page, roomUrl);
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

        // Check reading on GRPC
        await expect(client.readVariable({
            name: variableName,
            room: roomUrl,
        })).resolves.toEqual(Value.wrap(newValue));
    });

    test("Listen a variable", async ({ page, browser }) => {
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

        await gotoWait200(page, roomUrl);
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
            expect(value).toEqual(Value.wrap(newValue));
            await expect(textField).toHaveValue(newValue);
            break;
        }
    });
});
