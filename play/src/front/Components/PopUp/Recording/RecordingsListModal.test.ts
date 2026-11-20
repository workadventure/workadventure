import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount, tick } from "svelte";
import { readable, writable } from "svelte/store";

/** Every translation renders as its key path, so assertions do not depend on the copy. */
function translationProxy(path: string[] = []): unknown {
    return new Proxy(() => path.join("."), {
        get: (_target, key) => translationProxy([...path, String(key)]),
    });
}

const connection = {
    queryRecordings: vi.fn(),
    deleteRecording: vi.fn(),
    queryRecordingThumbnails: vi.fn(() => Promise.resolve([])),
    getSignedUrl: vi.fn(() => Promise.resolve("https://example.test/video.mp4")),
};

vi.mock("../../../../i18n/i18n-svelte", () => ({ LL: readable(translationProxy()) }));
vi.mock("../../../Phaser/Game/GameManager", () => ({
    gameManager: { getCurrentGameScene: () => ({ connection }) },
}));
vi.mock("../../../Stores/RecordingStore", () => ({ showRecordingList: writable(true) }));
vi.mock("../../../Stores/NotificationStore", () => ({ notificationPlayingStore: { playNotification: vi.fn() } }));
vi.mock("../../../Stores/CoWebsiteStore", () => ({ coWebsites: { add: vi.fn() } }));
vi.mock("../../../WebRtc/CoWebsite/VideoCoWebsite", () => ({ VideoCoWebsite: vi.fn() }));
vi.mock("../../../Connection/LocalUserStore", () => ({
    localUserStore: { getRecordingsViewMode: () => "list", setRecordingsViewMode: vi.fn() },
}));

const { default: RecordingsListModal } = await import("./RecordingsListModal.svelte");

/** "YYYY-MM-DDTHH:MM:SS", as the pusher sends it, `daysAgo` days before now. */
function timestamp(daysAgo: number): string {
    const date = new Date(Date.now() - daysAgo * 86_400_000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

function recording(daysAgo: number, size: number) {
    const ts = timestamp(daysAgo);
    return {
        timestamp: ts,
        baseFilename: `recording-${ts}`,
        videoFile: { key: `user/recording-${ts}.mp4`, filename: `recording-${ts}.mp4`, size },
        posterUrl: "",
    };
}

let target: HTMLElement;

async function settle(): Promise<void> {
    // A macrotask lets every resolved mock and its continuations run first.
    await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
    });
    await tick();
    flushSync();
}

function byTestId(id: string): HTMLElement | null {
    return target.querySelector(`[data-testid="${id}"]`);
}

beforeEach(() => {
    target = document.createElement("div");
    document.body.appendChild(target);
    connection.queryRecordings.mockResolvedValue([recording(1, 312_000_000), recording(85, 1_200_000_000)]);
    connection.deleteRecording.mockResolvedValue({ success: true });
});

afterEach(() => {
    target.remove();
    vi.clearAllMocks();
});

describe("RecordingsListModal", () => {
    it("only flags the recording that is about to expire", async () => {
        const component = mount(RecordingsListModal, { target });
        await settle();

        const items = target.querySelectorAll("li");
        expect(items).toHaveLength(2);
        expect(items[0].textContent).not.toContain("recording.expireIn");
        expect(items[1].textContent).toContain("recording.expireIn");

        await unmount(component);
    });

    it("asks for confirmation before deleting, and cancelling keeps the recording", async () => {
        const component = mount(RecordingsListModal, { target });
        await settle();

        byTestId("recording-delete-0")?.click();
        flushSync();
        expect(connection.deleteRecording).not.toHaveBeenCalled();
        expect(target.querySelector('[role="alertdialog"]')).not.toBeNull();

        const cancel = [...target.querySelectorAll('[role="alertdialog"] button')].find((b) =>
            b.textContent?.includes("recording.deleteConfirm.cancel"),
        ) as HTMLElement;
        cancel.click();
        flushSync();
        expect(target.querySelector('[role="alertdialog"]')).toBeNull();
        expect(target.querySelectorAll("li")).toHaveLength(2);

        byTestId("recording-delete-0")?.click();
        flushSync();
        byTestId("recording-delete-confirm-0")?.click();
        await settle();
        expect(connection.deleteRecording).toHaveBeenCalledTimes(1);
        expect(target.querySelectorAll("li")).toHaveLength(1);

        await unmount(component);
    });
});
