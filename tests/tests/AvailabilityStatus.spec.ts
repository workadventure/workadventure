import {expect, test} from '@playwright/test';
import { evaluateScript } from './utils/scripting';
import Menu  from './utils/menu';
import Map  from './utils/map';
import { publicTestMapUrl } from './utils/urls';
import { getPage } from './utils/auth'
import {isMobile} from "./utils/isMobile";

test.describe('Availability Status', () => {
    test.describe('Busy Status',() => {
        test('should return to online status when you move @nowebkit',
            async({ browser }, { project }) => {
            // Skip webkit because the moving player with the keyboard doesn't work
            test.skip(project.name === 'webkit', 'WebKit keyboard movement is flaky');
            const statusName = "Busy";

           await using page = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/empty.json", "availability-status")
           );

            await Menu.openMenu(page);
            await Menu.clickOnStatus(page,statusName); 
            /*if((browserName === "firefox") && await page.getByText(`Allow notification`).isVisible() ){
                await  page.locator("section:has(#notificationPermission) + footer>button.outline").click();
            }*/
            await Menu.openMenu(page);
            
            //await expect(page.locator('.status-button').getByText(statusName)).toHaveClass('opacity-50')
            await expect(page.getByRole('button', { name: statusName }).locator('svg')).toBeVisible();

        
            //move to trigger status change 
            await Map.walkTo(page,'ArrowRight',100);
            await expect(page.getByRole('button', { name: 'Online' }).locator('svg')).toBeVisible();

            await page.context().close();
        })
        test('should disable microphone and camera @nowebkit', async({ browser }, { project }) => {
            test.skip(project.name === 'webkit', 'WebKit limitations');
            const statusName = "Busy";
            await using page = await getPage(browser, 'Alice',
                publicTestMapUrl("tests/E2E/empty.json", "availability-status")
            );

            // Because webkit in playwright does not support Camera/Microphone Permission by settings


            await Menu.turnOnCamera(page);
            await Menu.turnOnMicrophone(page);

            //await Menu.closeNotificationPopUp(page);

            await Menu.openMenu(page);
            await Menu.clickOnStatus(page,statusName); 
            //await Menu.closeNotificationPopUp(page);

            await expect(page.getByTestId('camera-button').locator('.bg-danger')).toBeHidden();
            await expect(page.getByTestId('microphone-button').locator('.bg-danger')).toBeHidden();

            await page.context().close();
        })

        test('should keep same webcam and microphone config when you go back to online status @nowebkit',
            async({ browser, browserName })=>{
            test.skip(browserName === 'webkit', 'WebKit limitations');
            const statusName = "Busy";
            await using page = await getPage(browser, 'Alice',
                publicTestMapUrl("tests/E2E/empty.json", "availability-status")
            );
            
            await Menu.turnOnCamera(page);
            await Menu.turnOffMicrophone(page)


            await Menu.expectCameraOn(page);
            await Menu.expectMicrophoneOff(page);

            await Menu.openMenu(page);
            await Menu.clickOnStatus(page,statusName);
            //await Menu.closeNotificationPopUp(page);
            await Map.walkTo(page,'ArrowRight',100)

            await Menu.expectCameraOn(page);
            await Menu.expectMicrophoneOff(page);

            await page.context().close();
        })
        test('should ask to change notification permission when you pass in Busy status and your browser notification permission is denied @nowebkit @nofirefox',
            async({ browser, browserName }) => {
            test.skip(browserName === 'firefox' || browserName === 'webkit', 'Notification permission management issues');
            
            const statusName = "Busy";
            await using page = await getPage(browser, 'Alice',
                publicTestMapUrl("tests/E2E/empty.json", "availability-status")
            );

            await Map.walkTo(page,'ArrowRight',500);

            await Menu.openMenu(page);
            await Menu.clickOnStatus(page,statusName);

            await expect(page.getByText('Allow notifications?')).toBeVisible();

            await page.getByText('Accept').click();

            await expect(page.getByText('Allow notifications?')).toBeHidden();

            await page.context().close();
        })
        
        test.describe('busy interaction', () => {
            test('should open a popup when a bubble is created... @nowebkit',
                async({ browserName, browser }) => {
                test.skip(browserName === 'webkit', 'WebKit limitations');
                const statusName = "Busy";
                await using page = await getPage(browser, 'Alice',
                    publicTestMapUrl("tests/E2E/empty.json", "availability-status")
                );
            
                const positionToDiscuss = {
                    x: 3 * 32,
                    y: 4 * 32
                };
                await Map.teleportToPosition(page, positionToDiscuss.x, positionToDiscuss.y);
                
                await using userBob = await getPage(browser, 'Bob', 
                    publicTestMapUrl("tests/E2E/empty.json", "availability-status")
                )
                const secondPageName = 'Bob'
                
                await Menu.openMenu(page);
                await Menu.clickOnStatus(page,statusName);
                // Click on the Close button in the "Accept notifications" popup
                await page.getByRole('button', { name: 'Close' }).click();
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
                expect(await isInBubble).toBeTruthy();

                await userBob.context().close();

                await page.context().close();
            })
            test('should return to online status after accept conversation @nowebkit',
                async({ browser, browserName }) => {
                test.skip(browserName === 'webkit', 'WebKit limitations');
                const statusName = "Busy";
                await using page = await getPage(browser, 'Alice',
                    publicTestMapUrl("tests/E2E/empty.json", "availability-status")
                );

                const positionToDiscuss = {
                    x: 3 * 32,
                    y: 4 * 32
                };
                await Map.teleportToPosition(page, positionToDiscuss.x, positionToDiscuss.y);

                await Menu.openMenu(page);
                await Menu.clickOnStatus(page,statusName);
                // Click on the Close button in the "Accept notifications" popup
                await page.getByRole('button', { name: 'Close' }).click();
                //await Menu.closeNotificationPopUp(page);

                await using userBob = await getPage(browser, 'Bob',
                    publicTestMapUrl("tests/E2E/empty.json", "availability-status")
                )
                const secondPageName = 'Bob'
                
                await Map.teleportToPosition(userBob, positionToDiscuss.x, positionToDiscuss.y);
                
                
                /*if((browserName === "firefox" ) && await page.getByText(`Allow notification`).isVisible() ){
                    await  page.locator("section:has(#notificationPermission) + footer>button.outline").click();
                }*/
                await expect(page.getByText(`${secondPageName} wants to discuss with you`)).toBeVisible();

                await page.getByText('Accept').first().click();
                await Menu.openMenu(page);
                await expect(page.getByRole('button', { name: 'Online' }).locator('svg')).toBeVisible();

                await userBob.context().close();

                await page.context().close();
            })
            test('should keep busy status  after refuse conversation @nowebkit',
                async({ browser, browserName })=>{
                
                test.skip(browserName === 'webkit', 'WebKit limitations');

                const statusName = "Busy";
                await using page = await getPage(browser, 'Alice',
                    publicTestMapUrl("tests/E2E/empty.json", "availability-status")
                );
                const positionToDiscuss = {
                    x: 3 * 32,
                    y: 4 * 32
                };
                await Map.teleportToPosition(page, positionToDiscuss.x, positionToDiscuss.y);

                await Menu.openMenu(page);
                await Menu.clickOnStatus(page,statusName);
                // Click on the Close button in the "Accept notifications" popup
                await page.getByRole('button', { name: 'Close' }).click();
                // await Menu.closeNotificationPopUp(page);
                await using userBob = await getPage(browser, 'Bob',
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
                await Menu.openMenu(page);
                await expect(page.getByRole('button', { name: statusName }).locator('svg')).toBeVisible();


                await userBob.context().close();

                await page.context().close();
            })
        })

    })
    test.describe('Back in a moment Status',()=>{
        test('should return to online status when you move @nowebkit @nomobile', async({ browser, browserName }) => {
            // Skip webkit because the moving player with the keyboard doesn't work
            test.skip(browserName === 'webkit', 'WebKit limitations');

            const statusName = "Back in a moment";
            await using page = await getPage(browser, 'Alice',
                publicTestMapUrl("tests/E2E/empty.json", "availability-status")
            );
            test.skip(isMobile(page), 'Skip on mobile devices');

            await Menu.openMenu(page);
            await Menu.clickOnStatus(page,statusName);

            await Menu.openMenu(page);

            await expect(page.getByRole('button', { name: statusName }).locator('svg')).toBeVisible();
            await Map.walkTo(page,'ArrowRight',100);
            await Menu.expectStatus(page, 'Online');

            await page.context().close();
        })
        test('should disable microphone and camera @nowebkit',async({ browser, browserName }) => {
            const statusName = "Back in a moment";
            test.skip(browserName === 'webkit', 'WebKit limitations');
            await using page = await getPage(browser, 'Alice',
                publicTestMapUrl("tests/E2E/empty.json", "availability-status")
            );

            await Menu.turnOnCamera(page);
            await Menu.turnOnMicrophone(page);

            //await Menu.closeNotificationPopUp(page);

            await Menu.openMenu(page);
            await Menu.clickOnStatus(page,statusName); 
            //await Menu.closeNotificationPopUp(page);

            await Menu.expectCameraDisabled(page);
            await Menu.expectMicrophoneDisabled(page);

            await page.context().close();
        })

        test('should keep same webcam and microphone config when you go back to online status @nowebkit',
            async({ browser, browserName }) => {
            test.skip(browserName === 'webkit', 'WebKit limitations');
            const statusName = "Back in a moment";
            await using page = await getPage(browser, 'Alice',
                publicTestMapUrl("tests/E2E/empty.json", "availability-status")
            );
            
            await Menu.turnOnCamera(page);
            await Menu.turnOffMicrophone(page)

            await Menu.expectCameraOn(page);
            await Menu.expectMicrophoneOff(page);

            await Menu.openMenu(page);
            await Menu.clickOnStatus(page,statusName); 

            //move to trigger status change 
            await Map.walkTo(page,'ArrowRight',100)

            await Menu.expectCameraOn(page);
            await Menu.expectMicrophoneOff(page);

            await page.context().close();
        })
        test.describe('Back in a moment interaction', ()=>{
            test('should not create a bubble',async({ browser }) => {
                const statusName = "Back in a moment";
                await using page = await getPage(browser, 'Alice',
                    publicTestMapUrl("tests/E2E/empty.json", "availability-status")
                );
                const positionToDiscuss = {
                    x: 3 * 32,
                    y: 4 * 32
                };

                await Map.teleportToPosition(page, positionToDiscuss.x, positionToDiscuss.y);
                await Menu.openMenu(page);
                await Menu.clickOnStatus(page,statusName); 
                
                await using userBob = await getPage(browser, 'Bob', 
                    publicTestMapUrl("tests/E2E/empty.json", "availability-status")
                )
                
                await Map.teleportToPosition(userBob, positionToDiscuss.x, positionToDiscuss.y);
                await expect( page.locator('button.chat-btn + div>span.animate-ping')).toBeHidden();
                
                await userBob.close()
                await userBob.context().close();

                await page.context().close();
            })
        })
    })
    test.describe('Do not disturb Status',()=>{
        test('should return to online status when you move @nowebkit @nomobile', async({ browser, browserName }) => {
            // Skip webkit because the moving player with the keyboard doesn't work
            test.skip(browserName === 'webkit', 'WebKit limitations');
            const statusName = "Do not disturb";
            await using page = await getPage(browser, 'Alice',
                publicTestMapUrl("tests/E2E/empty.json", "availability-status")
            );
            test.skip(isMobile(page), 'Skip on mobile devices');

            await Menu.closeNotificationPopUp(page);
            await Menu.openMenu(page);
            await Menu.clickOnStatus(page,statusName);
            await expect(page.getByTestId('profile-menu')).toBeHidden();

            await Menu.openMenu(page);
            await expect(page.getByRole('button', { name: statusName }).locator('svg')).toBeVisible();

            //move to trigger status change 
            await Map.walkTo(page,'ArrowRight',100);
            await Menu.expectStatus(page, 'Online');

            await page.context().close();
        })
        test('should disable microphone and camera @nowebkit', async({ browser, browserName }) => {
            test.skip(browserName === 'webkit', 'WebKit limitations');
            const statusName = "Do not disturb";
            await using page = await getPage(browser, 'Alice',
                publicTestMapUrl("tests/E2E/empty.json", "availability-status")
            );

            await Menu.turnOnCamera(page);
            await Menu.turnOnMicrophone(page);

            //await Menu.closeNotificationPopUp(page);

            await Menu.openMenu(page);
            await Menu.clickOnStatus(page,statusName); 
            //await Menu.closeNotificationPopUp(page);

            await Menu.expectCameraDisabled(page);
            await Menu.expectMicrophoneDisabled(page);

            await page.context().close();
        })

        test('should keep same webcam and microphone config when you go back to online status @nowebkit',
            async({ browser, browserName }) => {
            test.skip(browserName === 'webkit', 'WebKit limitations');
            const statusName = "Do not disturb";
            await using page = await getPage(browser, 'Alice', 
                publicTestMapUrl("tests/E2E/empty.json", "availability-status")
            );

            await Menu.turnOnCamera(page);
            await Menu.turnOffMicrophone(page)

            await Menu.expectCameraOn(page);
            await Menu.expectMicrophoneOff(page);

            await Menu.openMenu(page);
            await Menu.clickOnStatus(page,statusName); 

            //move to trigger status change 
            await Map.walkTo(page,'ArrowRight',100)

            await Menu.expectCameraOn(page);
            await Menu.expectMicrophoneOff(page);

            await page.context().close();
        })
        test.describe('Do not disturb interaction', ()=>{
            test('should not create a bubble', async({ browser }) => {
                const statusName = "Do not disturb";
                await using page = await getPage(browser, 'Alice',
                    publicTestMapUrl("tests/E2E/empty.json", "availability-status")
                );
                const positionToDiscuss = {
                    x: 3 * 32,
                    y: 4 * 32
                };
                await Map.teleportToPosition(page, positionToDiscuss.x, positionToDiscuss.y);

                await Menu.openMenu(page);
                await Menu.clickOnStatus(page,statusName);

                await using userBob = await getPage(browser, 'Bob',
                    publicTestMapUrl("tests/E2E/empty.json", "availability-status")
                );

                await Map.teleportToPosition(userBob, positionToDiscuss.x, positionToDiscuss.y);
                await expect( page.locator('button.chat-btn + div>span.animate-ping')).toBeHidden();
                

                await userBob.context().close();

                await page.context().close();
            })
        })
    })
})
