import {assertLogMessage} from "./utils/log";

const fs = require('fs');
const Docker = require('dockerode');
import { Selector } from 'testcafe';
import {login, resetLanguage} from "./utils/roles";
import {findContainer, rebootBack, rebootPusher, resetRedis, startContainer, stopContainer} from "./utils/containers";

fixture `Reconnection`
    .page `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/mousewheel.json`;

test("Test that connection can succeed even if WorkAdventure starts while pusher is down", async (t: TestController) => {
    // Let's stop the pusher
    const container = await findContainer('pusher');
    await stopContainer(container);

    const errorMessage = Selector('.error-div');

    await resetLanguage('en-US');

    await t
        .navigateTo('http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/mousewheel.json')
        .expect(errorMessage.innerText).contains('Unable to connect to WorkAdventure')

    await startContainer(container);

    await login(t, 'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/mousewheel.json');

    t.ctx.passed = true;
}).after(async t => {
    if (!t.ctx.passed) {
        console.log("Test failed. Browser logs:")
        console.log(await t.getBrowserConsoleMessages());
    }
});

/*
test("Test that variables cache in the back don't prevent setting a variable in case the map changes", async (t: TestController) => {
    // Let's start by visiting a map that DOES not have the variable.
    fs.copyFileSync('../maps/tests/Variables/Cache/variables_cache_1.json', '../maps/tests/Variables/Cache/variables_tmp.json');

    await t.useRole(userAlice);
        //.takeScreenshot('before_switch.png');

    // Let's REPLACE the map by a map that has a new variable
    // At this point, the back server contains a cache of the old map (with no variables)
    fs.copyFileSync('../maps/tests/Variables/Cache/variables_cache_2.json', '../maps/tests/Variables/Cache/variables_tmp.json');
    await t.openWindow('http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/Cache/variables_tmp.json')
        .resizeWindow(960, 800)
        .useRole(userAlice);
        //.takeScreenshot('after_switch.png');

    // Let's check we successfully manage to save the variable value.
    await assertLogMessage(t, 'SUCCESS!');

    t.ctx.passed = true;
}).after(async t => {
    if (!t.ctx.passed) {
        console.log("Test failed. Browser logs:")
        console.log(await t.getBrowserConsoleMessages());
    }
});
*/
