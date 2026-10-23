import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlayAudioPropertyData } from "@workadventure/map-editor";

// Hoisted above the imports below: EnvironmentVariable exits the process when these are missing.
vi.hoisted(() => {
    process.env.API_URL = "http://admin.test";
    process.env.MAP_STORAGE_API_TOKEN = "token";
    process.env.PUSHER_URL = "http://play.test";
    process.env.USE_DOMAIN_NAME_IN_PATH = "true";
});

vi.mock("../../fileSystem", () => ({
    fileSystem: { deleteFiles: vi.fn() },
}));

import { fileSystem } from "../../fileSystem";
import { HookManager } from "../HookManager";
import { FileModule } from "../FileModule";

const ID = "0b8e3b9e-4f0a-4c1e-9d5b-2a6f1c7e8d90";
const SOUND_PATH = `world.test/assets/sounds/gong-${ID}.mp3`;

const uploadedSound: PlayAudioPropertyData = {
    id: ID,
    type: "playAudio",
    audioLink: `https://map-storage.test/assets/sounds/gong-${ID}.mp3`,
    audioName: "gong.mp3",
};
const linkedSound: PlayAudioPropertyData = { id: ID, type: "playAudio", audioLink: "https://x.test/a.mp3" };

describe("FileModule", () => {
    const hookManager = new HookManager();
    new FileModule().init(hookManager);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("deletes an uploaded sound replaced by a URL, by another file, or deleted with its entity", async () => {
        await hookManager.fireEntityPropertyChange({}, uploadedSound, linkedSound, "world.test");
        await hookManager.fireEntityPropertyChange(
            {},
            uploadedSound,
            { ...uploadedSound, audioName: "bell.mp3" },
            "world.test",
        );
        await hookManager.fireEntityPropertyDelete({}, uploadedSound, "world.test");
        expect(vi.mocked(fileSystem.deleteFiles).mock.calls).toEqual([[SOUND_PATH], [SOUND_PATH], [SOUND_PATH]]);
    });

    it("keeps the sound while it is still used, and deletes nothing for a URL", async () => {
        await hookManager.fireEntityPropertyChange({}, uploadedSound, { ...uploadedSound, volume: 0.5 }, "world.test");
        await hookManager.fireEntityPropertyChange({}, linkedSound, uploadedSound, "world.test");
        await hookManager.fireAreaPropertyDelete({ id: "a" }, linkedSound, "world.test");
        expect(fileSystem.deleteFiles).not.toHaveBeenCalled();
    });
});
