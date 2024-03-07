
import {expect, test} from '@playwright/test';
import { evaluateScript } from './utils/scripting';
import { login } from './utils/roles';
import Menu  from './utils/menu';
import Map  from './utils/map';
import { publicTestMapUrl } from './utils/urls';

test.describe('Availability Status', () => {

    
    
    test.describe('Busy Status',()=>{
        test('should return to online status when you move',async({ page, browser,browserName },{project})=>{
            const statusName = "Busy";
    
            await page.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
    
            await login(page, 'Alice');
            

            await Menu.clickOnStatus(page,statusName); 
            if((browserName === "firefox" ||browserName === "webkit" ) && page.getByText(`Do you want to allow notification`).isVisible() ){
                await  page.locator("section:has(#notificationPermission) + footer>button.outline").click();
            }
            await page.waitForTimeout(500);
            await Menu.openStatusList(page);
            await expect(page.getByText(statusName)).toHaveCSS('opacity','0.5')
        
        
            //move
 
            const positionToDiscuss = {
                x: 2 * 32,
                y: 2 * 32
            };
            if(project.name === "mobilechromium" || browserName === "webkit" ) {
                await Menu.closeNotificationPopUp
                await Map.walkToPosition(page,positionToDiscuss.x,positionToDiscuss.y)
            }else{
                await Map.walkTo(page,'ArrowRight',100)
            }

            await expect(page.getByText("Online")).toHaveCSS('opacity','0.5')

        })
        test('should disable microphone and camera',async({ page, browser,browserName })=>{
            if(browserName === "webkit"){
                 //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
            const statusName = "Busy";
    
            await page.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
    
            await login(page, 'Alice');
            
              // Because webkit in playwright does not support Camera/Microphone Permission by settings


            await Menu.turnOnCamera(page);
            await Menu.turnOnMicrophone(page);

            //await Menu.closeNotificationPopUp(page);

            await Menu.clickOnStatus(page,statusName); 
            //await Menu.closeNotificationPopUp(page);

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
    
            await page.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
    
            await login(page, 'Alice');

            await Menu.turnOnCamera(page);
            await Menu.turnOffMicrophone(page)


            await expect(page.getByAltText('Turn off webcam')).toBeVisible();
            await expect(page.getByAltText('Turn on microphone')).toBeVisible();

            await Menu.clickOnStatus(page,statusName);
            //await Menu.closeNotificationPopUp(page);
            const positionToDiscuss = {
                x: 3 * 32,
                y: 4 * 32
            };
            await Map.walkToPosition(page, positionToDiscuss.x, positionToDiscuss.y);

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


            await page.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
    
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
                     //eslint-disable-next-line playwright/no-skipped-test
                    test.skip();
                    return;
                }
                const statusName = "Busy";
                await page.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
        
                await login(page, 'Alice');
                const positionToDiscuss = {
                    x: 3 * 32,
                    y: 4 * 32
                };
                await Map.teleportToPosition(page, positionToDiscuss.x, positionToDiscuss.y);
                
                const newBrowser = await browser.browserType().launch();
                const userBob = await newBrowser.newPage();
            
                await userBob.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
               // Login user "Bob"
                const secondPageName = 'Bob'
                await login(userBob, secondPageName);
                
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
                
                if((browserName === "firefox") && page.getByText(`Do you want to allow notification`).isVisible() ){
                    await  page.locator("section:has(#notificationPermission) + footer>button.outline").click();
                }

                await expect(page.getByText(`${secondPageName} wants to discuss with you`)).toBeVisible();
                await expect(await isInBubble).toBeTruthy();
                
                await newBrowser.close();

                
            })
            test('should return to online status after accept conversation',async({ page, browser,context,browserName})=>{
                if(browserName === "webkit"){
                     //eslint-disable-next-line playwright/no-skipped-test
                    test.skip();
                    return;
                }
                const statusName = "Busy";
                await page.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
        
                await login(page, 'Alice');

                const positionToDiscuss = {
                    x: 3 * 32,
                    y: 4 * 32
                };
                await Map.teleportToPosition(page, positionToDiscuss.x, positionToDiscuss.y);

                await Menu.clickOnStatus(page,statusName);
                //await Menu.closeNotificationPopUp(page);

                const newBrowser = await browser.browserType().launch();
                const userBob = await newBrowser.newPage();

                await userBob.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
               // Login user "Bob"
                const secondPageName = 'Bob'
                await login(userBob, secondPageName);
                await Map.teleportToPosition(userBob, positionToDiscuss.x, positionToDiscuss.y);
                
                
                if((browserName === "firefox" ) && page.getByText(`Do you want to allow notification`).isVisible() ){
                    await  page.locator("section:has(#notificationPermission) + footer>button.outline").click();
                }
                await expect(page.getByText(`${secondPageName} wants to discuss with you`)).toBeVisible();
                
                await page.locator('section:has(#acceptDiscussion) + footer>button.light').click();
                await Menu.openStatusList(page);
                await expect(page.getByText("Online")).toHaveCSS('opacity','0.5')   
                await newBrowser.close();
            })
            test('should keep busy status  after refuse conversation',async({ page, browser,browserName})=>{
                
                if(browserName === "webkit"){
                     //eslint-disable-next-line playwright/no-skipped-test
                    test.skip();
                    return;
                }

                const statusName = "Busy";
                await page.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
        
                await login(page, 'Alice');
                const positionToDiscuss = {
                    x: 3 * 32,
                    y: 4 * 32
                };
                await Map.teleportToPosition(page, positionToDiscuss.x, positionToDiscuss.y);

                await Menu.clickOnStatus(page,statusName); 
               // await Menu.closeNotificationPopUp(page);

                const newBrowser = await browser.browserType().launch();
                const userBob = await newBrowser.newPage();

                await userBob.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
               // Login user "Bob"
                const secondPageName = 'Bob'
                await login(userBob, secondPageName);
                await Map.teleportToPosition(userBob, positionToDiscuss.x, positionToDiscuss.y);
                
                if((browserName === "firefox") && page.getByText(`Do you want to allow notification`).isVisible() ){
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
        test('should return to online status when you move',async({ page, browser,browserName },{project})=>{
            const statusName = "Back in a moment";
    
    
            await page.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
    
            await login(page, 'Alice');
            

            await Menu.clickOnStatus(page,statusName); 

        
            
            await page.waitForTimeout(500);

            await Menu.openStatusList(page);
            
            await expect(page.getByText(statusName)).toHaveCSS('opacity','0.5')
            const positionToDiscuss = {
                x: 2 * 32,
                y: 2 * 32
            };

            if(project.name === "mobilechromium" || browserName === "webkit") {
                await Menu.closeNotificationPopUp(page)
                await Map.walkToPosition(page,positionToDiscuss.x,positionToDiscuss.y)
            }else{
                await Map.walkTo(page,'ArrowRight',100)
            }

            

            await expect(page.getByText("Online")).toHaveCSS('opacity','0.5')

        })
        test('should disable microphone and camera',async({ page, browser,browserName })=>{
            const statusName = "Back in a moment";
            if(browserName === "webkit"){
                 //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
            await page.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
    
            await login(page, 'Alice');

            await Menu.turnOnCamera(page);
            await Menu.turnOnMicrophone(page);

            //await Menu.closeNotificationPopUp(page);

            await Menu.clickOnStatus(page,statusName); 
            //await Menu.closeNotificationPopUp(page);

            await expect(page.getByAltText('Turn off webcam')).toBeHidden();
            await expect(page.getByAltText('Turn off microphone')).toBeHidden();
            

            

        })

        test('should keep same webcam and microphone config when you go back to online status',async({ page, browser,context,browserName },{project})=>{
            if(project.name === "mobilechromium" || browserName === "webkit") {
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
            const statusName = "Back in a moment";
    
            await page.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
    
            await login(page, 'Alice');
            

            await Menu.turnOnCamera(page);
            await Menu.turnOffMicrophone(page)


            await expect(page.getByAltText('Turn off webcam')).toBeVisible();
            await expect(page.getByAltText('Turn on microphone')).toBeVisible();

            await Menu.clickOnStatus(page,statusName); 
                        //move
            const positionToDiscuss = {
                x: 3 * 32,
                y: 4 * 32
            };
            await Map.walkToPosition(page, positionToDiscuss.x, positionToDiscuss.y);
                        

            await expect(page.getByAltText('Turn off webcam')).toBeVisible();
            await expect(page.getByAltText('Turn on microphone')).toBeVisible();
        })
        test.describe('Back in a moment interaction',async()=>{
            test('should not create a bubble',async({ page, browser,context})=>{
                const statusName = "Back in a moment";
                await page.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
        
                await login(page, 'Alice');
                const positionToDiscuss = {
                    x: 3 * 32,
                    y: 4 * 32
                };
                await Map.teleportToPosition(page, positionToDiscuss.x, positionToDiscuss.y);
            
                await Menu.clickOnStatus(page,statusName); 

                const newBrowser = await browser.browserType().launch();
                const userBob = await newBrowser.newPage();

                await userBob.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
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
        test('should return to online status when you move',async({ page, browser,browserName },{project})=>{
            const statusName = "Do not disturb";
    
            await page.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
    
            await login(page, 'Alice');
            

  
            await Menu.closeNotificationPopUp(page);
            await Menu.clickOnStatus(page,statusName);
            await page.waitForTimeout(500);

            await Menu.openStatusList(page);
            await expect(page.getByText(statusName)).toHaveCSS('opacity','0.5')
        
        
            //move
            
            const positionToDiscuss = {
                x: 2 * 32,
                y: 2 * 32
            };

            if(project.name === "mobilechromium" || browserName === "webkit" ) {
                await Map.walkToPosition(page,positionToDiscuss.x,positionToDiscuss.y)
            }else{
                await Map.walkTo(page,'ArrowRight',100)
            }

            await expect(page.getByText("Online")).toHaveCSS('opacity','0.5')

        })
        test('should disable microphone and camera',async({ page, browser,browserName })=>{
            if(browserName === "webkit"){
                 //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
            const statusName = "Do not disturb";

            await page.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
    
            await login(page, 'Alice');


            await Menu.turnOnCamera(page);
            await Menu.turnOnMicrophone(page);

            //await Menu.closeNotificationPopUp(page);

            await Menu.clickOnStatus(page,statusName); 
            //await Menu.closeNotificationPopUp(page);

            await expect(page.getByAltText('Turn off webcam')).toBeHidden();
            await expect(page.getByAltText('Turn off microphone')).toBeHidden();
            

            

        })

        test('should keep same webcam and microphone config when you go back to online status',async({ page, browser,context,browserName },{project})=>{
            
            if(project.name === "mobilechromium" || browserName === "webkit") {
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
            const statusName = "Do not disturb";
    
            await page.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
    
            await login(page, 'Alice');
        
            await Menu.turnOnCamera(page);
            await Menu.turnOffMicrophone(page)


            await expect(page.getByAltText('Turn off webcam')).toBeVisible();
            await expect(page.getByAltText('Turn on microphone')).toBeVisible();

            await Menu.clickOnStatus(page,statusName); 

                        //move
            const positionToDiscuss = {
                x: 3 * 32,
                y: 4 * 32
            };
            await Map.walkToPosition(page, positionToDiscuss.x, positionToDiscuss.y);
                        

            await expect(page.getByAltText('Turn off webcam')).toBeVisible();
            await expect(page.getByAltText('Turn on microphone')).toBeVisible();
        })
        test.describe('Do not disturb interaction',async()=>{
            test('should not create a bubble ',async({ page, browser,context})=>{
                const statusName = "Do not disturb";
                await page.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
        
                await login(page, 'Alice');
                const positionToDiscuss = {
                    x: 3 * 32,
                    y: 4 * 32
                };
                await Map.teleportToPosition(page, positionToDiscuss.x, positionToDiscuss.y);
            
                await Menu.clickOnStatus(page,statusName); 

                const newBrowser = await browser.browserType().launch();
                const userBob = await newBrowser.newPage();


                await userBob.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
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



