import { expect, test, type Browser, type Page } from "@playwright/test";
import Map from "./utils/map";
import { getPage } from "./utils/auth";
import { evaluateScript } from "./utils/scripting";
import { expectWebRtcConnectionsCountToBe } from "./utils/webRtc";
import { play_url, publicTestMapUrl } from "./utils/urls";

/**
 * What happens when a member's video encoders report a CPU limitation for most of a minute (CpuLimitationDetector).
 *
 * Alice's page rewrites `qualityLimitationReason` to "cpu" in every outbound video stats report, so the whole chain
 * runs on a real signal shape without needing a machine that actually struggles: stats parsing, the detector's
 * window, the `cpuLimited` flag on the SpaceUser, the back's policy, the switch to LiveKit, and on LiveKit the
 * camera republished with a cheaper codec once the next window says the limitation is still there.
 *
 * Opt-in (RUN_CPU_LIMITATION_E2E=1): it needs LiveKit and takes a few minutes, one detector window per step. With
 * CPU_LIMITATION_EXPECT=demote, for a back that does not act on the flag, the bubble is expected to stay in P2P and
 * Alice to renegotiate the cheaper codec with both peers instead.
 */
const MAP_URL = process.env.CODEC_TEST_MAP_URL ?? publicTestMapUrl("tests/E2E/empty.json", "cpu-limitation-e2e");
const EXPECT = process.env.CPU_LIMITATION_EXPECT ?? "switch";
// The detector decides after 10 warm-up samples and a 60-sample window, one sample a second
const WINDOW_MS = 75_000;

const showStats = async (page: Page) => {
    await page.addInitScript(() => {
        localStorage.setItem("displayVideoQualityStats", "true");
    });
};

// Every outbound video stream looks CPU-limited to this page
const pretendCpuLimited = async (page: Page) => {
    await showStats(page);
    await page.addInitScript(() => {
        const patch = (proto: { getStats: (...args: unknown[]) => Promise<RTCStatsReport> }) => {
            const original = proto.getStats;
            proto.getStats = async function (this: unknown, ...args: unknown[]) {
                const report = await original.apply(this, args);
                const limited = new globalThis.Map<string, unknown>();
                report.forEach((value: RTCStats & { kind?: string; mediaType?: string }, key: string) => {
                    const video = value.type === "outbound-rtp" && (value.kind ?? value.mediaType) === "video";
                    limited.set(key, video ? { ...value, qualityLimitationReason: "cpu" } : value);
                });
                return limited;
            };
        };
        patch(RTCPeerConnection.prototype);
        patch(RTCRtpSender.prototype);
    });
};

function statsBox(page: Page) {
    return page.getByTestId("encoder-stats").first();
}

// The cells of the box run together in textContent ("Codec:video/VP9Source:P2P (2 encoders)Limited by:cpu").
// Empty while the box is not displayed (a republish hides it for a moment), so that a poll keeps polling.
async function boxText(page: Page): Promise<string> {
    return (
        (await statsBox(page)
            .textContent({ timeout: 2_000 })
            .catch(() => "")) ?? ""
    );
}

test.describe("CPU-limited encoders @nomobile", () => {
    test.beforeEach(({ browserName }) => {
        if (browserName !== "chromium" || !process.env.RUN_CPU_LIMITATION_E2E) {
            test.skip();
        }
    });

    // Three users in a P2P bubble, Alice encoding for the two others and seeing herself limited, Bob not
    async function bubbleOfThree(browser: Browser) {
        const url = new URL(MAP_URL, play_url).toString();
        const alice = await getPage(browser, "Alice", url, { pageCreatedHook: pretendCpuLimited });
        const bob = await getPage(browser, "Bob", url, { pageCreatedHook: showStats });
        const carol = await getPage(browser, "Carol", url, { pageCreatedHook: showStats });

        const position = await evaluateScript(alice, async () => WA.player.getPosition());
        await Map.teleportToPosition(bob, position.x, position.y);
        await Map.teleportToPosition(carol, position.x, position.y);
        await expect(alice.locator("#cameras-container").getByText("Bob")).toBeVisible({ timeout: 60_000 });
        await expect(alice.locator("#cameras-container").getByText("Carol")).toBeVisible({ timeout: 60_000 });
        await expectWebRtcConnectionsCountToBe(alice, 2, 30_000);

        // The box needs a couple of stats polls before it shows anything
        await expect(statsBox(alice)).toBeVisible({ timeout: 60_000 });
        await expect.poll(() => boxText(alice), { timeout: 30_000 }).toMatch(/Source:\s*P2P \(2 encoders\)/);
        await expect.poll(() => boxText(alice), { timeout: 30_000 }).toMatch(/Limited by:\s*cpu/);
        await expect.poll(() => boxText(bob), { timeout: 30_000 }).toMatch(/Limited by:\s*none/);
        return {
            alice,
            bob,
            carol,
            [Symbol.asyncDispose]: async () => {
                await Promise.all([alice.close(), bob.close(), carol.close()]);
            },
        };
    }

    test("the bubble moves to LiveKit on the member's flag and stays there", async ({ browser }) => {
        test.skip(EXPECT !== "switch", "CPU_LIMITATION_EXPECT is not 'switch'");
        test.setTimeout(6 * WINDOW_MS);
        await using bubble = await bubbleOfThree(browser);
        const { alice, bob, carol } = bubble;

        // Fewer encoders first: Alice's flag moves the whole bubble to LiveKit, below the user count threshold
        await expect.poll(() => boxText(alice), { timeout: 2 * WINDOW_MS }).toMatch(/Source:\s*Livekit/);
        await expect.poll(() => boxText(bob), { timeout: 30_000 }).toMatch(/Source:\s*Livekit/);
        console.log("Bubble moved to LiveKit on Alice's flag");

        // A member leaving does not bring the pair back to P2P while Alice is there (the fallback delay is 20 s)
        await carol.close();
        await expect(alice.locator("#cameras-container").getByText("Carol")).toBeHidden({ timeout: 60_000 });
        await alice.waitForTimeout(30_000);
        await expect.poll(() => boxText(alice)).toMatch(/Source:\s*Livekit/);
        console.log("Bubble stayed on LiveKit after Carol left");

        // Still limited with a single encoder: the next window leaves VP9, the camera is published again in H.264
        await expect.poll(() => boxText(alice), { timeout: 2 * WINDOW_MS }).toMatch(/Codec:\s*video\/H264/i);
        await expect.poll(() => boxText(alice), { timeout: 30_000 }).toMatch(/Source:\s*Livekit/);
        console.log("Alice republished her camera in H.264 on LiveKit");
    });

    test("without a back that acts on the flag, the member renegotiates a cheaper codec with both peers", async ({
        browser,
    }) => {
        test.skip(EXPECT !== "demote", "CPU_LIMITATION_EXPECT is not 'demote'");
        test.setTimeout(4 * WINDOW_MS);
        await using bubble = await bubbleOfThree(browser);
        const { alice, bob, carol } = bubble;

        await expect.poll(() => boxText(alice), { timeout: 2 * WINDOW_MS }).toMatch(/Codec:\s*video\/H264/i);
        await expect.poll(() => boxText(bob), { timeout: 30_000 }).toMatch(/Codec:\s*video\/H264/i);
        await expect.poll(() => boxText(carol), { timeout: 30_000 }).toMatch(/Codec:\s*video\/H264/i);
        console.log("Alice and both peers renegotiated H.264");
    });
});
