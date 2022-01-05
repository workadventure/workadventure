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

fixture `XMPP`
    .page `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/mousewheel.json`;

test("Test that XMPP server works", async (t: TestController) => {

    const userListBtn = Selector('.user-list-btn');
    const userList = Selector('.roomsList');

    await login(t, 'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/mousewheel.json');

    await t
        .click(userListBtn)
        .expect(userList.innerText).contains('Alice');

    const aliceWindow = await t.getCurrentWindow();
    const bobWindow = await t.openWindow('http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/mousewheel.json');

    await t.resizeWindow(960, 800);

    await login(t, 'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/mousewheel.json', 'Bob', 3);

    await t
        .click(userListBtn)
        .expect(userList.innerText).contains('Alice')
        .expect(userList.innerText).contains('Bob');

    await t.switchToWindow(aliceWindow)
        .expect(userList.innerText).contains('Bob');

    await t.closeWindow(bobWindow)
        .expect(userList.innerText).notContains('Bob');

    t.ctx.passed = true;
}).after(async t => {
    if (!t.ctx.passed) {
        console.log("Test 'Test that XMPP server works' failed. Browser logs:")
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


