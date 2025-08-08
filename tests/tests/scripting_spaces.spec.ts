import { expect, request, test } from '@playwright/test';
import { evaluateScript } from "./utils/scripting";
import { publicTestMapUrl } from "./utils/urls";
import { getPage } from './utils/auth';
import Menu from "./utils/menu";

test.describe('Scripting space-related functions', () => {

    test('can join and watch space', async ({ browser, browserName }, { project }) => {
        if (browserName === "webkit") {
            // eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }
        const page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "scripting_space_related"));

        await evaluateScript(page, async () => {
            await WA.player.teleport(1, 1);
            window.userCount = 0;
            window.mySpace = await WA.spaces.joinSpace("some-test-space", "everyone",[]);
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
            window.mySpace = await WA.spaces.joinSpace("some-test-space", "everyone",[]);
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
            window.mySpace = await WA.spaces.joinSpace("some-test-space", "everyone",[]);
        });

        // User count in the space should now be 2
        await expect.poll(() => evaluateScript(page, async () => {
            return window.userCount;
        })).toBe(2);

        // Bob joins the same space again
        await evaluateScript(bob, async () => {
            window.mySpace2 = await WA.spaces.joinSpace("some-test-space", "everyone",[]);
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
            window.mySpace = await WA.spaces.joinSpace("some-test-space", "everyone",[]);
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
        await Menu.clickOnStatus(bob, "Do not disturb");

        // We expect Bob's status to be "Do not disturb"
        await expect.poll(() => evaluateScript(page, async () => {
            return window.lastJoinedUser.availabilityStatus;
        })).toBe(9);

        // We expect the reactive user property to have been triggered
        await expect.poll(() => evaluateScript(page, async () => {
            return window.lastRemoteAvailabilityStatus;
        })).toBe(9);

        // Bob leaves the space
        await evaluateScript(bob, async () => {
            window.mySpace.leave();
        });

        // Alice leaves the space
        await evaluateScript(page, async () => {
            window.mySpace.leave();
        });

        /**
         * Test part 4: Let's do the same test with a livestream space.
         */

        await evaluateScript(page, async () => {
            window.userCount = 0;
            window.mySpace = await WA.spaces.joinSpace("some-test-space", "streaming",[]);
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
            window.mySpace = await WA.spaces.joinSpace("some-test-space", "streaming",[]);
        });

        // Bob does not stream, still no one in the space
        await expect.poll(() => evaluateScript(page, async () => {
            return window.userCount;
        })).toBe(0);

        // Bob starts streaming
        await evaluateScript(bob, async () => {
            window.mySpace.startStreaming();
        });

        // User count in the space should now be 1
        await expect.poll(() => evaluateScript(page, async () => {
            return window.userCount;
        })).toBe(1);

        await bob.close();
        await bob.context().close();
        await page.close();
        await page.context().close();
    });

    test('cannot join a space with a different filter on the same browser', async ({ browser, context, browserName }, { project }) => {
        if (browserName === "webkit") {
            // eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }

        // Get all open pages in the context
        const pages = context.pages();
        await expect.poll(() => pages.length).toBe(0);

        const page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "scripting_space_related"));

        expect(
            await evaluateScript(page, async () => {
                await WA.spaces.joinSpace("some-test-space", "everyone",[]);
                try {
                    await WA.spaces.joinSpace("some-test-space", "streaming",[]);
                } catch (e) {
                    return e.message;
                }
                return null;
            })
        ).toContain("Cannot join space some-test-space");

        await page.close();
        await page.context().close();
    });

    test('cannot join a space with a different filter in 2 browsers', async ({ browser, context, browserName }, { project }) => {

        if (browserName === "webkit") {
            // eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }
        // Get all open pages in the context

        const pages = context.pages();

        await expect.poll(() => pages.length).toBe(0);

        const page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "scripting_space_related"));

        await evaluateScript(page, async () => {
            await WA.player.teleport(1, 1);
            await WA.spaces.joinSpace("some-test-space", "everyone",[]);
        });

        const bob = await getPage(browser, 'Bob', publicTestMapUrl("tests/E2E/empty.json", "scripting_space_related"));

        expect(
            await evaluateScript(bob, async () => {
                try {
                    await WA.spaces.joinSpace("some-test-space", "streaming",[]);
                } catch (e) {
                    return e.message;
                }
                return null;
            })
        ).toContain("Error: Space filter type mismatch");

        await bob.close();
        await bob.context().close();
        await page.close();
        await page.context().close();
    });

    test('can join a livestream space and see the user when it starts streaming', async ({ browser, context, browserName }, { project }) => {
        if (browserName === "webkit") {
            // eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }
        const pages = context.pages();

        await expect.poll(() => pages.length).toBe(0);

        const page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "scripting_space_related"));

        await evaluateScript(page, async () => {
            await WA.player.teleport(1, 1);
            window.userCount = 0;
            window.mySpace = await WA.spaces.joinSpace("some-test-space", "streaming",[]);
            window.mySpace.userJoinedObservable.subscribe((user) => {
                window.userCount++;
                window.lastJoinedUser = user;
            });
            window.mySpace.userLeftObservable.subscribe((user) => window.userCount--);
        });

        // Bob joins the same space
        const bob = await getPage(browser, 'Bob', publicTestMapUrl("tests/E2E/empty.json", "scripting_space_related"));
        await evaluateScript(bob, async () => {
            window.mySpace = await WA.spaces.joinSpace("some-test-space", "streaming",[]);
        });

        // User count in the space should now be 1
        await expect.poll(() => evaluateScript(page, async () => {
            return window.userCount;
        })).toBe(0);

        // Bob starts streaming
        await evaluateScript(bob, async () => {
            window.mySpace.startStreaming();
        });

        // User count in the space should now be 1
        await expect.poll(() => evaluateScript(page, async () => {
            return window.userCount;
        })).toBe(1);

        // Alice should see Bob's user
        await expect.poll(() => evaluateScript(page, async () => {
            return window.lastJoinedUser.name;
        })).toBe("Bob");

        // Bob stops streaming
        await evaluateScript(bob, async () => {
            window.mySpace.stopStreaming();
        });

        // User count in the space should go back to 0
        await expect.poll(() => evaluateScript(page, async () => {
            return window.userCount;
        })).toBe(0);

        await bob.close();
        await bob.context().close();
        await page.close();
        await page.context().close();

    });

    test('should reconnect to a space when backend is restarted', async ({ browser, context, browserName }, { project }) => {
        if (browserName === "webkit") {
            // eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }
        const pages = context.pages();

        await expect.poll(() => pages.length).toBe(0);

        const apiContext = await request.newContext();

        const page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "scripting_space_related"));

        await evaluateScript(page, async () => {
            await WA.player.teleport(1, 1);
            window.userCount = 0;
            window.mySpace = await WA.spaces.joinSpace("some-test-space", "streaming",[]);
            window.mySpace.userJoinedObservable.subscribe((user) => {
                window.userCount++;
                window.lastJoinedUser = user;
            });
            window.mySpace.userLeftObservable.subscribe((user) => window.userCount--);
        });

        // Bob joins the same space
        const bob = await getPage(browser, 'Bob', publicTestMapUrl("tests/E2E/empty.json", "scripting_space_related"));
        await evaluateScript(bob, async () => {
            window.mySpace = await WA.spaces.joinSpace("some-test-space", "streaming",[]);
        });

        // User count in the space should now be 0
        await expect.poll(() => evaluateScript(page, async () => {
            return window.userCount;
        })).toBe(0);

        // Bob starts streaming
        await evaluateScript(bob, async () => {
            window.mySpace.startStreaming();
        });

        // User count in the space should now be 1
        await expect.poll(() => evaluateScript(page, async () => {
            return window.userCount;
        })).toBe(1);

        // Delete space connection in the backend
        // This simulates a backend restart, as the space connection will be closed
        await apiContext.post('http://api.workadventure.localhost/debug/close-space-connection?spaceName=localWorld.some-test-space&token=123');

        await page.waitForTimeout(5000);

        // Alice should see Bob's user
        await expect.poll(() => evaluateScript(page, async () => {
            return window.lastJoinedUser.name;
        })).toBe("Bob");

        // Bob stops streaming
        await evaluateScript(bob, async () => {
            window.mySpace.stopStreaming();
        });


        // User count in the space should go back to 0
        await expect.poll(() => evaluateScript(page, async () => {
            return window.userCount;
        })).toBe(0);

        await bob.close();
        await bob.context().close();
        await page.close();
        await page.context().close();

    });
});
