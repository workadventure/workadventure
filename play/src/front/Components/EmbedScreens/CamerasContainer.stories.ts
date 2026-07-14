import type { Meta, StoryObj } from "@storybook/svelte-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import CamerasContainerStoryHarness, { type CameraHarness } from "./CamerasContainerStoryHarness.svelte";

const getHarness = (): CameraHarness => {
    const harness = (window as Window & { __cameraHarness?: CameraHarness }).__cameraHarness;
    if (!harness) {
        throw new Error("Camera story harness is not ready");
    }
    return harness;
};

const sleep = (duration: number): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(resolve, duration);
    });

async function waitForStableEvents(stableDuration = 200, timeout = 3_000): Promise<void> {
    const deadline = performance.now() + timeout;

    async function poll(): Promise<void> {
        if (performance.now() >= deadline) {
            throw new Error("Camera subscription events did not stabilize");
        }

        const eventCount = getHarness().events.length;
        await sleep(stableDuration);

        if (getHarness().events.length === eventCount) {
            return;
        }

        return poll();
    }

    await poll();
}

async function expectNoVisibilityChurnAfterSettle(): Promise<void> {
    await waitFor(
        async () => {
            await expect(getHarness().activeIds().length).toBeGreaterThan(0);
        },
        { timeout: 3_000 },
    );

    await waitForStableEvents();

    const harness = getHarness();
    const activeIds = harness.activeIds();
    await expect(activeIds.length).toBeLessThan(20);

    const settledEventCount = harness.events.length;
    await sleep(700);
    await expect(harness.events.slice(settledEventCount)).toEqual([]);
}

const meta = {
    title: "EmbedScreens/CamerasContainer",
    component: CamerasContainerStoryHarness,
    parameters: {
        layout: "fullscreen",
    },
} satisfies Meta<typeof CamerasContainerStoryHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HorizontalOverflowNoVisibilityChurn: Story = {
    args: {
        initialOneLine: true,
        boxCount: 20,
        frameWidth: 900,
        frameHeight: 190,
    },
    play: async () => {
        await expectNoVisibilityChurnAfterSettle();
    },
};

export const MultilineToHorizontalNoDelayedVisibilityChurn: Story = {
    args: {
        initialOneLine: false,
        boxCount: 20,
        frameWidth: 900,
        frameHeight: 520,
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByTestId("switch-one-line"));
        await expectNoVisibilityChurnAfterSettle();
    },
};
