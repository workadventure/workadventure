
import {expect, test} from '@playwright/test';
import {RENDERER_MODE} from "./utils/environment";
import { evaluateScript } from './utils/scripting';
import { hideNoCamera, login } from './utils/roles';
import Menu  from './utils/menu';
import Map  from './utils/map';

test.describe('Availability Status', () => {

    
    
    test.describe('Busy Status',()=>{
        test('should return to online status when you move',async({ page, browser })=>{
          
            const statusName = "Busy";
    
            await page.goto(
                `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
            );
    
            await login(page, 'Alice');
            

            await Menu.clickOnStatus(page,statusName); 
            
            await Menu.openStatusList(page);
            await expect(page.getByText(statusName)).toHaveCSS('opacity','0.5')
            //move
            await Map.walkTo(page,'ArrowRight')
            await expect(page.getByText("Online")).toHaveCSS('opacity','0.5')

        })
        test('should disable microphone and camera',async({ page, browser,browserName })=>{
            if(browserName === "webkit"){
               test.skip();
               return;
            }
            const statusName = "Busy";
    
            await page.goto(
                `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
            );
    
            await login(page, 'Alice');
            
              // Because webkit in playwright does not support Camera/Microphone Permission by settings


            await Menu.turnOnCamera(page);
            await Menu.turnOnMicrophone(page);

            await Menu.closeNotificationPopUp(page);

            await Menu.clickOnStatus(page,statusName); 
            await Menu.closeNotificationPopUp(page);

            await expect(page.getByAltText('Turn off webcam')).toBeHidden();
            await expect(page.getByAltText('Turn off microphone')).toBeHidden();
            

        })

        test('should keep same webcam and microphone config when you go back to online status',async({ page, browser,context,browserName },{project})=>{
            if(project.name === "mobilechromium" || browserName === "webkit") {
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
            const statusName = "Busy";
    
            await page.goto(
                `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
            );
    
            await login(page, 'Alice');

            await Menu.turnOnCamera(page);
            await Menu.turnOffMicrophone(page)


            await expect(page.getByAltText('Turn off webcam')).toBeVisible();
            await expect(page.getByAltText('Turn on microphone')).toBeVisible();

            await Menu.clickOnStatus(page,statusName);
            await Menu.closeNotificationPopUp(page);
            await Map.walkTo(page,'ArrowRight');

            await expect(page.getByAltText('Turn off webcam')).toBeVisible();
            await expect(page.getByAltText('Turn on microphone')).toBeVisible();
        })
        test('should ask to change notification permission when you pass in Busy status and your browser notification permission is denied',async({ page, browser,context,browserName})=>{
            if(browserName === "firefox" || browserName === "webkit"){
                //skip for firefox because of notification permission management
                test.skip();
                return;
            }
            
            const statusName = "Busy";
            const map_URL =  `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`;
            

            await page.goto(map_URL);
    
            await login(page, 'Alice');
            await Map.walkTo(page,'ArrowRight',500);

            await Menu.clickOnStatus(page,statusName);

            await expect(page.getByRole("button",{name:'continue without notification'})).toBeVisible();

            await page.getByText('continue without notification').click();

            await expect(page.locator('continue without notification')).toBeHidden();
        })
        
        test.describe('busy interaction',async()=>{
            test('should open a popup when a bubble is create...',async({ page, browserName,browser,context})=>{
                if(browserName === "webkit"){
                    test.skip();
                    return;
                }
                const statusName = "Busy";
                const map_URL =  `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`;
                await page.goto(map_URL);
        
                await login(page, 'Alice');
                const positionToDiscuss = {
                    x: 3 * 32,
                    y: 4 * 32
                };
                await Map.teleportToPosition(page, positionToDiscuss.x, positionToDiscuss.y);
                await Menu.clickOnStatus(page,statusName); 
                await Menu.closeNotificationPopUp(page);

                const isInBubble = evaluateScript(page, async () => {
                    return new Promise((resolve) => {
                        WA.player.proximityMeeting.onJoin().subscribe((user) => {
                            console.log("Entering proximity meeting with", user);
                            resolve(true)
                        });
                    });
                });

                const newBrowser = await browser.browserType().launch();
                const userBob = await newBrowser.newPage();
            
                await userBob.goto(map_URL);
               // Login user "Bob"
                const secondPageName = 'Bob'
                await login(userBob, secondPageName);
                await Map.teleportToPosition(userBob, positionToDiscuss.x, positionToDiscuss.y);
                
                if((browserName === "firefox"  || browserName === "webkit") && page.getByText(`Do you want to allow notification`).isVisible() ){
                    await  page.locator("section:has(#notificationPermission) + footer>button.outline").click();
                }

                await expect(page.getByText(`${secondPageName} wants to discuss with you`)).toBeVisible();
                expect(await isInBubble).toBeTruthy();
                
                await newBrowser.close();

                
            })
            test('should return to online status after accept conversation',async({ page, browser,context,browserName})=>{
                const statusName = "Busy";
                const map_URL =  `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`;
                await page.goto(map_URL);
        
                await login(page, 'Alice');

                const positionToDiscuss = {
                    x: 3 * 32,
                    y: 4 * 32
                };
                await Map.teleportToPosition(page, positionToDiscuss.x, positionToDiscuss.y);

                await Menu.clickOnStatus(page,statusName);
                await Menu.closeNotificationPopUp(page);

                const newBrowser = await browser.browserType().launch();
                const userBob = await newBrowser.newPage();

                await userBob.goto(map_URL);
               // Login user "Bob"
                const secondPageName = 'Bob'
                await login(userBob, secondPageName);
                await Map.teleportToPosition(userBob, positionToDiscuss.x, positionToDiscuss.y);
                
                
                if((browserName === "firefox" || browserName === "webkit") && page.getByText(`Do you want to allow notification`).isVisible() ){
                    await  page.locator("section:has(#notificationPermission) + footer>button.outline").click();
                }
                await expect(page.getByText(`${secondPageName} wants to discuss with you`)).toBeVisible();
                
                await page.locator('section:has(#acceptDiscussion) + footer>button.light').click();
                await Menu.openStatusList(page);
                await expect(page.getByText("Online")).toHaveCSS('opacity','0.5')   
                await newBrowser.close();
            })
            test('should keep busy status  after refuse conversation',async({ page, browser,browserName})=>{
                const statusName = "Busy";
                const map_URL =  `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`;
                await page.goto(map_URL);
        
                await login(page, 'Alice');
                const positionToDiscuss = {
                    x: 3 * 32,
                    y: 4 * 32
                };
                await Map.teleportToPosition(page, positionToDiscuss.x, positionToDiscuss.y);

                await Menu.clickOnStatus(page,statusName); 
                await Menu.closeNotificationPopUp(page);

                const newBrowser = await browser.browserType().launch();
                const userBob = await newBrowser.newPage();

                await userBob.goto(map_URL);
               // Login user "Bob"
                const secondPageName = 'Bob'
                await login(userBob, secondPageName);
                await Map.teleportToPosition(userBob, positionToDiscuss.x, positionToDiscuss.y);
                
                if((browserName === "firefox" || browserName === "webkit") && page.getByText(`Do you want to allow notification`).isVisible() ){
                    await  page.locator("section:has(#notificationPermission) + footer>button.outline").click();
                }

                await expect(page.getByText(`${secondPageName} wants to discuss with you`)).toBeVisible();

                //click on close button
                await  page.locator("section:has(#acceptDiscussion) + footer>button.outline").click();
                await Menu.openStatusList(page);
                await expect(page.getByText(statusName)).toHaveCSS('opacity','0.5')  
                
                await newBrowser.close();
            })
        })

    })
    test.describe('Back in a moment Status',()=>{
      
        test('should return to online status when you move',async({ page, browser })=>{
            const statusName = "Back in a moment";
    
            await page.goto(
                `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
            );
    
            await login(page, 'Alice');
            

            await Menu.clickOnStatus(page,statusName); 
            
            await Menu.openStatusList(page);
            await expect(page.getByText(statusName)).toHaveCSS('opacity','0.5')
            //move
            await Map.walkTo(page,'ArrowRight');

            await expect(page.getByText("Online")).toHaveCSS('opacity','0.5')

        })
        test('should disable microphone and camera',async({ page, browser,browserName })=>{
            const statusName = "Back in a moment";
    
            await page.goto(
                `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
            );
    
            await login(page, 'Alice');
            if(browserName === "webkit"){
                await hideNoCamera(page);
            }

            await Menu.turnOnCamera(page);
            await Menu.turnOnMicrophone(page);

            await Menu.closeNotificationPopUp(page);

            await Menu.clickOnStatus(page,statusName); 
            await Menu.closeNotificationPopUp(page);

            await expect(page.getByAltText('Turn off webcam')).toBeHidden();
            await expect(page.getByAltText('Turn off microphone')).toBeHidden();
            

            

        })

        test('should keep same webcam and microphone config when you go back to online status',async({ page, browser,context,browserName },{project})=>{
            if(project.name === "mobilechromium") {
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
            const statusName = "Back in a moment";
    
            await page.goto(
                `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
            );
    
            await login(page, 'Alice');
            
            if(browserName === "webkit"){
                await hideNoCamera(page);
            }
            await Menu.turnOnCamera(page);
            await Menu.turnOffMicrophone(page)


            await expect(page.getByAltText('Turn off webcam')).toBeVisible();
            await expect(page.getByAltText('Turn on microphone')).toBeVisible();

            await Menu.clickOnStatus(page,statusName); 
            await Map.walkTo(page,'ArrowRight');

            await expect(page.getByAltText('Turn off webcam')).toBeVisible();
            await expect(page.getByAltText('Turn on microphone')).toBeVisible();
        })
        test.describe('Back in a moment interaction',async()=>{
            test('should not create a bubble',async({ page, browser,context})=>{
                const statusName = "Back in a moment";
                const map_URL =  `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`;
                await page.goto(map_URL);
        
                await login(page, 'Alice');
                const positionToDiscuss = {
                    x: 3 * 32,
                    y: 4 * 32
                };
                await Map.teleportToPosition(page, positionToDiscuss.x, positionToDiscuss.y);
            
                await Menu.clickOnStatus(page,statusName); 

                const newBrowser = await browser.browserType().launch();
                const userBob = await newBrowser.newPage();

                await userBob.goto(map_URL);
               // Login user "Bob"
               const secondPageName = 'Bob'
                await login(userBob, secondPageName);
                await Map.teleportToPosition(userBob, positionToDiscuss.x, positionToDiscuss.y);
                await expect( page.locator('button.chat-btn + div>span.tw-animate-ping')).toBeHidden();
                await newBrowser.close();
            })
        })

    })
    test.describe('Do not disturb Status',()=>{
        test('should return to online status when you move',async({ page, browser })=>{
            const statusName = "Do not disturb";
    
            await page.goto(
                `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
            );
    
            await login(page, 'Alice');

            await Menu.clickOnStatus(page,statusName); 
            
            await Menu.openStatusList(page);
            await expect(page.getByText(statusName)).toHaveCSS('opacity','0.5')
            //move
            await Map.walkTo(page,'ArrowRight');
            await expect(page.getByText("Online")).toHaveCSS('opacity','0.5')

        })
        test('should disable microphone and camera',async({ page, browser,browserName })=>{
            const statusName = "Do not disturb";
    
            await page.goto(
                `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
            );
    
            await login(page, 'Alice');
            if(browserName === "webkit"){
                await hideNoCamera(page);
            }

            await Menu.turnOnCamera(page);
            await Menu.turnOnMicrophone(page);

            await Menu.closeNotificationPopUp(page);

            await Menu.clickOnStatus(page,statusName); 
            await Menu.closeNotificationPopUp(page);

            await expect(page.getByAltText('Turn off webcam')).toBeHidden();
            await expect(page.getByAltText('Turn off microphone')).toBeHidden();
            

            

        })

        test('should keep same webcam and microphone config when you go back to online status',async({ page, browser,context,browserName },{project})=>{
            if(project.name === "mobilechromium") {
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
            const statusName = "Do not disturb";
    
            await page.goto(
                `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
            );
    
            await login(page, 'Alice');
            
            if(browserName === "webkit"){
                await hideNoCamera(page);
            }
            await Menu.turnOnCamera(page);
            await Menu.turnOffMicrophone(page)


            await expect(page.getByAltText('Turn off webcam')).toBeVisible();
            await expect(page.getByAltText('Turn on microphone')).toBeVisible();

            await Menu.clickOnStatus(page,statusName); 

            await Map.walkTo(page,'ArrowRight');

            await expect(page.getByAltText('Turn off webcam')).toBeVisible();
            await expect(page.getByAltText('Turn on microphone')).toBeVisible();
        })
        test.describe('Do not disturb interaction',async()=>{
            test('should not create a bubble ',async({ page, browser,context})=>{
                const statusName = "Do not disturb";
                const map_URL =  `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`;
                await page.goto(map_URL);
        
                await login(page, 'Alice');
                const positionToDiscuss = {
                    x: 3 * 32,
                    y: 4 * 32
                };
                await Map.teleportToPosition(page, positionToDiscuss.x, positionToDiscuss.y);
            
                await Menu.clickOnStatus(page,statusName); 

                const newBrowser = await browser.browserType().launch();
                const userBob = await newBrowser.newPage();


                await userBob.goto(map_URL);
               // Login user "Bob"
               const secondPageName = 'Bob'
                await login(userBob, secondPageName);

                await Map.teleportToPosition(userBob, positionToDiscuss.x, positionToDiscuss.y);
                await expect( page.locator('button.chat-btn + div>span.tw-animate-ping')).toBeHidden();
                await newBrowser.close();
            })
        })

    })
})



