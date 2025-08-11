import { expect, test} from "@playwright/test";
import { evaluateScript } from "./utils/scripting";
import Map from "./utils/map";
import {publicTestMapUrl} from "./utils/urls";
import { getPage} from "./utils/auth";
import {isMobile} from "./utils/isMobile";
import Menu from "./utils/menu";

test.describe("Scripting audio streams", () => {
  test.beforeEach(async ({ browserName, page }) => {
    // This test does not depend on the browser. Let's only run it in Chromium.
    if (browserName !== "chromium" || isMobile(page)) {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }
  });
  test("can play and listen to sounds", async ({
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

    // Test play sound scripting
    await evaluateScript(page, async () => {
      const sampleRate = 24000;

      const audioStream = await WA.player.proximityMeeting.startAudioStream(sampleRate);

      // Generate a sine wave
      const frequency = 440;
      const amplitude = 1;
      const duration = 20;
      const numSamples = duration * sampleRate;
      const samples = new Float32Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        samples[i] = amplitude * Math.sin(2 * Math.PI * frequency * i / sampleRate);
      }

      window.audioStream = audioStream;
      audioStream.appendAudioData(samples).catch((e) => {
        window.streamInterrupted = true;
      });
    });

    // Test listen to sound scripting
    await evaluateScript(alice, async () => {
      const sampleRate = 24000;

      return new Promise((resolve) => {
        WA.player.proximityMeeting.listenToAudioStream(sampleRate).subscribe((data: Float32Array) => {
          // At some point, the volume of the sound should be high enough to be noticed in the sample
          if (data.some((sample) => Math.abs(sample) > 0.7)) {
              resolve();
          }
        });
      });
    });

    await expect.poll(() => evaluateScript(page, () => window.streamInterrupted)).toBe(undefined);

    // Now, let's add more users to test the switch to Livekit
    const alice2 = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "scripting_audio_stream"));
    await Menu.turnOffMicrophone(alice2);
    await Map.teleportToPosition(alice2, 32, 32);
    const alice3 = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "scripting_audio_stream"));
    await Menu.turnOffMicrophone(alice3);
    await Map.teleportToPosition(alice3, 32, 32);
    const alice4 = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "scripting_audio_stream"));
    await Menu.turnOffMicrophone(alice4);
    await Map.teleportToPosition(alice4, 32, 32);

    // alice4 entered last. She should receive sound only through Livekit.
    // Let's wait for the audio stream to be ready
    await evaluateScript(alice4, async () => {
      const sampleRate = 24000;

      return new Promise((resolve) => {
        WA.player.proximityMeeting.listenToAudioStream(sampleRate).subscribe((data: Float32Array) => {
          // At some point, the volume of the sound should be high enough to be noticed in the sample
          if (data.some((sample) => Math.abs(sample) > 0.7)) {
            resolve();
          }
        });
      });
    });


    // Now, let's reset the audio buffer
    await evaluateScript(page, async () => {
      window.audioStream.resetAudioBuffer();
    });

    await expect.poll(() => evaluateScript(page, () => window.streamInterrupted)).toBe(true);

    await alice.close();
    await alice.context().close();
    await alice2.close();
    await alice2.context().close();
    await alice3.close();
    await alice3.context().close();
    await alice4.close();
    await alice4.context().close();
    await page.close();
    await page.context().close();
  });
});
