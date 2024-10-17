import {chromium, test} from "@playwright/test";
import { evaluateScript } from "./utils/scripting";
import { login } from "./utils/roles";
import Map from "./utils/map";

test.describe("Scripting audio streams", () => {
  test("can play and listen to sounds", async ({
    page,
    browser,
  }, { project }) => {
    // This test runs only on Chrome
    // Firefox fails it because the sample rate must be equal to the microphone sample rate
    // Safari fails it because Safari
    if(browser.browserType() !== chromium || project.name === "mobilechromium") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    await page.goto(Map.url("empty"));
    await login(page, "bob", 3, "us-US", false);

    await Map.teleportToPosition(page, 32, 32);

    // Open new page for alice
    const newBrowser = await browser.browserType().launch();
    const alice = await newBrowser.newPage();
    await alice.goto(Map.url("empty"));
    await login(alice, "alice", 4, "us-US", false);

    // Move alice to the same position as bob
    await Map.teleportToPosition(alice, 32, 32);

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

      audioStream.appendAudioData(samples);
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

    await alice.close();
    await newBrowser.close();
  });
});
