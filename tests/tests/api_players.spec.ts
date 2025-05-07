import { Browser, expect, Page, test } from "@playwright/test";
import { getCoWebsiteIframe } from "./utils/iframe";
import { assertLogMessage, startRecordLogs } from "./utils/log";
import { evaluateScript } from "./utils/scripting";
import {oidcLogin, oidcLogout} from "./utils/oidc";
import { publicTestMapUrl } from "./utils/urls";
import { getPage } from "./utils/auth";
import {isMobile} from "./utils/isMobile";

test.describe("API WA.players", () => {
  test.beforeEach(async ({ page, browserName }) => {
    if (isMobile(page) || browserName === "webkit") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }
  });

  test("enter leave events are received", async ({ browser }) => {

    const page1 : Page = await getPage(
      browser,
      'Alice',
      publicTestMapUrl(`tests/RemotePlayers/remote_players.json`, "api_players")
    );
    const page2: Page = await getPage(
      browser,
      'Bob',
      publicTestMapUrl(`tests/RemotePlayers/remote_players.json`, "api_players")
    );
    
    
    const events = getCoWebsiteIframe(page1).locator("#events");
    
    await expect(events.getByText('New user: Bob')).toBeVisible();
    await getCoWebsiteIframe(page1).locator("#listCurrentPlayers").click();
    const list = getCoWebsiteIframe(page1).locator("#list");
    await expect(list).toContainText("Bob");

    await getCoWebsiteIframe(page2).locator("#listCurrentPlayers").click();
    const list2 = getCoWebsiteIframe(page2).locator("#list");
    await expect(list2).toContainText("Alice");

    // Now, let's test variables
    await getCoWebsiteIframe(page1).locator("#the-variable").fill("yeah");
    await getCoWebsiteIframe(page1)
      .locator("#the-variable")
      .evaluate((e) => e.blur());
    const events2 = getCoWebsiteIframe(page2).locator("#events");
    await expect(events2).toContainText(
      "User 'Alice' testVariable changed. New value: yeah (tracked globally)"
    );
    await expect(events2).toContainText(
      "User 'Alice' testVariable changed. New value: yeah (tracked locally)"
    );
    await expect(events2).toContainText(
      "Asserted value from event and from WA.players.state is the same"
    );

    await page2.close();
    await page2.context().close();
    await expect(events.getByText('User left: Bob')).toBeVisible();
    await getCoWebsiteIframe(page1).locator("#listCurrentPlayers").click();
    await expect(list).not.toContainText("Bob");
    await page1.close()
    await page1.context().close();
  });

  test("exception if we forget to call WA.players.configureTracking", async ({ browser }) => {

    const page = await getPage(
      browser,
      'Alice',
      publicTestMapUrl(`tests/RemotePlayers/remote_players_no_init.json`, "api_players")
    );
    await expect(
      getCoWebsiteIframe(page).locator("#onPlayerEntersException")
    ).toHaveText("Yes");
    await expect(
      getCoWebsiteIframe(page).locator("#onPlayerLeavesException")
    ).toHaveText("Yes");
    await page.close();
    await page.context().close();
  });

  test("Test that player B arriving after player A set his variables can read the variable.",
      async ({ browser }) => {
    const page = await getPage(
      browser,
      'Alice',
      publicTestMapUrl(`tests/E2E/empty.json`, "api_players")
    );

    await evaluateScript(page, async () => {
      await WA.onInit();

      await WA.player.state.saveVariable("myvar", 12, {
        public: true,
        persist: false,
      });
      return;
    });
    const page2 = await getPage(
      browser,
      'Bob',
      publicTestMapUrl(`tests/E2E/empty.json`, "api_players")
    );


    const myvar = await evaluateScript(page2, async () => {
      await WA.onInit();
      await WA.players.configureTracking();

      for (const player of WA.players.list()) {
        return player.state.myvar;
      }
    });

    await expect(myvar).toBe(12);

    await page2.close();
    await page2.context().close();
    await page.close();
    await page.context().close();
  });

  const runPersistenceTest = async (
    page: Page,
    browser: Browser,
  ) => {
    await evaluateScript(page, async () => {
      /*function later(delay) {
        return new Promise(function(resolve) {
          setTimeout(resolve, delay);
        });
      }

      for (let i = 0; i < 50; i++) {
        if (WA) {
          break;
        }
        await later(100);
      }
      if (WA === undefined) {
        throw new Error("Could not find WA object");
      }*/

      await WA.onInit();

      await WA.player.state.saveVariable(
        "non_public_persisted",
        "non_public_persisted",
        {
          public: false,
          persist: true,
          scope: "room",
        }
      );

      await WA.player.state.saveVariable(
        "public_persisted",
        "public_persisted",
        {
          public: true,
          persist: true,
          scope: "room",
        }
      );

      await WA.player.state.saveVariable(
        "public_persisted_json",
        { value: "public_persisted_json" },
        {
          public: true,
          persist: true,
          scope: "room",
        }
      );

      await WA.player.state.saveVariable(
        "non_public_non_persisted",
        "non_public_non_persisted",
        {
          public: false,
          persist: false,
          scope: "room",
        }
      );

      await WA.player.state.saveVariable(
        "public_non_persisted",
        "public_non_persisted",
        {
          public: true,
          persist: false,
          scope: "room",
        }
      );

      await WA.player.state.saveVariable(
        "undefined_var",
        "some value that will be set to undefined later",
        {
          public: false,
          persist: true,
          scope: "room",
        }
      );

      await WA.player.state.saveVariable("undefined_var", undefined, {
        public: false,
        persist: true,
        scope: "room",
      });

      // persist: false + world is not possible!
      /*WA.player.state.saveVariable('world', 'world', {
        public: true,
        persist: false,
        scope: "world",
      });*/

      return;
    });
    const page2 = await getPage(
      browser,
      'Bob',
      publicTestMapUrl(`tests/E2E/empty.json`, "api_players")
    );


      const readRemotePlayerVariable = async (
      playerName: string,
      variableName: string,
      targetPage: Page
    ): Promise<unknown> => {
      return await evaluateScript(
        targetPage,
        async ({ variableName, playerName }) => {
          await WA.onInit();
          await WA.players.configureTracking();

          let value: unknown = undefined;
          let playerFound = false;
          for (const player of WA.players.list()) {
            if (player.name === playerName) {
              if (playerFound === true) {
                throw new Error(
                  `Player with name ${playerName} found twice in players list`
                );
              }
              value = player.state[variableName];
              playerFound = true;
            }
          }
          return value;
        },
        { variableName, playerName }
      );
    };

    const readLocalPlayerVariable = async (
      name: string,
      targetPage: Page
    ): Promise<unknown> => {
      return await evaluateScript(
        targetPage,
        async (name: string) => {
          await WA.onInit();

          return WA.player.state[name];
        },
        name
      );
    };

    // We should not be able to read a non public variable from another user
    await expect(
      await readRemotePlayerVariable("Alice", "non_public_persisted", page2)
    ).toBe(undefined);
    await expect(
      await readRemotePlayerVariable("Alice", "non_public_non_persisted", page2)
    ).toBe(undefined);
    await expect
      .poll(() =>
        readRemotePlayerVariable("Alice", "public_non_persisted", page2)
      )
      .toBe("public_non_persisted");
    await expect
      .poll(() => readRemotePlayerVariable("Alice", "public_persisted", page2))
      .toBe("public_persisted");
    await expect
      .poll(() =>
        readRemotePlayerVariable("Alice", "public_persisted_json", page2)
      )
      .toEqual({ value: "public_persisted_json" });
    await expect
      .poll(() => readRemotePlayerVariable("Alice", "undefined_var", page2))
      .toEqual(undefined);

    // The user himself should always be allowed to read his own variables
    await expect
      .poll(() => readLocalPlayerVariable("non_public_persisted", page))
      .toBe("non_public_persisted");
    await expect
      .poll(() => readLocalPlayerVariable("non_public_non_persisted", page))
      .toBe("non_public_non_persisted");
    await expect
      .poll(() => readLocalPlayerVariable("public_non_persisted", page))
      .toBe("public_non_persisted");
    await expect
      .poll(() => readLocalPlayerVariable("public_persisted", page))
      .toBe("public_persisted");
    await expect
      .poll(() => readLocalPlayerVariable("public_persisted_json", page))
      .toEqual({ value: "public_persisted_json" });
    await expect
      .poll(() => readLocalPlayerVariable("undefined_var", page))
      .toEqual(undefined);

    /*console.log("PAGE 1 MY ID", await evaluateScript(page, async () => {
      await WA.onInit();
      return WA.player.id;
    }));*/

    // Let's reload the first page to test the refresh
    if (browser.browserType().name() === "webkit") {
      // Skip this test for webkit because there is a bug in page.reload().
      // See https://github.com/microsoft/playwright/issues/16147
      return;
    }
    await page.reload();

    // Let's wait for page to be reloaded
    await evaluateScript(page, async () => {
      await WA.onInit();
    });

    /*console.log("PAGE 1 MY ID", await evaluateScript(page, async () => {
      await WA.onInit();
      return WA.player.id;
    }));*/

    // Non persisted variables should be gone now
    await expect
      .poll(() =>
        readRemotePlayerVariable("Alice", "non_public_persisted", page2)
      )
      .toBe(undefined);
    await expect
      .poll(() =>
        readRemotePlayerVariable("Alice", "non_public_non_persisted", page2)
      )
      .toBe(undefined);
    await expect
      .poll(() =>
        readRemotePlayerVariable("Alice", "public_non_persisted", page2)
      )
      .toBe(undefined);
    await expect
      .poll(() => readRemotePlayerVariable("Alice", "public_persisted", page2))
      .toBe("public_persisted");
    await expect
      .poll(() => readRemotePlayerVariable("Alice", "undefined_var", page2))
      .toBe(undefined);

    // The user himself should always be allowed to read his own persisted variables
    await expect
      .poll(() => readLocalPlayerVariable("non_public_persisted", page))
      .toBe("non_public_persisted");
    await expect
      .poll(() => readLocalPlayerVariable("non_public_non_persisted", page))
      .toBe(undefined);
    await expect
      .poll(() => readLocalPlayerVariable("public_non_persisted", page))
      .toBe(undefined);
    await expect
      .poll(() => readLocalPlayerVariable("public_persisted", page))
      .toBe("public_persisted");
    await expect
      .poll(() => readLocalPlayerVariable("undefined_var", page))
      .toBe(undefined);
    
    await page2.close();
    await page2.context().close();
  };

  test("Test variable persistence for anonymous users.", async ({ browser }) => {
    const page = await getPage(
      browser,
      'Alice',
      publicTestMapUrl(`tests/E2E/empty.json`, "api_players")
    );

    await runPersistenceTest(page, browser, false);
    await page.close();
    await page.context().close();
  });

  test("Test variable persistence for logged users. @oidc", async ({ browser }) => {

    test.setTimeout(120_000); // Fix Webkit that can take more than 60s
    
    const page = await getPage(
      browser,
      'Alice',
      publicTestMapUrl(`tests/E2E/empty.json`, "api_players")
    );
    await oidcLogin(page);
    await runPersistenceTest(page, browser);

    await oidcLogout(page);
    await page.close();
    await page.context().close();
  });

  test("Test variables are sent across frames.", async ({ browser }) => {
    const page = await getPage(
      browser,
      'Alice',
      publicTestMapUrl(`tests/E2E/empty_2_frames.json`, "api_players")
    );

    await evaluateScript(
      page,
      async () => {
        await WA.onInit();

        WA.player.state.onVariableChange("myvar").subscribe(() => {
          console.log("myvar CHANGE TRIGGERED");
        });
        return;
      },
      null,
      "embedded_iframe"
    );

    startRecordLogs(page);

    await evaluateScript(page, async () => {
      await WA.onInit();
      WA.player.state.myvar = 12;
      return;
    });

    await assertLogMessage(page, "myvar CHANGE TRIGGERED");

    const variable = await evaluateScript(
      page,
      async () => {
        await WA.onInit();

        return WA.player.state.myvar;
      },
      "embedded_iframe"
    );
    await expect(variable).toBe(12);
    await page.close();
    await page.context().close();
  });

  // This test is testing that we are listening on the back side to variables modification inside Redis.
  // All players with same UUID should share the same state (public or private as long as it is persisted)
  test("Test that 2 players sharing the same UUID are notified of persisted private variable changes.",
      async ({ browser }) => {
    const page = await getPage(
      browser,
      'Alice',
      publicTestMapUrl("tests/E2E/empty.json", "api_players")
    );

    /*console.log("PAGE 1 MY ID", await evaluateScript(page, async () => {
      await WA.onInit();
      return WA.player.id;
    }));*/

    // We use a new tab to keep the same LocalStorage
     
    const page2 = await page.context().newPage();

    await page2.goto(publicTestMapUrl("tests/E2E/empty.json", "api_players"));

    /*console.log("PAGE 2 MY ID", await evaluateScript(page2, async () => {
      await WA.onInit();
      return WA.player.id;
    }));*/

    let gotExpectedNotification = false;
    let gotUnexpectedNotification = false;
    await page2.on("console", async (msg) => {
      const text = await msg.text();
      //console.log(text);
      if (
        text === "NOTIFICATION RECEIVED FOR should_be_notified VARIABLE CHANGE"
      ) {
        gotExpectedNotification = true;
      } else if (
        text ===
        "NOTIFICATION RECEIVED FOR should_not_be_notified VARIABLE CHANGE"
      ) {
        gotUnexpectedNotification = true;
      }
    });

    await evaluateScript(page2, async () => {
      await WA.onInit();
      await WA.players.configureTracking();

      WA.player.state.onVariableChange("should_be_notified").subscribe(() => {
        console.log(
          "NOTIFICATION RECEIVED FOR should_be_notified VARIABLE CHANGE"
        );
      });
      WA.player.state
        .onVariableChange("should_not_be_notified")
        .subscribe(() => {
          console.error(
            "NOTIFICATION RECEIVED FOR should_not_be_notified VARIABLE CHANGE"
          );
        });

      return;
    });

    await evaluateScript(page, async () => {
      await WA.onInit();

      await WA.player.state.saveVariable(
        "should_be_notified",
        "should_be_notified",
        {
          public: false,
          persist: true,
          scope: "room",
        }
      );

      await WA.player.state.saveVariable(
        "should_not_be_notified",
        "should_not_be_notified",
        {
          public: false,
          persist: false,
          scope: "room",
        }
      );

      return;
    });

    await expect.poll(() => gotExpectedNotification).toBe(true);
    await expect.poll(() => gotUnexpectedNotification).toBe(false);

    await page2.close();
    await page2.context().close();
    //await page.close();
    //await page.context().close();
  });

  test("Test that a variable changed can be listened to locally.", async ({ browser }) => {
    const page = await getPage(
      browser,
      'Alice',
      publicTestMapUrl(`tests/E2E/empty.json`, "api_players")
    );

    // Test that a variable triggered locally can be listened locally
    let gotExpectedNotification = false;

    await page.on("console", async (msg) => {
      const text = msg.text();

      if (
        text === "NOTIFICATION RECEIVED FOR should_be_notified VARIABLE CHANGE"
      ) {
        gotExpectedNotification = true;
      }
    });

    await evaluateScript(page, async () => {
      await WA.onInit();

      WA.player.state.onVariableChange("should_be_notified").subscribe(() => {
        console.log(
          "NOTIFICATION RECEIVED FOR should_be_notified VARIABLE CHANGE"
        );
      });

      await WA.player.state.saveVariable(
        "should_be_notified",
        "should_be_notified",
        {
          public: false,
          persist: true,
          scope: "room",
        }
      );

      return;
    });

    await expect.poll(() => gotExpectedNotification).toBe(true);

    await page.close();
    await page.context().close();
  });

  test('cowebsites tab system', async ({ browser }) => {
    // Open the main page with the cowebsite container
    const page = await getPage(
      browser,
      'Alice',
      publicTestMapUrl(`tests/RemotePlayers/remote_players_cowebsite.json`, "api_players")
    );

    // Ouvrir le Site A dans le premier onglet
    await page.locator('.siteA-page1');

    // Ouvrir le Site B dans le deuxième onglet
    await page.locator('.siteB-page1');
    // await page.frameLocator('iframe[name="cowebsite-frame"]').locator('text=Site B Page 1').waitFor();

    //Switching tabs and pages
    await page.getByTestId('tab1').click();
    const event = getCoWebsiteIframe(page).locator('.siteA-page1');
    await expect(event).toContainText('Site A Page 1');

    await getCoWebsiteIframe(page).locator('.link-to-siteA-page2').click();
    const eventpage = await getCoWebsiteIframe(page).locator('.siteA-page2');
    await expect(eventpage).toContainText('Site A Page 2');

    await page.getByTestId('tab2').click();
    const event2 = getCoWebsiteIframe(page).locator('.siteB-page1')
    await expect(event2).toContainText('Site B Page 1');

    await getCoWebsiteIframe(page).locator('.link-to-siteB-page2').click();
    const eventpage2 = await getCoWebsiteIframe(page).locator('.siteB-page2');
    await expect(eventpage2).toContainText('Site B Page 2');

    await page.close();
    await page.context().close();
  });
});
