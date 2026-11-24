import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
    process.env.API_URL = "http://admin.test";
    process.env.MAP_STORAGE_API_TOKEN = "token";
    process.env.PUSHER_URL = "http://play.test";
    process.env.USE_DOMAIN_NAME_IN_PATH = "true";
});

vi.mock("../../fileSystem", () => ({ fileSystem: {} }));

import type { FileSystemInterface } from "../../Upload/FileSystemInterface";
import { FileNotFoundError } from "../../Upload/FileNotFoundError";
import { WorldSettingsService } from "../WorldSettingsService";

function wam(megaphone: unknown): string {
    return JSON.stringify({
        version: "1.0.0",
        mapUrl: "map.tmj",
        entities: {},
        areas: [],
        entityCollections: [],
        settings: { megaphone },
    });
}

function memoryFileSystem(files: Record<string, string>) {
    return {
        readFileAsString: vi.fn((path: string) => {
            if (!(path in files)) {
                return Promise.reject(new FileNotFoundError(path));
            }
            return Promise.resolve(files[path]);
        }),
        writeStringAsFile: vi.fn((path: string, content: string) => {
            files[path] = content;
            return Promise.resolve();
        }),
        listFiles: vi.fn((directory: string) =>
            Promise.resolve(
                Object.keys(files)
                    .filter((path) => path.startsWith(directory) && path.endsWith(".wam"))
                    .map((path) => path.slice(directory.length)),
            ),
        ),
    };
}

describe("WorldSettingsService", () => {
    it("builds the world settings from the WAM files the first time, then reads the stored file", async () => {
        const files: Record<string, string> = {
            "world.test/a.wam": wam({
                enabled: true,
                scope: "WORLD",
                title: "M",
                audienceVideoFeedbackActivated: true,
            }),
            "world.test/b.wam": wam({
                enabled: true,
                scope: "WORLD",
                title: "M",
                audienceVideoFeedbackActivated: true,
            }),
            "other.test/c.wam": wam({ enabled: true, scope: "WORLD", title: "Elsewhere" }),
        };
        const fileSystem = memoryFileSystem(files);
        const service = new WorldSettingsService(fileSystem as unknown as FileSystemInterface);

        const settings = await service.read("world.test");
        expect(settings.megaphone).toEqual({ audienceVideoFeedbackActivated: true });
        expect(files["world.test/__world-settings.json"]).toBeDefined();

        await service.read("world.test");
        expect(fileSystem.listFiles).toHaveBeenCalledTimes(1);
    });

    it("refuses to store settings that do not match the schema", async () => {
        const service = new WorldSettingsService(memoryFileSystem({}) as unknown as FileSystemInterface);
        await expect(
            service.write("world.test", {
                megaphone: { audienceVideoFeedbackActivated: "yes" },
            } as unknown as Parameters<typeof service.write>[1]),
        ).rejects.toThrow();
    });

    it("saves nothing when a WAM file cannot be read from storage", async () => {
        const files: Record<string, string> = {
            "world.test/a.wam": wam({ enabled: true, scope: "WORLD", title: "M" }),
        };
        const fileSystem = memoryFileSystem(files);
        fileSystem.readFileAsString.mockImplementation((path: string) =>
            path.endsWith(".wam")
                ? Promise.reject(new Error("S3 timeout"))
                : Promise.reject(new FileNotFoundError(path)),
        );
        const service = new WorldSettingsService(fileSystem as unknown as FileSystemInterface);
        await expect(service.read("world.test")).rejects.toThrow("S3 timeout");
        expect(fileSystem.writeStringAsFile).not.toHaveBeenCalled();
    });

    it("leaves out a WAM that cannot be parsed, and says so", async () => {
        const files: Record<string, string> = {
            "world.test/a.wam": wam({ enabled: true, scope: "WORLD", title: "M" }),
            "world.test/broken.wam": "{",
        };
        const service = new WorldSettingsService(memoryFileSystem(files) as unknown as FileSystemInterface);
        const settings = await service.read("world.test");
        expect(settings.megaphone).toBeDefined();
        expect(settings.migrationWarnings).toEqual([expect.stringContaining("broken.wam")]);
    });

    it("rebuilds an unreadable settings file for the reader without overwriting it", async () => {
        const files: Record<string, string> = {
            "world.test/a.wam": wam({ enabled: true, scope: "WORLD", title: "M" }),
            "world.test/__world-settings.json": "not json",
        };
        const fileSystem = memoryFileSystem(files);
        const service = new WorldSettingsService(fileSystem as unknown as FileSystemInterface);
        const settings = await service.read("world.test");
        expect(settings.megaphone).toBeDefined();
        expect(settings.migrationWarnings?.[0]).toContain("could not be read");
        expect(fileSystem.writeStringAsFile).not.toHaveBeenCalled();
    });
});
