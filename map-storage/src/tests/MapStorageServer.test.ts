import type { ServerUnaryCall } from "@grpc/grpc-js";
import { WamFile } from "@workadventure/map-editor";
import type { WAMFileFormat } from "@workadventure/map-editor";
import type { EditMapCommandMessage, EditMapCommandWithKeyMessage } from "@workadventure/messages";
import { UploadedFileKind } from "@workadventure/messages";
import type { Empty } from "@workadventure/messages/src/ts-proto-generated/google/protobuf/empty";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted above the imports below: EnvironmentVariable exits the process when these are missing.
vi.hoisted(() => {
    process.env.API_URL = "http://admin.test";
    process.env.MAP_STORAGE_API_TOKEN = "token";
    process.env.PUSHER_URL = "http://play.test";
});

import { entitiesManager } from "../EntitiesManager";
import { mapsManager } from "../MapsManager";
import { mapStorageServer } from "../MapStorageServer";

const ZONE_TAG = "zone-editor";
const prefabRef = { id: "chair", collectionName: "basic" };

// A zone (0,0)-(320,320) writable by ZONE_TAG, one entity inside it and one outside.
function makeWam(): WAMFileFormat {
    return {
        version: "1.0.0",
        mapUrl: "http://play.test/map.tmj",
        entityCollections: [],
        areas: [
            {
                id: "zone",
                name: "zone",
                x: 0,
                y: 0,
                width: 320,
                height: 320,
                visible: true,
                properties: [
                    { id: "rights", type: "restrictedRightsPropertyData", writeTags: [ZONE_TAG], readTags: [] },
                ],
            },
        ],
        entities: {
            inside: { x: 32, y: 32, prefabRef, properties: [] },
            outside: { x: 640, y: 640, prefabRef, properties: [] },
        },
    };
}

type EditMapMessage = NonNullable<NonNullable<EditMapCommandMessage["editMapMessage"]>["message"]>;

const VISITOR = { userCanEdit: false, connectedUserTags: [] as string[] };
const ZONE_EDITOR = { userCanEdit: false, connectedUserTags: [ZONE_TAG] };

let wamFile: WamFile;
let addCommandToQueue: ReturnType<typeof vi.spyOn>;
let entitiesExecute: ReturnType<typeof vi.spyOn>;

function send(user: typeof VISITOR, message: EditMapMessage): Promise<EditMapCommandMessage> {
    const request: EditMapCommandWithKeyMessage = {
        mapKey: "http://play.test/map.wam",
        editMapCommandMessage: { id: "command-1", editMapMessage: { message } },
        userUUID: "user-uuid",
        ...user,
    };
    return new Promise((resolve, reject) => {
        mapStorageServer.handleEditMapCommandWithKeyMessage(
            { request } as ServerUnaryCall<EditMapCommandWithKeyMessage, Empty>,
            (error, response) => (response ? resolve(response) : reject(new Error(JSON.stringify(error)))),
        );
    });
}

async function expectRefused(user: typeof VISITOR, message: EditMapMessage): Promise<void> {
    const wamBefore = structuredClone(wamFile.getWam());
    const response = await send(user, message);
    expect(response.editMapMessage?.message?.$case).toBe("errorCommandMessage");
    const errorMessage = response.editMapMessage?.message;
    expect(errorMessage?.$case === "errorCommandMessage" && errorMessage.errorCommandMessage.reason).toMatch(
        /is not allowed/,
    );
    expect(wamFile.getWam()).toEqual(wamBefore);
    expect(addCommandToQueue).not.toHaveBeenCalled();
    expect(entitiesExecute).not.toHaveBeenCalled();
}

async function expectAccepted(user: typeof VISITOR, message: EditMapMessage): Promise<void> {
    const response = await send(user, message);
    expect(response.editMapMessage?.message?.$case).toBe(message.$case);
    expect(addCommandToQueue).toHaveBeenCalledOnce();
}

function createEntity(x: number, y: number, width = 32, height = 32): EditMapMessage {
    return {
        $case: "createEntityMessage",
        createEntityMessage: {
            id: "new",
            x,
            y,
            width,
            height,
            prefabId: "chair",
            collectionName: "basic",
            properties: [],
        },
    };
}

