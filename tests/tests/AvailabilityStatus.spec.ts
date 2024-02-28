
import {expect, test} from '@playwright/test';
import {RENDERER_MODE} from "./utils/environment";
import { evaluateScript } from './utils/scripting';
import { login } from './utils/roles';
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
            
            //verifier changement statut
            await Menu.openStatusList(page);
            await expect(page.getByText(statusName)).toHaveCSS('opacity','0.5')
            //move
            await Map.walkTo(page,'ArrowRight')
            await expect(page.getByText("Online")).toHaveCSS('opacity','0.5')
            //verrifier status online

        })
        test('should disable microphone and camera',async({ page, browser })=>{
            const statusName = "Busy";
    
            await page.goto(
                `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
            );
    
            await login(page, 'Alice');
            
            await page.getByText("Continue without webcam").click();

            await expect(page.getByAltText('Turn on webcam')).toBeVisible();
            await expect(page.getByAltText('Turn on microphone')).toBeVisible();

            await Menu.clickOnStatus(page,statusName); 

            await expect(page.getByAltText('Turn on webcam')).toBeHidden();
            await expect(page.getByAltText('Turn on microphone')).toBeHidden();
            

        })

        test('should keep same webcam and microphone config when you go back to online status',async({ page, browser,context })=>{
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
            await Map.walkTo(page,'ArrowRight',500);

            await expect(page.getByAltText('Turn off webcam')).toBeVisible();
            await expect(page.getByAltText('Turn on microphone')).toBeVisible();
        })
        test.skip('should ask notification permission when you pass in Busy status and your browser notification permission is default',async({ page, browser,context})=>{
          
            const statusName = "Busy";

            await context.clearPermissions();
            await context.grantPermissions(['camera','microphone','notifications']);


            const map_URL =  `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`;
            
   
            await page.goto(map_URL);
    
            await login(page, 'Alice');
            await Map.walkTo(page,'ArrowRight',500);
            await Menu.clickOnStatus(page,statusName);
            const permission =    await evaluateScript(page, async () => Notification.permission)

            console.log(permission);

  
        })
        test.describe('busy interaction',async()=>{
            test('should open a popup when a bubble is create...',async({ page, browser,context})=>{
                const statusName = "Busy";
                const map_URL =  `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`;
                await page.goto(map_URL);
        
                await login(page, 'Alice');
                await Map.walkTo(page,'ArrowRight',500);
                await Menu.clickOnStatus(page,statusName); 

                const isInBubble = evaluateScript(page, async () => {
                    return new Promise((resolve) => {
                        WA.player.proximityMeeting.onJoin().subscribe((user) => {
                            console.log("Entering proximity meeting with", user);
                            resolve(true)
                        });
                    });
                });

               //creer un 2eme browser
                const newBrowser = await browser.browserType().launch();
                const userBob = await newBrowser.newPage();
            
                await userBob.goto(map_URL);
               // Login user "Bob"
               const secondPageName = 'Bob'
                await login(userBob, secondPageName);
                await Map.walkTo(userBob,'ArrowRight',500);
                

                await expect(page.getByText(`${secondPageName} wants to discuss with you`)).toBeVisible();
                expect(await isInBubble).toBeTruthy();
                
             

                
            })
            test('should return to online status after accept conversation',async({ page, browser,context})=>{
                const statusName = "Busy";
                const map_URL =  `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`;
                await page.goto(map_URL);
        
                await login(page, 'Alice');
                await Map.walkTo(page,'ArrowRight',500);
                await Menu.clickOnStatus(page,statusName); 

               //creer un 2eme browser
                const newBrowser = await browser.browserType().launch();
                const userBob = await newBrowser.newPage();
            
                await userBob.goto(map_URL);
               // Login user "Bob"
                const secondPageName = 'Bob'
                await login(userBob, secondPageName);
                await Map.walkTo(userBob,'ArrowRight',500);
                

                await expect(page.getByText(`${secondPageName} wants to discuss with you`)).toBeVisible();
                await page.getByRole('button', { name: 'Accept' }).click()
                await Menu.openStatusList(page);
                await expect(page.getByText("Online")).toHaveCSS('opacity','0.5')   
            })
            test('should keep busy status  after refuse conversation',async({ page, browser,context})=>{
                const statusName = "Busy";
                const map_URL =  `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`;
                await page.goto(map_URL);
        
                await login(page, 'Alice');
                await Map.walkTo(page,'ArrowRight',500);
                await Menu.clickOnStatus(page,statusName); 

               //creer un 2eme browser
                const newBrowser = await browser.browserType().launch();
                const userBob = await newBrowser.newPage();
            
                await userBob.goto(map_URL);
               // Login user "Bob"
                const secondPageName = 'Bob'
                await login(userBob, secondPageName);
                await Map.walkTo(userBob,'ArrowRight',500);
                

                await expect(page.getByText(`${secondPageName} wants to discuss with you`)).toBeVisible();
                await page.getByRole('button', { name: 'Close' }).click()
                await Menu.openStatusList(page);
                await expect(page.getByText(statusName)).toHaveCSS('opacity','0.5')    
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
            
           // await page.getByText("Continue without webcam").click();

            await Menu.clickOnStatus(page,statusName); 
            
            //verifier changement statut
            await Menu.openStatusList(page);
            await expect(page.getByText(statusName)).toHaveCSS('opacity','0.5')
            //move
            await Map.walkTo(page,'ArrowRight')
            await expect(page.getByText("Online")).toHaveCSS('opacity','0.5')
            //verrifier status online

        })
        test('should disable microphone and camera',async({ page, browser })=>{
            const statusName = "Back in a moment";
    
            await page.goto(
                `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
            );
    
            await login(page, 'Alice');
            
            await expect(page.getByAltText('Turn on webcam')).toBeVisible();
            await expect(page.getByAltText('Turn on microphone')).toBeVisible();

            await Menu.clickOnStatus(page,statusName); 

            await expect(page.getByAltText('Turn on webcam')).toBeHidden();
            await expect(page.getByAltText('Turn on microphone')).toBeHidden();
            

        })

        test('should keep same webcam and microphone config when you go back to online status',async({ page, browser,context })=>{
            const statusName = "Back in a moment";
    
            await page.goto(
                `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
            );
    
            await login(page, 'Alice');
            

            await Menu.turnOnCamera(page);
            await Menu.turnOffMicrophone(page)


            await expect(page.getByAltText('Turn off webcam')).toBeVisible();
            await expect(page.getByAltText('Turn on microphone')).toBeVisible();

            await Menu.clickOnStatus(page,statusName); 
            await Map.walkTo(page,'ArrowRight',500);

            await expect(page.getByAltText('Turn off webcam')).toBeVisible();
            await expect(page.getByAltText('Turn on microphone')).toBeVisible();
        })
        test.describe('Back in a moment interaction',async()=>{
            test('should open a popup when a bubble is create...',async({ page, browser,context})=>{
                const statusName = "Back in a moment";
                const map_URL =  `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`;
                await page.goto(map_URL);
        
                await login(page, 'Alice');
                await Map.walkTo(page,'ArrowRight',500);
            
                await Menu.clickOnStatus(page,statusName); 

               //creer un 2eme browser
                const newBrowser = await browser.browserType().launch();
                const userBob = await newBrowser.newPage();
            
                await userBob.goto(map_URL);
               // Login user "Bob"
               const secondPageName = 'Bob'
                await login(userBob, secondPageName);
                await Map.walkTo(userBob,'ArrowRight',500);
                await expect( page.locator('button.chat-btn + div>span.tw-animate-ping')).toBeHidden();
            })
        })

    })
    test.describe('do not disturb Status',()=>{
        test('should return to online status when you move',async({ page, browser })=>{
            const statusName = "Do not disturb";
    
            await page.goto(
                `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
            );
    
            await login(page, 'Alice');
            
           // await page.getByText("Continue without webcam").click();

            await Menu.clickOnStatus(page,statusName); 
            
            //verifier changement statut
            await Menu.openStatusList(page);
            await expect(page.getByText(statusName)).toHaveCSS('opacity','0.5')
            //move
            await Map.walkTo(page,'ArrowRight')
            await expect(page.getByText("Online")).toHaveCSS('opacity','0.5')
            //verrifier status online

        })
        test('should disable microphone and camera',async({ page, browser })=>{
            const statusName = "Do not disturb";
    
            await page.goto(
                `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
            );
    
            await login(page, 'Alice');
            

            await expect(page.getByAltText('Turn on webcam')).toBeVisible();
            await expect(page.getByAltText('Turn on microphone')).toBeVisible();

            await Menu.clickOnStatus(page,statusName); 

            await expect(page.getByAltText('Turn on webcam')).toBeHidden();
            await expect(page.getByAltText('Turn on microphone')).toBeHidden();
            

        })

        test('should keep same webcam and microphone config when you go back to online status',async({ page, browser,context })=>{
            const statusName = "Do not disturb";
    
            await page.goto(
                `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
            );
    
            await login(page, 'Alice');
            
           // await page.getByText("Continue without webcam").click();

            await Menu.turnOnCamera(page);
            await Menu.turnOffMicrophone(page)


            await expect(page.getByAltText('Turn off webcam')).toBeVisible();
            await expect(page.getByAltText('Turn on microphone')).toBeVisible();

            await Menu.clickOnStatus(page,statusName); 
            await Map.walkTo(page,'ArrowRight',500);

            await expect(page.getByAltText('Turn off webcam')).toBeVisible();
            await expect(page.getByAltText('Turn on microphone')).toBeVisible();
        })
        test.describe('Do not disturb interaction',async()=>{
            test('should open a popup when a bubble is create...',async({ page, browser,context})=>{
                const statusName = "Do not disturb";
                const map_URL =  `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`;
                await page.goto(map_URL);
        
                await login(page, 'Alice');
                await Map.walkTo(page,'ArrowRight',500);
            
                await Menu.clickOnStatus(page,statusName); 

               //creer un 2eme browser
                const newBrowser = await browser.browserType().launch();
                const userBob = await newBrowser.newPage();
            
                await userBob.goto(map_URL);
               // Login user "Bob"
               const secondPageName = 'Bob'
                await login(userBob, secondPageName);
                await Map.walkTo(userBob,'ArrowRight',500);
                await expect( page.locator('button.chat-btn + div>span.tw-animate-ping')).toBeHidden();
            })
        })

    })
})



