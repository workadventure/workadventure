import type { Page} from "@playwright/test";
import {expect, test} from "@playwright/test";
import { evaluateScript } from "./utils/scripting";
import Map from "./utils/map";
import {publicTestMapUrl} from "./utils/urls";
import { getPage} from "./utils/auth";
import {isMobile} from "./utils/isMobile";
import Menu from "./utils/menu";

async function playAudioStream(page: Page, frequency: number) {
  // Test play sound scripting
  await evaluateScript(page, async ({frequency}) => {
    const sampleRate = 24000;

    const audioStream = await WA.player.proximityMeeting.startAudioStream(sampleRate);

    // Generate a sine wave
    const amplitude = 1;
    const duration = 200;
    const numSamples = duration * sampleRate;
    const samples = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      samples[i] = amplitude * Math.sin(2 * Math.PI * frequency * i / sampleRate);
    }

    window.streamInterrupted = false;
    window.audioStream = audioStream;
    audioStream.appendAudioData(samples).catch((e) => {
      window.streamInterrupted = true;
    });
  }, { frequency });
}

async function hasAudioStream(page: Page, volume = 0.7): Promise<void> {
  // Let's wait for the audio stream to be ready (here, we test that the audio stream is directly started in LiveKit)
  await evaluateScript(page, async ({ volume }) => {
    const sampleRate = 24000;

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        // If no audio received after 20 seconds, we consider that there is no audio stream
        reject(new Error("No audio stream received"));
        subscription.unsubscribe();
      }, 20000);

      const subscription = WA.player.proximityMeeting.listenToAudioStream(sampleRate).subscribe((data: Float32Array) => {
        // At some point, the volume of the sound should be high enough to be noticed in the sample
        if (data.some((sample) => Math.abs(sample) > volume)) {
          resolve();
          subscription.unsubscribe();
          clearTimeout(timeout);
        }
      });
    });
  }, { volume });
}

async function waitForJoinProximityChat(page: Page): Promise<void> {
  await evaluateScript(page, async () => {
    return new Promise<void>((resolve) => {
      const joinSubscription = WA.player.proximityMeeting.onJoin().subscribe(() => {
        resolve();
        joinSubscription.unsubscribe();
      });
    });
  });
}

test.setTimeout(240_000);

test.describe("Scripting audio streams @nomobile @nofirefox @nowebkit", () => {
  test.beforeEach(async ({ browserName, page }) => {
    // This test does not depend on the browser. Let's only run it in Chromium.
    test.skip(browserName !== 'chromium' || isMobile(page), 'Run only on Chromium and skip on mobile');
  });
  test("can play and listen to streams @scripting", async ({
    browser,
  }, { project }) => {
    // This test runs only on Chrome
    // Firefox fails it because the sample rate must be equal to the microphone sample rate
    // Safari fails it because Safari
    await using page = await getPage(browser, 'Bob', publicTestMapUrl("tests/E2E/empty.json", "scripting_audio_stream"));
    await Menu.turnOffMicrophone(page);
    await Map.teleportToPosition(page, 32, 32);

    // Open new page for alice
    const alice = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "scripting_audio_stream"));
    await Menu.turnOffMicrophone(alice);

    await alice.evaluate(() => {
      // Let's debug
      window.localStorage.setItem('debug', '*');
    });

    // Move alice to the same position as bob
    const aliceProximityChatPromise = waitForJoinProximityChat(alice);
    const bobProximityChatPromise = waitForJoinProximityChat(page);
    await Map.teleportToPosition(alice, 32, 32);
    await aliceProximityChatPromise;
    await bobProximityChatPromise;

    //await expect(alice.getByTestId('screenShareButton')).toBeVisible({ timeout: 120_000 }); // Wait for the audio stream to be ready
    //await expect(page.getByTestId('screenShareButton')).toBeVisible({ timeout: 120_000 }); // Wait for the audio stream to be ready

    await playAudioStream(page, 440);

    // Test listen to sound scripting
    await hasAudioStream(alice);

    await expect.poll(() => evaluateScript(page, () => window.streamInterrupted)).toBe(false);

    // Now, let's add more users to test the switch to Livekit
    const alice2 = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "scripting_audio_stream"));
    await Menu.turnOffMicrophone(alice2);
    await Map.teleportToPosition(alice2, 32, 32);
    const eve = await getPage(browser, 'Eve', publicTestMapUrl("tests/E2E/empty.json", "scripting_audio_stream"));
    await Menu.turnOffMicrophone(eve);
    const proximityChatPromise = waitForJoinProximityChat(eve);
    await Map.teleportToPosition(eve, 32, 32);
    await proximityChatPromise;

    // eve entered last. She should receive sound only through Livekit.
    // Let's wait for the audio stream to be ready (here, we test that the audio stream is directly started in Livekit)
    await evaluateScript(eve, async () => {
      console.log("eve is starting to listen to the audio stream");
    });
    await hasAudioStream(eve);


    await evaluateScript(alice2, async () => {
      console.log("Alice2 is starting to listen to the audio stream");
    });
    // Let's also check that the users that were in WebRTC before the switch are still receiving the sound
    await hasAudioStream(alice2);


    // Now, let's reset the audio buffer
    await evaluateScript(page, async () => {
      window.audioStream.resetAudioBuffer();
    });

    await expect.poll(() => evaluateScript(page, () => window.streamInterrupted)).toBe(true);

    // Now, let's close the audio stream
    await evaluateScript(page, async () => {
      window.audioStream.close();
    });

    // Let's restart the audio buffer
    await playAudioStream(page, 330);
    await hasAudioStream(alice2);

    // Now, let's disconnect eve to force the switch back to WebRTC
    await eve.close();
    await eve.context().close();

    // Let's wait for eve to be disconnected
    await expect(alice2.getByText('eve')).toBeHidden();

    // After disconnect, alice2 should still receive the sound through WebRTC
    await hasAudioStream(alice2);


    await alice.close();
    await alice.context().close();
    await alice2.close();
    await alice2.context().close();

    await page.context().close();
  });

  test("can play and listen to sound files", async ({
                                                  browser,
                                                }, { project }) => {
    const bob = await getPage(browser, 'Bob', publicTestMapUrl("tests/E2E/empty.json", "scripting_audio_stream"));
    await Map.teleportToPosition(bob, 32, 32);

    // Open new page for alice
    const alice = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "scripting_audio_stream"));
    await Menu.turnOffMicrophone(alice);

    // Move alice to the same position as bob
    await Map.teleportToPosition(alice, 32, 32);

    await expect(alice.getByTestId('screenShareButton')).toBeVisible({ timeout: 120_000 }); // Wait for the audio stream to be ready

    // Test play sound scripting
    await evaluateScript(bob, async () => {
      WA.player.proximityMeeting.playSound("http://maps.workadventure.localhost/tests/Audience.mp3").catch(err=> console.error(err));
    });

    // Test listen to sound scripting
    await hasAudioStream(alice, 0.2);

    });
  });
