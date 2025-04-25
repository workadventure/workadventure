import {expect, test} from '@playwright/test';
import { evaluateScript } from './utils/scripting';
import Menu  from './utils/menu';
import Map  from './utils/map';
import { publicTestMapUrl } from './utils/urls';
import { getPage } from './utils/auth'
import {isMobile} from "./utils/isMobile";

test.describe('Availability Status', () => {
    test.describe('Busy Status',() => {
        test('should return to online status when you move',
            async({ browser }, { project }) => {
            // Skip webkit because the moving player with the keyboard doesn't work
            if(project.name === "webkit") {
                //eslint-disable-next-line playwright/no-skipped-test
               test.skip();
               return;
           }
            const statusName = "Busy";

           const page = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/empty.json", "availability-status")
           );

            await Menu.openStatusList(page, false);
            await Menu.clickOnStatus(page,statusName); 
            /*if((browserName === "firefox") && await page.getByText(`Allow notification`).isVisible() ){
                await  page.locator("section:has(#notificationPermission) + footer>button.outline").click();
            }*/
            await Menu.openStatusList(page, false);
            
            //await expect(page.locator('.status-button').getByText(statusName)).toHaveClass('opacity-50')
            await expect(page.getByRole('button', { name: statusName }).locator('svg')).toBeVisible();

        
            //move to trigger status change 
            await Map.walkTo(page,'ArrowRight',100);
            await expect(page.getByRole('button', { name: 'Online' }).locator('svg')).toBeVisible();
            await page.close();
            await page.context().close();
        })
        test('should disable microphone and camera', async({ browser }, { project }) => {
            if(project.name === "webkit"){
                 //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
            const statusName = "Busy";
            const page = await getPage(browser, 'Alice',
                publicTestMapUrl("tests/E2E/empty.json", "availability-status")
            );

            // Because webkit in playwright does not support Camera/Microphone Permission by settings


            await Menu.turnOnCamera(page);
            await Menu.turnOnMicrophone(page);

            //await Menu.closeNotificationPopUp(page);

            await Menu.openStatusList(page, false);
            await Menu.clickOnStatus(page,statusName); 
            //await Menu.closeNotificationPopUp(page);

            await expect(page.getByTestId('camera-button').locator('.bg-danger')).toBeHidden();
            await expect(page.getByTestId('microphone-button').locator('.bg-danger')).toBeHidden();
            await page.close();
            await page.context().close();
        })

        test('should keep same webcam and microphone config when you go back to online status',
            async({ browser, browserName })=>{
            if(browserName === "webkit") {
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
            const statusName = "Busy";
            const page = await getPage(browser, 'Alice',
                publicTestMapUrl("tests/E2E/empty.json", "availability-status")
            );
            
            await Menu.turnOnCamera(page);
            await Menu.turnOffMicrophone(page)


            await Menu.expectCameraOn(page);
            await Menu.expectMicrophoneOff(page);

            await Menu.openStatusList(page);
            await Menu.clickOnStatus(page,statusName);
            //await Menu.closeNotificationPopUp(page);
            await Map.walkTo(page,'ArrowRight',100)

            await Menu.expectCameraOn(page);
            await Menu.expectMicrophoneOff(page);
            await page.close();
            await page.context().close();
        })
        test('should ask to change notification permission when you pass in Busy status and your browser notification permission is denied',
            async({ browser, browserName }) => {
            if(browserName === "firefox" || browserName === "webkit"){
                //skip for firefox because of notification permission management
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
            
            const statusName = "Busy";
            const page = await getPage(browser, 'Alice',
                publicTestMapUrl("tests/E2E/empty.json", "availability-status")
            );

            await Map.walkTo(page,'ArrowRight',500);

            await Menu.openStatusList(page, false);
            await Menu.clickOnStatus(page,statusName);

            await expect(page.getByText('Allow notifications?')).toBeVisible();

            await page.getByText('Accept').click();

            await expect(page.getByText('Allow notifications?')).toBeHidden();
            await page.close();
            await page.context().close();
        })
        
        test.describe('busy interaction',async() => {
            test('should open a popup when a bubble is created...',
                async({ browserName, browser }) => {
                if(browserName === "webkit"){
                     //eslint-disable-next-line playwright/no-skipped-test
                    test.skip();
                    return;
                }
                const statusName = "Busy";
                const page = await getPage(browser, 'Alice',
                    publicTestMapUrl("tests/E2E/empty.json", "availability-status")
                );
            
                const positionToDiscuss = {
                    x: 3 * 32,
                    y: 4 * 32
                };
                await Map.teleportToPosition(page, positionToDiscuss.x, positionToDiscuss.y);
                
                const userBob = await getPage(browser, 'Bob', 
                    publicTestMapUrl("tests/E2E/empty.json", "availability-status")
                )
                const secondPageName = 'Bob'
                
                await Menu.openStatusList(page, false);
                await Menu.clickOnStatus(page,statusName); 
               // await Menu.closeNotificationPopUp(page);

                const isInBubble = evaluateScript(page, async () => {
                    return new Promise((resolve) => {
                        WA.player.proximityMeeting.onJoin().subscribe((user) => {
                            console.log("Entering proximity meeting with", user);
                            resolve(true)
                        });
                    });
                });
                await Map.teleportToPosition(userBob, positionToDiscuss.x+10, positionToDiscuss.y);
                
                /*if((browserName === "firefox") && await page.getByText(`Allow notification`).isVisible() ){
                    await  page.locator("section:has(#notificationPermission) + footer>button.outline").click();
                }*/

                await expect(page.getByText(`${secondPageName} wants to discuss with you`)).toBeVisible();
                await expect(await isInBubble).toBeTruthy();
                await userBob.close();
                await userBob.context().close();
                await page.close();
                await page.context().close();
            })
            test('should return to online status after accept conversation',
                async({ browser, browserName }) => {
                if(browserName === "webkit"){
                     //eslint-disable-next-line playwright/no-skipped-test
                    test.skip();
                    return;
                }
                const statusName = "Busy";
                const page = await getPage(browser, 'Alice',
                    publicTestMapUrl("tests/E2E/empty.json", "availability-status")
                );

                const positionToDiscuss = {
                    x: 3 * 32,
                    y: 4 * 32
                };
                await Map.teleportToPosition(page, positionToDiscuss.x, positionToDiscuss.y);

                await Menu.openStatusList(page, false);
                await Menu.clickOnStatus(page,statusName);
                //await Menu.closeNotificationPopUp(page);

                const userBob = await getPage(browser, 'Bob', 
                    publicTestMapUrl("tests/E2E/empty.json", "availability-status")
                )
                const secondPageName = 'Bob'
                
                await Map.teleportToPosition(userBob, positionToDiscuss.x, positionToDiscuss.y);
                
                
                /*if((browserName === "firefox" ) && await page.getByText(`Allow notification`).isVisible() ){
                    await  page.locator("section:has(#notificationPermission) + footer>button.outline").click();
                }*/
                await expect(page.getByText(`${secondPageName} wants to discuss with you`)).toBeVisible();

                await page.getByText('Accept').first().click();
                await Menu.openStatusList(page, false);
                await expect(page.getByRole('button', { name: 'Online' }).locator('svg')).toBeVisible();
                await userBob.close();
                await userBob.context().close();
                await page.close();
                await page.context().close();
            })
            test('should keep busy status  after refuse conversation',
                async({ browser, browserName })=>{
                
                if(browserName === "webkit"){
                     //eslint-disable-next-line playwright/no-skipped-test
                    test.skip();
                    return;
                }

                const statusName = "Busy";
                const page = await getPage(browser, 'Alice',
                    publicTestMapUrl("tests/E2E/empty.json", "availability-status")
                );
                const positionToDiscuss = {
                    x: 3 * 32,
                    y: 4 * 32
                };
                await Map.teleportToPosition(page, positionToDiscuss.x, positionToDiscuss.y);

                await Menu.openStatusList(page, false);
                await Menu.clickOnStatus(page,statusName); 
               // await Menu.closeNotificationPopUp(page);
                
                const userBob = await getPage(browser, 'Bob',
                    publicTestMapUrl("tests/E2E/empty.json", "availability-status")
                );
                // Login user "Bob"
                const secondPageName = 'Bob'
                await Map.teleportToPosition(userBob, positionToDiscuss.x, positionToDiscuss.y);
                
                /*if((browserName === "firefox") && await page.getByText(`Allow notification`).isVisible() ){
                    await  page.locator("section:has(#notificationPermission) + footer>button.outline").click();
                }*/

                await expect(page.getByText(`${secondPageName} wants to discuss with you`)).toBeVisible();

                //click on close button
                await page.getByText('Accept').first().click();
                await Menu.openStatusList(page, false);
                await expect(page.getByRole('button', { name: statusName }).locator('svg')).toBeVisible();

                await userBob.close();
                await userBob.context().close();
                await page.close();
                await page.context().close();
            })
        })

    })
    test.describe('Back in a moment Status',()=>{
        test('should return to online status when you move', async({ browser, browserName }) => {
            // Skip webkit because the moving player with the keyboard doesn't work
            if(browserName === "webkit"){
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }

            const statusName = "Back in a moment";
            const page = await getPage(browser, 'Alice',
                publicTestMapUrl("tests/E2E/empty.json", "availability-status")
            );
            if (isMobile(page)) {
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }

            await Menu.openStatusList(page, false);
            await Menu.clickOnStatus(page,statusName);

            await Menu.openStatusList(page, false);

            await expect(page.getByRole('button', { name: statusName }).locator('svg')).toBeVisible();
            await Map.walkTo(page,'ArrowRight',100);
            await Menu.expectStatus(page, 'Online');
            await page.close();
            await page.context().close();
        })
        test('should disable microphone and camera',async({ browser, browserName }) => {
            const statusName = "Back in a moment";
            if(browserName === "webkit") {
                 //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
            const page = await getPage(browser, 'Alice',
                publicTestMapUrl("tests/E2E/empty.json", "availability-status")
            );

            await Menu.turnOnCamera(page);
            await Menu.turnOnMicrophone(page);

            //await Menu.closeNotificationPopUp(page);

            await Menu.openStatusList(page, false);
            await Menu.clickOnStatus(page,statusName); 
            //await Menu.closeNotificationPopUp(page);

            await Menu.expectCameraDisabled(page);
            await Menu.expectMicrophoneDisabled(page);
            await page.close();
            await page.context().close();
        })

        test('should keep same webcam and microphone config when you go back to online status',
            async({ browser, browserName }) => {
            if(browserName === "webkit") {
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
            const statusName = "Back in a moment";
            const page = await getPage(browser, 'Alice',
                publicTestMapUrl("tests/E2E/empty.json", "availability-status")
            );
            
            await Menu.turnOnCamera(page);
            await Menu.turnOffMicrophone(page)

            await Menu.expectCameraOn(page);
            await Menu.expectMicrophoneOff(page);

            await Menu.openStatusList(page);
            await Menu.clickOnStatus(page,statusName); 

            //move to trigger status change 
            await Map.walkTo(page,'ArrowRight',100)

            await Menu.expectCameraOn(page);
            await Menu.expectMicrophoneOff(page);
            await page.close();
            await page.context().close();
        })
        test.describe('Back in a moment interaction',async()=>{
            test('should not create a bubble',async({ browser }) => {
                const statusName = "Back in a moment";
                const page = await getPage(browser, 'Alice',
                    publicTestMapUrl("tests/E2E/empty.json", "availability-status")
                );
                const positionToDiscuss = {
                    x: 3 * 32,
                    y: 4 * 32
                };

                await Map.teleportToPosition(page, positionToDiscuss.x, positionToDiscuss.y);
                await Menu.openStatusList(page, false);
                await Menu.clickOnStatus(page,statusName); 
                
                const userBob = await getPage(browser, 'Bob', 
                    publicTestMapUrl("tests/E2E/empty.json", "availability-status")
                )
                
                await Map.teleportToPosition(userBob, positionToDiscuss.x, positionToDiscuss.y);
                await expect( page.locator('button.chat-btn + div>span.animate-ping')).toBeHidden();
                
                await userBob.close()
                await userBob.context().close();
                await page.close();
                await page.context().close();
            })
        })
    })
    test.describe('Do not disturb Status',()=>{
        test('should return to online status when you move', async({ browser, browserName }) => {
            // Skip webkit because the moving player with the keyboard doesn't work
            if(browserName === "webkit"){
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
            const statusName = "Do not disturb";
            const page = await getPage(browser, 'Alice',
                publicTestMapUrl("tests/E2E/empty.json", "availability-status")
            );
            if (isMobile(page)) {
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }

            await Menu.closeNotificationPopUp(page);
            await Menu.openStatusList(page, false);
            await Menu.clickOnStatus(page,statusName);
            await page.waitForTimeout(500);

            await Menu.openStatusList(page, false);
            await expect(page.getByRole('button', { name: statusName }).locator('svg')).toBeVisible();

            //move to trigger status change 
            await Map.walkTo(page,'ArrowRight',100);
            await Menu.expectStatus(page, 'Online');
            await page.close();
            await page.context().close();
        })
        test('should disable microphone and camera', async({ browser, browserName }) => {
            if(browserName === "webkit"){
                 //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
            const statusName = "Do not disturb";
            const page = await getPage(browser, 'Alice',
                publicTestMapUrl("tests/E2E/empty.json", "availability-status")
            );

            await Menu.turnOnCamera(page);
            await Menu.turnOnMicrophone(page);

            //await Menu.closeNotificationPopUp(page);

            await Menu.openStatusList(page, false);
            await Menu.clickOnStatus(page,statusName); 
            //await Menu.closeNotificationPopUp(page);

            await Menu.expectCameraDisabled(page);
            await Menu.expectMicrophoneDisabled(page);
            await page.close();
            await page.context().close();
        })

        test('should keep same webcam and microphone config when you go back to online status',
            async({ browser, browserName }) => {
            if(browserName === "webkit") {
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
            const statusName = "Do not disturb";
            const page = await getPage(browser, 'Alice', 
                publicTestMapUrl("tests/E2E/empty.json", "availability-status")
            );

            await Menu.turnOnCamera(page);
            await Menu.turnOffMicrophone(page)

            await Menu.expectCameraOn(page);
            await Menu.expectMicrophoneOff(page);

            await Menu.openStatusList(page);
            await Menu.clickOnStatus(page,statusName); 

            //move to trigger status change 
            await Map.walkTo(page,'ArrowRight',100)

            await Menu.expectCameraOn(page);
            await Menu.expectMicrophoneOff(page);
            await page.close();
            await page.context().close();
        })
        test.describe('Do not disturb interaction',async()=>{
            test('should not create a bubble ', async({ browser }) => {
                const statusName = "Do not disturb";
                const page = await getPage(browser, 'Alice',
                    publicTestMapUrl("tests/E2E/empty.json", "availability-status")
                );
                const positionToDiscuss = {
                    x: 3 * 32,
                    y: 4 * 32
                };
                await Map.teleportToPosition(page, positionToDiscuss.x, positionToDiscuss.y);

                await Menu.openStatusList(page, false);
                await Menu.clickOnStatus(page,statusName);

                const userBob = await getPage(browser, 'Bob',
                    publicTestMapUrl("tests/E2E/empty.json", "availability-status")
                );

                await Map.teleportToPosition(userBob, positionToDiscuss.x, positionToDiscuss.y);
                await expect( page.locator('button.chat-btn + div>span.animate-ping')).toBeHidden();
                
                await userBob.close();
                await userBob.context().close();
                await page.close();
                await page.context().close();
            })
        })
    })
})