function modifyEntity(id: string, x: number, y: number, width = 32, height = 32): EditMapMessage {
    return { $case: "modifyEntityMessage", modifyEntityMessage: { id, x, y, width, height, properties: [] } };
}

function deleteEntity(id: string): EditMapMessage {
    return { $case: "deleteEntityMessage", deleteEntityMessage: { id } };
}

const uploadFile: EditMapMessage = {
    $case: "uploadFileMessage",
    uploadFileMessage: {
        id: "file",
        name: "doc.pdf",
        propertyId: "prop",
        kind: UploadedFileKind.Document,
        file: new Uint8Array([1]),
    },
};

const uploadEntity: EditMapMessage = {
    $case: "uploadEntityMessage",
    uploadEntityMessage: {
        id: "custom",
        name: "custom",
        tags: [],
        imagePath: "custom.png",
        direction: 0,
        color: "",
        file: new Uint8Array([1]),
    },
};

describe("MapStorageServer entity edit permissions", () => {
    beforeEach(() => {
        wamFile = new WamFile(makeWam());
        vi.spyOn(mapsManager, "getOrLoadWamFile").mockResolvedValue(wamFile);
        // Run the command without the auto-save timers and the map cache of the real executeCommand.
        vi.spyOn(mapsManager, "executeCommand").mockImplementation(async (_key, _domain, command) => {
            await command.execute();
        });
        addCommandToQueue = vi.spyOn(mapsManager, "addCommandToQueue").mockImplementation(() => {});
        entitiesExecute = vi.spyOn(entitiesManager, "executeCommand").mockResolvedValue();
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("delete", () => {
        it("refuses a visitor deleting an entity", async () => {
            await expectRefused(VISITOR, deleteEntity("inside"));
        });

        it("refuses a zone editor deleting an entity outside their zone", async () => {
            await expectRefused(ZONE_EDITOR, deleteEntity("outside"));
        });

        it("lets a zone editor delete an entity inside their zone", async () => {
            await expectAccepted(ZONE_EDITOR, deleteEntity("inside"));
            expect(wamFile.getWam().entities.inside).toBeUndefined();
        });

        it("still dispatches the delete of an entity that no longer exists, so clients converge", async () => {
            await expectAccepted(VISITOR, deleteEntity("already-deleted"));
        });
    });

    describe("create", () => {
        it("refuses a zone editor creating an entity outside their zone", async () => {
            await expectRefused(ZONE_EDITOR, createEntity(640, 640));
        });

        it("refuses an entity outside the zone whose fake size puts its center inside", async () => {
            await expectRefused(ZONE_EDITOR, createEntity(-200, -200, 600, 600));
        });

        it("lets a zone editor create an entity inside their zone", async () => {
            await expectAccepted(ZONE_EDITOR, createEntity(64, 64));
            expect(wamFile.getWam().entities.new).toBeDefined();
        });
    });

    describe("modify", () => {
        it("refuses a zone editor moving an entity from outside into their zone", async () => {
            await expectRefused(ZONE_EDITOR, modifyEntity("outside", 64, 64));
        });

        it("refuses a zone editor moving an entity out of their zone", async () => {
            await expectRefused(ZONE_EDITOR, modifyEntity("inside", 640, 640));
        });

        it("lets a zone editor move an entity inside their zone", async () => {
            await expectAccepted(ZONE_EDITOR, modifyEntity("inside", 96, 96));
            expect(wamFile.getWam().entities.inside.x).toBe(96);
        });
    });

    describe("upload", () => {
        it("refuses a file upload from a user with no editor access", async () => {
            await expectRefused(VISITOR, uploadFile);
        });

        it("refuses a custom entity upload from a user with no editor access", async () => {
            await expectRefused(VISITOR, uploadEntity);
        });

        it("lets a zone editor upload a file", async () => {
            await expectAccepted(ZONE_EDITOR, uploadFile);
            expect(entitiesExecute).toHaveBeenCalledOnce();
        });
    });
});
