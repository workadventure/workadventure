import {assertLogMessage} from "./utils/log";

const fs = require('fs')
import { Selector } from 'testcafe';
import {userAlice} from "./utils/roles";

fixture `Variables`
    .page `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/Cache/variables_tmp.json`;

test("Test that variables cache in the back don't prevent setting a variable in case the map changes", async (t: TestController) => {
    // Let's start by visiting a map that DOES not have the variable.
    fs.copyFileSync('../maps/tests/Variables/Cache/variables_cache_1.json', '../maps/tests/Variables/Cache/variables_tmp.json');

    await t.useRole(userAlice);
        //.takeScreenshot('before_switch.png');

    // Let's REPLACE the map by a map that has a new variable
    // At this point, the back server contains a cache of the old map (with no variables)
    fs.copyFileSync('../maps/tests/Variables/Cache/variables_cache_2.json', '../maps/tests/Variables/Cache/variables_tmp.json');
    await t.openWindow('http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/Cache/variables_tmp.json');

    await t.resizeWindow(960, 800);

    await t.useRole(userAlice);
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
