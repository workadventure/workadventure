import { devices, defineConfig } from "@playwright/test";

// Run by rehearse.sh (never directly: it needs the cluster and the Playwright slot, see dev/dev test).
// The hosts are https://*-rehearsal.localhost without a port; the port-forward listens on 127.0.0.1:8443 only,
// so Chromium maps every *.localhost name there (the page keeps its real host names, hence the certificate and CORS).
export default defineConfig({
    testDir: ".",
    testMatch: /rehearsal\.spec\.ts/,
    timeout: 45 * 60_000,
    workers: 1,
    retries: 0,
    reporter: [["list"]],
    outputDir: "./results/.playwright",
    use: {
        ...devices["Desktop Chrome"],
        ignoreHTTPSErrors: true,
        permissions: ["microphone", "camera"],
        locale: "en-US",
        launchOptions: {
            args: [
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
                `--host-resolver-rules=MAP *.localhost 127.0.0.1:${process.env.LOCAL_PORT ?? "8443"}`,
            ],
        },
    },
    projects: [{ name: "chromium" }],
});
