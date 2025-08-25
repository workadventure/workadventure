import {expect, Page, test} from "@playwright/test";
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
  // Let's wait for the audio stream to be ready (here, we test that the audio stream is directly started in Livekiit)
  await evaluateScript(page, async ({ volume }) => {
    const sampleRate = 24000;

    return new Promise<void>((resolve) => {
      WA.player.proximityMeeting.listenToAudioStream(sampleRate).subscribe((data: Float32Array) => {
        // At some point, the volume of the sound should be high enough to be noticed in the sample
        if (data.some((sample) => Math.abs(sample) > volume)) {
          resolve();
        }
      });
    });
  }, { volume });
}

test.describe("Scripting audio streams", () => {
  test.beforeEach(async ({ browserName, page }) => {
    // This test does not depend on the browser. Let's only run it in Chromium.
    if (browserName !== "chromium" || isMobile(page)) {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }
  });
  test("can play and listen to streams", async ({
    browser,
  }, { project }) => {
    // This test runs only on Chrome
    // Firefox fails it because the sample rate must be equal to the microphone sample rate
    // Safari fails it because Safari
    const page = await getPage(browser, 'Bob', publicTestMapUrl("tests/E2E/empty.json", "scripting_audio_stream"));
    await Map.teleportToPosition(page, 32, 32);

    // Open new page for alice
    const alice = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "scripting_audio_stream"));
    await Menu.turnOffMicrophone(alice);

    // Move alice to the same position as bob
    await Map.teleportToPosition(alice, 32, 32);

    await expect(alice.getByTestId('screenShareButton')).toBeVisible({ timeout: 120_000 }); // Wait for the audio stream to be ready

    await playAudioStream(page, 440);

    // Test listen to sound scripting
    await hasAudioStream(alice);

    await expect.poll(() => evaluateScript(page, () => window.streamInterrupted)).toBe(false);

    // Now, let's add more users to test the switch to Livekit
    const alice2 = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "scripting_audio_stream"));
    await Menu.turnOffMicrophone(alice2);
    await Map.teleportToPosition(alice2, 32, 32);
    const alice3 = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "scripting_audio_stream"));
    await Menu.turnOffMicrophone(alice3);
    await Map.teleportToPosition(alice3, 32, 32);
    const eve = await getPage(browser, 'Eve', publicTestMapUrl("tests/E2E/empty.json", "scripting_audio_stream"));
    await Menu.turnOffMicrophone(eve);
    await Map.teleportToPosition(eve, 32, 32);

    // eve entered last. She should receive sound only through Livekit.
    // Let's wait for the audio stream to be ready (here, we test that the audio stream is directly started in Livekiit)
    await hasAudioStream(eve);

    // Let's also check that the users that were in WebRTC before the switch are still receiving the sound
    await hasAudioStream(alice3);


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
    await hasAudioStream(alice3);

    // Now, let's disconnect eve to force the switch back to WebRTC
    await eve.close();
    await eve.context().close();

    // Let's wait for eve to be disconnected
    await expect(alice3.getByText('eve')).toBeHidden();

    // After disconnect, alice3 should still receive the sound through WebRTC
    await hasAudioStream(alice3);


    await alice.close();
    await alice.context().close();
    await alice2.close();
    await alice2.context().close();
    await alice3.close();
    await alice3.context().close();
    await page.close();
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
      WA.player.proximityMeeting.playSound("http://maps.workadventure.localhost/tests/Audience.mp3");
    });

    // Test listen to sound scripting
    await hasAudioStream(alice, 0.2);

    });
  });
