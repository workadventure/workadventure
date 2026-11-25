import { describe, expect, it } from "vitest";
import { loadReleaseNotes, releaseNotes } from "./releaseNotes";

describe("release notes", () => {
    it("loads the Markdown file of the release", async () => {
        await expect(loadReleaseNotes("1.35", "en-US")).resolves.toContain("## Drag the map");
    });

    it("points a media file of the release's folder at its URL", async () => {
        const notes = await loadReleaseNotes("1.35", "en-US");
        expect(notes).not.toContain("](drag-the-map.mp4)");
        expect(notes).toMatch(/\]\([^)]*\/announcements\/1\.35\/drag-the-map\.mp4\)/);
        expect(notes).toMatch(/\]\([^)]*\/announcements\/1\.35\/mini-window\.webp\)/);
        // Links are not files of the folder.
        expect(notes).toContain("](https://workadventu.re/download/)");
    });

    it("shows the English text to a locale that has not translated it yet", async () => {
        const english = await loadReleaseNotes("1.35", "en-US");
        await expect(loadReleaseNotes("1.35", "xx-XX")).resolves.toBe(english);
    });

    it("fails for a release without notes", async () => {
        await expect(loadReleaseNotes("0.1", "en-US")).rejects.toThrow("announcements/0.1/en-US.md");
    });

    it("keys the announcement by version", () => {
        expect(releaseNotes("1.35")).toMatchObject({ id: "wa.announcement.v1.35", kind: "announcement" });
    });
});
