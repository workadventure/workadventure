import { EntityCollectionRaw } from "@workadventure/map-editor";
import { CustomEntityDirection } from "@workadventure/messages";
import type { UploadEntityMessage } from "@workadventure/messages";
import { beforeEach, describe, expect, it, vi } from "vitest";

const files = new Map<string, string>();

// PathMapper pulls in EnvironmentVariable, which validates process.env and exits the process.
vi.mock("../PathMapper", () => ({
    mapPathUsingDomainWithPrefix: (filePath: string, domain: string) => `${domain}${filePath}`,
}));

vi.mock("../../fileSystem", () => ({
    fileSystem: {
        exist: (path: string) => Promise.resolve(files.has(path)),
        readFileAsString: (path: string) => Promise.resolve(files.get(path) ?? ""),
        writeStringAsFile: (path: string, content: string) => {
            files.set(path, content);
            return Promise.resolve();
        },
        writeByteArrayAsFile: () => Promise.resolve(),
        deleteFiles: () => Promise.resolve(),
    },
}));

import { CustomEntityCollectionService } from "../CustomEntityCollectionService";

const OWNER_UUID = "998ce839-3dea-4698-8b41-ebbdf7688ad9";

function uploadMessage(overrides: Partial<UploadEntityMessage> = {}): UploadEntityMessage {
    return {
        file: new Uint8Array(0),
        id: "entity-1",
        name: "My asset",
        tags: ["Custom"],
        imagePath: "entity-1-asset.png",
        direction: CustomEntityDirection.Down,
        color: "",
        collisionGrid: undefined,
        depthOffset: undefined,
        ownerId: OWNER_UUID,
        ...overrides,
    };
}

async function readCollection(service: CustomEntityCollectionService) {
    const entity = await service.getEntity("entity-1");
    expect(entity).toBeDefined();
    return entity;
}

describe("CustomEntityCollectionService", () => {
    beforeEach(() => {
        files.clear();
    });

    it("persists the ownerId set on the upload message", async () => {
        const service = new CustomEntityCollectionService("play.workadventure.localhost");

        await service.uploadEntity(uploadMessage());

        expect((await readCollection(service))?.ownerId).toBe(OWNER_UUID);
    });

    it("keeps the ownerId when the entity is modified", async () => {
        const service = new CustomEntityCollectionService("play.workadventure.localhost");
        await service.uploadEntity(uploadMessage());

        await service.modifyEntity({
            id: "entity-1",
            name: "Renamed",
            tags: ["Other"],
            collisionGrid: undefined,
            depthOffset: 12,
        });

        const entity = await readCollection(service);
        expect(entity?.name).toBe("Renamed");
        expect(entity?.ownerId).toBe(OWNER_UUID);
    });

    it("writes a collection file that still parses without any ownerId", async () => {
        const service = new CustomEntityCollectionService("play.workadventure.localhost");

        await service.uploadEntity(uploadMessage({ ownerId: undefined }));

        const [content] = [...files.values()];
        expect(() => EntityCollectionRaw.parse(JSON.parse(content))).not.toThrow();
        expect((await readCollection(service))?.ownerId).toBeUndefined();
    });
});
