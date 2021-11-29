import {assertLogMessage} from "./utils/log";

const fs = require('fs');
const Docker = require('dockerode');
import { Selector } from 'testcafe';
import {userAlice} from "./utils/roles";
import {findContainer, rebootBack, rebootPusher, rebootRedis, startContainer, stopContainer} from "./utils/containers";

// Note: we are also testing that passing a random query parameter does not cause any issue.
fixture `Variables`
    .page `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json?somerandomparam=1`;

test("Test that variables storage works", async (t: TestController) => {

    const variableInput = Selector('#textField');

    await Promise.all([
        rebootBack(),
        rebootRedis(),
        rebootPusher(),
    ]);

    await t.useRole(userAlice)
        .switchToIframe("#cowebsite-buffer iframe")
        .debug()
        .expect(variableInput.value).eql('default value')
        .typeText(variableInput, 'new value')
        .switchToPreviousWindow()
        // reload
        /*.navigateTo('http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json')
        .switchToIframe("#cowebsite-buffer iframe")
        .expect(variableInput.value).eql('new value')*/




    /*
    const backContainer = await findContainer('back');

    await stopContainer(backContainer);

    await startContainer(backContainer);
*/


    t.ctx.passed = true;
}).after(async t => {
    if (!t.ctx.passed) {
        console.log("Test failed. Browser logs:")
        console.log(await t.getBrowserConsoleMessages());
    }
});


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

