import type { AreaDataProperty, EntityDataProperty } from "@workadventure/map-editor";
import { CustomFileService, uploadedFileName } from "../Services/CustomFileService";
import type { HookManager } from "./HookManager";
import type { MapStorageModuleInterface } from "./MapStorageModuleInterface";

/**
 * Deletes the file a property uploaded once it no longer uses it: the file was removed, replaced by
 * another one, or (for a sound) swapped for a URL.
 */
async function onPropertyChange<T extends AreaDataProperty | EntityDataProperty>(
    oldProperty: T,
    newProperty: T,
    hostname: string,
): Promise<T> {
    if (!newProperty) {
        return oldProperty;
    }
    const oldFileName = uploadedFileName(oldProperty);
    if (oldFileName && uploadedFileName(newProperty) !== oldFileName) {
        await new CustomFileService(hostname).deleteFile(oldProperty);
    }
    return newProperty;
}

async function onPropertyDelete<T extends AreaDataProperty | EntityDataProperty>(
    property: T,
    hostname: string,
): Promise<T> {
    if (uploadedFileName(property)) {
        try {
            await new CustomFileService(hostname).deleteFile(property);
        } catch (error) {
            console.error("Error deleting file", error);
        }
    }
    return property;
}

export class FileModule implements MapStorageModuleInterface {
    public init(hookManager: HookManager): void {
        hookManager.subscribeAreaPropertyChange((area, oldProperty, newProperty, hostname) =>
            onPropertyChange(oldProperty, newProperty, hostname),
        );
        hookManager.subscribeAreaPropertyDelete((area, property, hostname) => onPropertyDelete(property, hostname));
        hookManager.subscribeEntityPropertyChange((entity, oldProperty, newProperty, hostname) =>
            onPropertyChange(oldProperty, newProperty, hostname),
        );
        hookManager.subscribeEntityPropertyDelete((entity, property, hostname) => onPropertyDelete(property, hostname));
    }
}
