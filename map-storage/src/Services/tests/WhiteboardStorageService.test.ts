import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FileSystemInterface } from "../../Upload/FileSystemInterface";

// The real module validates the whole environment on import, which CI does not provide.
vi.mock("../../Enum/EnvironmentVariable", () => ({ PATH_PREFIX: "", USE_DOMAIN_NAME_IN_PATH: false }));

const { WhiteboardLocation, WhiteboardStorageService, WHITEBOARD_SCENE_MAX_BYTES } =
    await import("../WhiteboardStorageService");

// The few calls the service makes, on an in-memory tree.
function memoryFileSystem(): FileSystemInterface & { files: Map<string, string | Uint8Array> } {
    const files = new Map<string, string | Uint8Array>();
    return {
        files,
        exist: (p: string) => Promise.resolve(files.has(p)),
        readFileAsString: (p: string) => Promise.resolve(String(files.get(p))),
        writeStringAsFile: (p: string, content: string) => {
            files.set(p, content);
            return Promise.resolve();
        },
        writeByteArrayAsFile: (p: string, content: Uint8Array) => {
            files.set(p, content);
            return Promise.resolve();
        },
        listFiles: (dir: string) =>
            Promise.resolve([...files.keys()].filter((p) => p.startsWith(dir)).map((p) => p.substring(dir.length))),
        deleteFiles: (p: string) => {
            for (const key of [...files.keys()]) {
                if (key === p || key.startsWith(p)) {
                    files.delete(key);
                }
            }
            return Promise.resolve();
        },
    } as unknown as FileSystemInterface & { files: Map<string, string | Uint8Array> };
}

describe("WhiteboardStorageService", () => {
    let fileSystem: ReturnType<typeof memoryFileSystem>;
    const location = WhiteboardLocation.fromWamUrl(new URL("http://map-storage/maps/office.wam"), "area", "board");

    beforeEach(() => {
        fileSystem = memoryFileSystem();
    });

    it("stores boards under private/, named after their map", () => {
        expect(location.scenePath).toBe("private/whiteboards/maps/office/area/board.excalidraw");
        expect(() =>
            WhiteboardLocation.fromWamUrl(new URL("http://map-storage/maps/office.wam"), "../x", "b"),
        ).toThrow();
    });

    it("saves a .excalidraw file, loads it back, and drops the images nothing uses", async () => {
        const service = new WhiteboardStorageService(fileSystem);
        expect(await service.load(location)).toBe("[]");
        await fileSystem.writeByteArrayAsFile(location.filePath("kept", "png"), new Uint8Array([1]));
        await fileSystem.writeByteArrayAsFile(location.filePath("orphan", "png"), new Uint8Array([2]));

        const elements = [
            { id: "a", type: "rectangle" },
            { id: "b", type: "image", fileId: "kept" },
        ];
        await service.save(location, JSON.stringify(elements), true);

        const stored = JSON.parse(String(fileSystem.files.get(location.scenePath))) as { type: string };
        expect(stored.type).toBe("excalidraw");
        expect(JSON.parse(await service.load(location))).toEqual(elements);
        expect(await fileSystem.exist(location.filePath("kept", "png"))).toBe(true);
        expect(await fileSystem.exist(location.filePath("orphan", "png"))).toBe(false);

        await service.delete(location);
        expect(await fileSystem.exist(location.scenePath)).toBe(false);
        expect(await fileSystem.exist(location.filePath("kept", "png"))).toBe(false);
    });

    it("keeps the unused images while somebody may be uploading one, and refuses an oversized board", async () => {
        const service = new WhiteboardStorageService(fileSystem);
        await fileSystem.writeByteArrayAsFile(location.filePath("uploading", "png"), new Uint8Array([1]));
        await service.save(location, "[]", false);
        expect(await fileSystem.exist(location.filePath("uploading", "png"))).toBe(true);

        await expect(
            service.save(location, JSON.stringify([{ id: "a", text: "x".repeat(WHITEBOARD_SCENE_MAX_BYTES) }]), false),
        ).rejects.toThrow();

        await service.deleteFiles(location);
        expect(await fileSystem.exist(location.filePath("uploading", "png"))).toBe(false);
    });
});
