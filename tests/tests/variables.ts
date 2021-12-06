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

// Note: we are also testing that passing a random query parameter does not cause any issue.
fixture `Variables`
    .page `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json?somerandomparam=1`;

test("Test that variables storage works", async (t: TestController) => {

    const variableInput = Selector('#textField');

    await resetRedis();

    await Promise.all([
        rebootBack(),
        rebootPusher(),
    ]);

    //const mainWindow = await t.getCurrentWindow();

    await login(t, 'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json?somerandomparam=1');

    await t //.useRole(userAliceOnPage('http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json?somerandomparam=1'))
        .switchToIframe("#cowebsite-buffer iframe")
        .expect(variableInput.value).eql('default value')
        .selectText(variableInput)
        .pressKey('delete')
        .typeText(variableInput, 'new value')
        .pressKey('tab')
        .switchToMainWindow()
        //.switchToWindow(mainWindow)
        .wait(500)
        // reload
        .navigateTo('http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json')
        .switchToIframe("#cowebsite-buffer iframe")
        .expect(variableInput.value).eql('new value')
        //.debug()
        .switchToMainWindow()
        //.wait(5000)
        //.switchToWindow(mainWindow)
/*
        .wait(5000)
        //.debug()
        .switchToIframe("#cowebsite-buffer iframe")
        .expect(variableInput.value).eql('new value')
        .switchToMainWindow();*/

    // Now, let's kill the reverse proxy to cut the connexion
    //console.log('Rebooting traefik');
    rebootTraefik();
    //console.log('Rebooting done');

    // Maybe we should:
    // 1: stop Traefik
    // 2: detect reconnecting screen
    // 3: start Traefik again


    await t
        .switchToIframe("#cowebsite-buffer iframe")
        .expect(variableInput.value).eql('new value')

    stopRedis();

    // Redis is stopped, let's try to modify a variable.
    await t.selectText(variableInput)
        .pressKey('delete')
        .typeText(variableInput, 'value set while Redis stopped')
        .pressKey('tab')
        .switchToMainWindow()

    startRedis();

    // Navigate to some other map so that the pusher connection is freed.
    await t.navigateTo('http://maps.workadventure.localhost/tests/')
        .wait(3000);


    const backDump = await getBackDump();
    //console.log('backDump', backDump);
    for (const room of backDump) {
        if (room.roomUrl === 'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json') {
            throw new Error('Room still found in back');
        }
    }

    const pusherDump = await getPusherDump();
    //console.log('pusherDump', pusherDump);
    await t.expect(pusherDump['http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json']).eql(undefined);

    await t.navigateTo('http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json')
        .switchToIframe("#cowebsite-buffer iframe")
        // Redis will reconnect automatically and will store the variable on reconnect!
        // So we should see the new value.
        .expect(variableInput.value).eql('value set while Redis stopped')
        .switchToMainWindow()


    // Now, let's try to kill / reboot the back
    await rebootBack();

    await t.navigateTo('http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json')
        .switchToIframe("#cowebsite-buffer iframe")
        .expect(variableInput.value).eql('value set while Redis stopped')
        .selectText(variableInput)
        .pressKey('delete')
        .typeText(variableInput, 'value set after back restart')
        .pressKey('tab')
        .switchToMainWindow()

        .navigateTo('http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json')
        .switchToIframe("#cowebsite-buffer iframe")
        // Redis will reconnect automatically and will store the variable on reconnect!
        // So we should see the new value.
        .expect(variableInput.value).eql('value set after back restart')
        .switchToMainWindow()

    // Now, let's try to kill / reboot the back
    await rebootPusher();

    await t.navigateTo('http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json')
        .switchToIframe("#cowebsite-buffer iframe")
        .expect(variableInput.value).eql('value set after back restart')
        .selectText(variableInput)
        .pressKey('delete')
        .typeText(variableInput, 'value set after pusher restart')
        .pressKey('tab')
        .switchToMainWindow()

        .navigateTo('http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json')
        .switchToIframe("#cowebsite-buffer iframe")
        // Redis will reconnect automatically and will store the variable on reconnect!
        // So we should see the new value.
        .expect(variableInput.value).eql('value set after pusher restart')
        .switchToMainWindow()


    t.ctx.passed = true;
}).after(async t => {
    if (!t.ctx.passed) {
        console.log("Test 'Test that variables storage works' failed. Browser logs:")
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


test("Test that variables cache in the back don't prevent setting a variable in case the map changes", async (t: TestController) => {
    // Let's start by visiting a map that DOES not have the variable.
    fs.copyFileSync('../maps/tests/Variables/Cache/variables_cache_1.json', '../maps/tests/Variables/Cache/variables_tmp.json');

    //const aliceOnPageTmp = userAliceOnPage('http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/Cache/variables_tmp.json');

    await login(t, 'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/Cache/variables_tmp.json', 'Alice', 2);

        //.takeScreenshot('before_switch.png');

    // Let's REPLACE the map by a map that has a new variable
    // At this point, the back server contains a cache of the old map (with no variables)
    fs.copyFileSync('../maps/tests/Variables/Cache/variables_cache_2.json', '../maps/tests/Variables/Cache/variables_tmp.json');
    await t.openWindow('http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/Cache/variables_tmp.json')
        .resizeWindow(960, 800)

    await login(t, 'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/Cache/variables_tmp.json', 'Bob', 3);

        //.takeScreenshot('after_switch.png');

    // Let's check we successfully manage to save the variable value.
    await assertLogMessage(t, 'SUCCESS!');

    t.ctx.passed = true;
}).after(async t => {
    if (!t.ctx.passed) {
        console.log("Test 'Test that variables cache in the back don't prevent setting a variable in case the map changes' failed. Browser logs:")
        console.log(await t.getBrowserConsoleMessages());
    }
});


