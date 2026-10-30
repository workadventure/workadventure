import { describe, expect, it } from "vitest";
import type { AreaData, AreaDataProperties, AreaDataProperty } from "@workadventure/map-editor";
import { WamFile } from "@workadventure/map-editor";
import { HookManager } from "../../../Modules/HookManager";
import { CreateAreaMapStorageCommand } from "../CreateAreaMapStorageCommand";

const area = (properties: AreaDataProperties): AreaData => ({
    id: "copy",
    name: "",
    x: 0,
    y: 0,
    width: 32,
    height: 32,
    visible: true,
    properties,
});
const emptyWamFile = () =>
    new WamFile({ version: "1.0.0", mapUrl: "map", entities: {}, entityCollections: [], areas: [] });

describe("CreateAreaMapStorageCommand", () => {
    // Stands for a module that creates a resource for the property, like a chat room.
    const hookManager = new HookManager();
    hookManager.subscribeAreaPropertyAdd((_, property) =>
        Promise.resolve(
            property.id === "room" ? ({ ...property, serverData: { roomId: "new" } } as AreaDataProperty) : property,
        ),
    );

    it("stores what the add hooks returned, and tells when it differs from what the client sent", async () => {
        const wamFile = emptyWamFile();
        const command = new CreateAreaMapStorageCommand(
            wamFile,
            area([
                { id: "room", type: "silent" },
                { id: "other", type: "silent" },
            ]),
            undefined,
            hookManager,
            "world.test",
        );
        await command.execute();
        expect(command.propertiesChangedByHooks).toBe(true);
        expect(wamFile.getGameMapAreas().getArea("copy")?.properties).toEqual([
            { id: "room", type: "silent", serverData: { roomId: "new" } },
            { id: "other", type: "silent" },
        ]);
    });

    it("tells nothing changed when the hooks returned the properties as sent", async () => {
        const command = new CreateAreaMapStorageCommand(
            emptyWamFile(),
            area([{ id: "other", type: "silent" }]),
            undefined,
            hookManager,
            "world.test",
        );
        await command.execute();
        expect(command.propertiesChangedByHooks).toBe(false);
    });
});
