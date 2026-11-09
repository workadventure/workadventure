import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted above the imports below: EnvironmentVariable exits the process when these are missing.
vi.hoisted(() => {
    process.env.API_URL = "http://admin.test";
    process.env.MAP_STORAGE_API_TOKEN = "token";
    process.env.PUSHER_URL = "http://play.test";
    // Several worlds share the storage, each in a folder named after its domain.
    process.env.USE_DOMAIN_NAME_IN_PATH = "true";
});

vi.mock("../../fileSystem", () => ({
    fileSystem: { writeByteArrayAsFile: vi.fn(), deleteFiles: vi.fn() },
}));

import { UploadedFileKind } from "@workadventure/messages";
import { fileSystem } from "../../fileSystem";
import { CustomFileService } from "../CustomFileService";

// Climbs out of "attacker.test/private/files/" into another world's folder.
const TRAVERSAL_ID = "/../../../../victim.test";
const UUID = "0b8e3b9e-4f0a-4c1e-9d5b-2a6f1c7e8d90";

describe("CustomFileService", () => {
    const service = new CustomFileService("attacker.test");

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const upload = (name: string, kind: UploadedFileKind, propertyId = UUID) =>
        service.uploadFile({ id: "f", name, propertyId, kind, file: new Uint8Array([1]) });

    it("stores documents in the world's private files and sounds in its public assets", async () => {
        await upload("doc.pdf", UploadedFileKind.Document);
        await upload("gong.mp3", UploadedFileKind.Sound);
        expect(vi.mocked(fileSystem.writeByteArrayAsFile).mock.calls.map(([path]) => path)).toEqual([
            `attacker.test/private/files/doc-${UUID}.pdf`,
            `attacker.test/assets/sounds/gong-${UUID}.mp3`,
        ]);
    });

    it("refuses a format its kind does not accept, and a kind it does not know", async () => {
        await expect(upload("x.html", UploadedFileKind.Document)).rejects.toThrow();
        await expect(upload("x.pdf", UploadedFileKind.Sound)).rejects.toThrow();
        await expect(upload("x.mp3", UploadedFileKind.Document)).rejects.toThrow();
        await expect(upload("x.mp3", UploadedFileKind.UNRECOGNIZED)).rejects.toThrow();
        await expect(upload("x.mp3", 42 as UploadedFileKind)).rejects.toThrow();
        expect(fileSystem.writeByteArrayAsFile).not.toHaveBeenCalled();
    });

    it("refuses an upload whose property id climbs out of the world's folder", async () => {
        await expect(upload("x.png", UploadedFileKind.Document, TRAVERSAL_ID)).rejects.toThrow();
        expect(fileSystem.writeByteArrayAsFile).not.toHaveBeenCalled();
    });

    it("finds the folder of a file to delete from the property type", async () => {
        await service.deleteFile({
            id: UUID,
            type: "openFile",
            name: "doc.pdf",
            link: "",
            newTab: false,
            hideUrl: false,
        });
        await service.deleteFile({ id: UUID, type: "playAudio", audioLink: "", audioName: "gong.mp3" });
        expect(vi.mocked(fileSystem.deleteFiles).mock.calls).toEqual([
            [`attacker.test/private/files/doc-${UUID}.pdf`],
            [`attacker.test/assets/sounds/gong-${UUID}.mp3`],
        ]);
    });

    it("refuses to delete a file whose property id climbs out of the world's folder", async () => {
        await expect(
            service.deleteFile({
                id: TRAVERSAL_ID,
                type: "openFile",
                name: "x",
                link: "https://x",
                newTab: false,
                hideUrl: false,
            }),
        ).rejects.toThrow();
        expect(fileSystem.deleteFiles).not.toHaveBeenCalled();
    });
});
