import {expect, test} from '@playwright/test';
import {evaluateScript} from "./utils/scripting";
import {publicTestMapUrl} from "./utils/urls";
import { getPage } from './utils/auth';
import Menu from "./utils/menu";

test.describe('Scripting space-related functions', () => {
    test('can join and watch space', async ({ browser}, { project }) => {
        const page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "scripting_space_related"));

        await evaluateScript(page, async () => {
            await WA.player.teleport(1, 1);
            window.userCount = 0;
            window.mySpace = WA.spaces.joinSpace("some-test-space", "everyone");
            window.mySpace.userJoinedObservable.subscribe((user) => {
                window.userCount++;
                window.lastJoinedUser = user;
            });
            window.mySpace.userLeftObservable.subscribe((user) => window.userCount--);
        });

        await expect.poll(() => evaluateScript(page, async () => {
            return window.userCount;
        })).toBe(1);

        const bob = await getPage(browser, 'Bob', publicTestMapUrl("tests/E2E/empty.json", "scripting_space_related"));

        // Bob joins the same space
        await evaluateScript(bob, async () => {
            window.mySpace = WA.spaces.joinSpace("some-test-space", "everyone");
        });

        // User count in the space should now be 2
        await expect.poll(() => evaluateScript(page, async () => {
            return window.userCount;
        })).toBe(2);

        // Bob leaves the space
        await evaluateScript(bob, async () => {
            window.mySpace.leave();
        });

        // User count in the space should go back to 1
        await expect.poll(() => evaluateScript(page, async () => {
            return window.userCount;
        })).toBe(1);

        /**
         * Test part 2: Let's simulate what happens when a user joins the same space twice
         * We should see it until it leaves the space twice
         */

        // Bob joins the first time
        await evaluateScript(bob, async () => {
            window.mySpace = WA.spaces.joinSpace("some-test-space", "everyone");
        });

        // User count in the space should now be 2
        await expect.poll(() => evaluateScript(page, async () => {
            return window.userCount;
        })).toBe(2);

        // Bob joins the same space again
        await evaluateScript(bob, async () => {
            window.mySpace2 = WA.spaces.joinSpace("some-test-space", "everyone");
        });

        // User count in the space should still be 2, as Bob is already in the space
        await expect.poll(() => evaluateScript(page, async () => {
            return window.userCount;
        })).toBe(2);

        // Bob leaves the space once
        await evaluateScript(bob, async () => {
            window.mySpace.leave();
        });

        // User count in the space should still be 2, as Bob is still in the space
        await expect.poll(() => evaluateScript(page, async () => {
            return window.userCount;
        })).toBe(2);

        // Bob leaves the space again
        await evaluateScript(bob, async () => {
            window.mySpace2.leave();
        });

        // User count in the space should go back to 1
        await expect.poll(() => evaluateScript(page, async () => {
            return window.userCount;
        })).toBe(1);

        /**
         * Test part 3: Let's test we can listen to user updates
         */

        // Bob joins again
        await evaluateScript(bob, async () => {
            window.mySpace = WA.spaces.joinSpace("some-test-space", "everyone");
        });

        // User count in the space should still be 2, as Bob is already in the space
        await expect.poll(() => evaluateScript(page, async () => {
            return window.userCount;
        })).toBe(2);

        // We expect Bob's status to be 1 by default
        await expect.poll(() => evaluateScript(page, async () => {
            window.lastJoinedUser.reactiveUser.availabilityStatus.subscribe((availabilityStatus) => {
                window.lastRemoteAvailabilityStatus = availabilityStatus;
            });

            return window.lastJoinedUser.availabilityStatus;
        })).toBe(1);

        // Bob clicks on the "Do not disturb" status
        await Menu.openStatusList(bob, false);
        await Menu.clickOnStatus(bob, "Do not disturb")

        // We expect Bob's status to be "Do not disturb"
        await expect.poll(() => evaluateScript(page, async () => {
            return window.lastJoinedUser.availabilityStatus;
        })).toBe(9);

        // We expect the reactive user property to have been triggered
        await expect.poll(() => evaluateScript(page, async () => {
            return window.lastRemoteAvailabilityStatus;
        })).toBe(9);

        // Bobs leaves the space
        await evaluateScript(bob, async () => {
            window.mySpace.leave();
        });

        // Alice leaves the space
        await evaluateScript(page, async () => {
            window.mySpace.leave();
        });

        /**
         * Test part 3: Let's do the same test with a livestream space
         */

        await evaluateScript(page, async () => {
            //await WA.player.teleport(1, 1);
            window.userCount = 0;
            window.mySpace = WA.spaces.joinSpace("some-test-space", "streaming");
            window.mySpace.userJoinedObservable.subscribe((user) => {
                window.userCount++;
                window.lastJoinedUser = user;
            });
            window.mySpace.userLeftObservable.subscribe((user) => window.userCount--);
        });

        await expect.poll(() => evaluateScript(page, async () => {
            return window.userCount;
        })).toBe(0);

        // Bob joins the same space
        await evaluateScript(bob, async () => {
            window.mySpace = WA.spaces.joinSpace("some-test-space", "streaming");
        });

        // Bob does not stream, still no one in the space
        await expect.poll(() => evaluateScript(page, async () => {
            return window.userCount;
        })).toBe(0);

        await bob.pause();

        // Bob starts streaming
        await evaluateScript(bob, async () => {
            window.mySpace.startStreaming();
        });

        // User count in the space should now be 1
        await expect.poll(() => evaluateScript(page, async () => {
            return window.userCount;
        })).toBe(1);


    });

    // TODO: write a test to test the "joinSpace" function with a "livestream" space type
    // bob joins a livestream space, then starts streaming
    // alice sees bob user when it starts streaming
    // bob stops streaming
    // alice does not see bob anymore
    // TODO: add a function to start / stop streaming in the scripting API
});
