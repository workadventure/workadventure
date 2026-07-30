import { devices, type PlaywrightTestConfig } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = {
  testDir: './tests',
  /* Maximum time one test can run for. */
  timeout: 120 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 10_000
  },
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only, unless NO_FLAKY is set */
  retries: process.env.NO_FLAKY === "true" ? 0 : (process.env.CI ? 1 : 0),
  /* Opt out of parallel tests. */
  workers: 1,
  /* Limit failures to 9 in CI (to finish early) */
  maxFailures: process.env.CI ? 9 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [ ['html'], ['github'], ['list'] ] : [ ['html'], ['list'] ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 20_000,
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAY_URL ?? 'http://play.workadventure.localhost/',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: process.env.NO_FLAKY === "true" ? 'retain-on-failure' : (process.env.CI ? 'on-first-retry' : 'retain-on-failure'),
    navigationTimeout: 60_000,

    // Emulates the user locale. See https://playwright.dev/docs/api/class-browsertype#browsertypelaunchoptions
    locale: 'en-US',
  },

  /* Configure projects for major browsers */
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        permissions: ["microphone","camera",'notifications'],
        ignoreHTTPSErrors: true,
        launchOptions: {
          args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
        },
      },
    },

    {
      name: 'firefox',
      use: {
        // In CI we run Firefox HEADED under a virtual X display (Xvfb) so it gets a stable
        // software WebGL context instead of exhausting its GL driver options in pure headless
        // mode. The CI workflow sets WA_FIREFOX_HEADED (and DISPLAY) only for the firefox E2E
        // jobs that start Xvfb; elsewhere this stays undefined (Playwright default / headless).
        headless: process.env.WA_FIREFOX_HEADED ? false : undefined,
        launchOptions: {
          firefoxUserPrefs: {
            // use fake audio and video media
            "media.navigator.streams.fake": true,
            "permissions.default.microphone": 1,
            "permissions.default.camera": 1,

            // Accept a (software) WebGL context. Otherwise Firefox exhausts its GL driver
            // options, WebGL creation fails, and Phaser 4 falls back to the Canvas renderer —
            // which cannot bring the game scene up, so the game never becomes ready and the mic
            // button never appears (the 120s load-gate flake).
            "webgl.force-enabled": true,
            "webgl.disable-fail-if-major-performance-caveat": true,
            "gfx.webrender.software": true,
          },
        },
        ignoreHTTPSErrors: true,
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit',
      use: {
        ignoreHTTPSErrors: true,
        ...devices['Desktop Safari'],
      },
    },

    /* Test against mobile viewports. */
    {
      name: 'mobilechromium',
      use: {
        ...devices['Pixel 5'],
        browserName: 'chromium',
        permissions: ["microphone","camera"],
        ignoreHTTPSErrors: true,
        launchOptions: {
          args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
        },
      },
    },
    {
      name: 'mobilefirefox',
      use: {
        ...devices['Pixel 5'],
        browserName: 'firefox',
        isMobile: false,
        ignoreHTTPSErrors: true,
        // Run headed under Xvfb in CI for a stable WebGL context (see the desktop firefox project).
        headless: process.env.WA_FIREFOX_HEADED ? false : undefined,
        launchOptions: {
          firefoxUserPrefs: {
            // use fake audio and video media
            "media.navigator.streams.fake": true,
            "permissions.default.microphone": 1,
            "permissions.default.camera": 1,

            // Accept a (software) WebGL context in CI (see the desktop firefox project).
            "webgl.force-enabled": true,
            "webgl.disable-fail-if-major-performance-caveat": true,
            "gfx.webrender.software": true,
          },
        },
      },
    },
    {
      name: 'mobilewebkit',
      use: {
        ...devices['iPhone 7'],
        browserName: 'webkit',
        ignoreHTTPSErrors: true,
      },
    },

    /* To use safari project and test on mobile safari, we need to have https test environment ¨*/
     //{
     //  name: 'mobilesafari',
     //  use: {
     //    ...devices['iPhone 13'],
     //  },
    //},

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: {
    //     channel: 'msedge',
    //   },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: {
    //     channel: 'chrome',
    //   },
    // },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  // outputDir: 'test-results/',

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   port: 3000,
  // },
};

export default config;
