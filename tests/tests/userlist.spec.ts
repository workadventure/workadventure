
import {expect, test} from '@playwright/test';
import { Position } from '../../play/packages/iframe-api-typings/iframe_api';
import { login } from './utils/roles';
import Map  from './utils/map';
import { publicTestMapUrl } from './utils/urls';
import chatUtils from './utils/chat';
import { evaluateScript } from './utils/scripting';


test.describe('Walk to', () =>{
        test('walk to a user ',async({ page, browser}, {project})=>{
          if (project.name === "mobilechromium") {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
          }

            const isMobileTest = project.name === "mobilechromium";
            await page.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
    
           await login(page, 'Alice', 2, 'en-US', isMobileTest);

            const alicePosition = {
                x: 3 * 32,
                y: 4 * 32
            };

            await Map.teleportToPosition(page, alicePosition.x, alicePosition.y);
        
            const newBrowser = await browser.browserType().launch();
            const userBob = await newBrowser.newPage();


            await userBob.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
           // Login user "Bob"
            await login(userBob, secondPageName, 3, 'en-US', isMobileTest);
            //await Map.teleportToPosition(userBob, positionToDiscuss.x, positionToDiscuss.y);

            await chatUtils.open(userBob,false);
            await chatUtils.slideToUsers(userBob);
            await chatUtils.UL_walkTo(userBob,"Alice");

            const position : Position = await evaluateScript(
                userBob,
                async () => {
                  await WA.onInit();
        
                  return WA.player.getPosition();
                },
                
              );
            
              expect(position.x).toBe(alicePosition.x);
              expect(position.y).toBe(alicePosition.y);
              
            await newBrowser.close();
        })
})
