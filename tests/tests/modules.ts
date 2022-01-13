import {assertLogMessage} from "./utils/log";

const fs = require('fs');
const Docker = require('dockerode');
import { Selector } from 'testcafe';
import {login} from "./utils/roles";
import {
    findContainer,
    rebootBack,
    rebootPusher,
    resetRedis,
    rebootTraefik,
    startContainer,
    stopContainer, stopRedis, startRedis
} from "./utils/containers";
import {getBackDump, getPusherDump} from "./utils/debug";

fixture `Modules`
    .page `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Modules/with_modules.json`;

test("Test that module loading works out of the box", async (t: TestController) => {

    await login(t, 'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Modules/with_modules.json');


    await assertLogMessage(t, 'Successfully loaded module: foo =  bar');

    t.ctx.passed = true;
}).after(async t => {
    if (!t.ctx.passed) {
        console.log("Test 'Test that module loading works out of the box' failed. Browser logs:")
        try {
            console.log(await t.getBrowserConsoleMessages());
        } catch (e) {
            console.error('Error while fetching browser logs (maybe linked to a closed iframe?)', e);
            try {
                console.log('Logs from main window:');
                console.log(await t.switchToMainWindow().getBrowserConsoleMessages());
            } catch (e) {
                console.error('Unable to retrieve logs', e);
            }
        }
    }
});
