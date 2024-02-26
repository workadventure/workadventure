// FIXME: this must be migrated to Playwright
//
// import {assertLogMessage} from "./utils/log";
//
// const fs = require('fs');
// const Docker = require('dockerode');
// import { Selector } from 'testcafe';
// import {login} from "./utils/roles";
// import {
//     findContainer,
//     rebootBack,
//     rebootPusher,
//     resetRedis,
//     rebootTraefik,
//     startContainer,
//     stopContainer, stopRedis, startRedis, stopEjabberd, rebootEjabberd, stopPusher
// } from "./utils/containers";
// import {getBackDump, getPusherDump} from "./utils/debug";
//
// fixture `XMPP`
//     .page `/_/global/maps.workadventure.localhost/tests/mousewheel.json`;
//
// test("Test that XMPP server works", async (t: TestController) => {
//
//     const userListBtn = Selector('.user-list-btn');
//     const userList = Selector('.roomsList');
//
//     await login(t, '/_/global/maps.workadventure.localhost/tests/mousewheel.json');
//
//     await t
//         .click(userListBtn)
//         .expect(userList.innerText).contains('Alice');
//
//     const aliceWindow = await t.getCurrentWindow();
//     const bobWindow = await t.openWindow('/_/global/maps.workadventure.localhost/tests/mousewheel.json');
//
//     await t.resizeWindow(960, 800);
//
//     await login(t, '/_/global/maps.workadventure.localhost/tests/mousewheel.json', 'Bob', 3);
//
//     await t
//         .click(userListBtn)
//         .expect(userList.innerText).contains('Alice')
//         .expect(userList.innerText).contains('Bob');
//
//     await t.switchToWindow(aliceWindow)
//         .expect(userList.innerText).contains('Bob');
//
//     await t.closeWindow(bobWindow)
//         .expect(userList.innerText).notContains('Bob');
//
//     t.ctx.passed = true;
// }).after(async t => {
//     if (!t.ctx.passed) {
//         console.log("Test 'Test that XMPP server works' failed. Browser logs:")
//         try {
//             console.log(await t.getBrowserConsoleMessages());
//         } catch (e) {
//             console.error('Error while fetching browser logs (maybe linked to a closed iframe?)', e);
//             try {
//                 console.log('Logs from main window:');
//                 console.log(await t.switchToMainWindow().getBrowserConsoleMessages());
//             } catch (e) {
//                 console.error('Unable to retrieve logs', e);
//             }
//         }
//     }
// });
//
// test("Test that XMPP server reconnects on error", async (t: TestController) => {
//
//     const userListBtn = Selector('.user-list-btn');
//     const userList = Selector('.roomsList');
//     const chatWindow = Selector('.chatWindow');
//     const errorDiv = Selector('.error-div');
//
//     await login(t, '/_/global/maps.workadventure.localhost/tests/mousewheel.json');
//
//     await t
//         .click(userListBtn)
//         .expect(userList.innerText).contains('Alice');
//
//     await stopEjabberd();
//     await t.expect(chatWindow.innerText).contains('Connection to presence server in progress');
//
//     await rebootEjabberd();
//     await t
//         .expect(userList.innerText).contains('Alice');
//
//     await stopPusher();
//     await t
//         .expect(errorDiv.innerText).contains('Unable to connect to WorkAdventure');
//
//     await rebootPusher();
//     await t
//         .expect(userList.innerText).contains('Alice')
//         .expect(errorDiv.visible).notOk()
//
//
//     t.ctx.passed = true;
// }).after(async t => {
//     if (!t.ctx.passed) {
//         console.log("Test 'Test that XMPP server works' failed. Browser logs:")
//         try {
//             console.log(await t.getBrowserConsoleMessages());
//         } catch (e) {
//             console.error('Error while fetching browser logs (maybe linked to a closed iframe?)', e);
//             try {
//                 console.log('Logs from main window:');
//                 console.log(await t.switchToMainWindow().getBrowserConsoleMessages());
//             } catch (e) {
//                 console.error('Unable to retrieve logs', e);
//             }
//         }
//     }
// });
//


