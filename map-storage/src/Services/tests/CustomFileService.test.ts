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

    it("writes an uploaded file in the world's private files", async () => {
        await service.uploadFile({ id: "f", name: "doc.pdf", propertyId: UUID, file: new Uint8Array([1]) });
        expect(fileSystem.writeByteArrayAsFile).toHaveBeenCalledWith(
            `attacker.test/private/files/doc-${UUID}.pdf`,
            expect.anything(),
        );
    });

    it("writes an uploaded sound in the world's public assets", async () => {
        await service.uploadFile({ id: "f", name: "gong.mp3", propertyId: UUID, file: new Uint8Array([1]) });
        expect(fileSystem.writeByteArrayAsFile).toHaveBeenCalledWith(
            `attacker.test/assets/sounds/gong-${UUID}.mp3`,
            expect.anything(),
        );
    });

    it("refuses files that are neither a document nor a sound", async () => {
        await expect(
            service.uploadFile({ id: "f", name: "x.html", propertyId: UUID, file: new Uint8Array([1]) }),
        ).rejects.toThrow();
        expect(fileSystem.writeByteArrayAsFile).not.toHaveBeenCalled();
    });

    it("refuses an upload whose property id climbs out of the world's folder", async () => {
        await expect(
            service.uploadFile({ id: "f", name: "x.png", propertyId: TRAVERSAL_ID, file: new Uint8Array([1]) }),
        ).rejects.toThrow();
        expect(fileSystem.writeByteArrayAsFile).not.toHaveBeenCalled();
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
