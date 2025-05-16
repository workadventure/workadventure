import { CustomFileService } from "../Services/CustomFileService";
import { HookManager } from "./HookManager";
import { MapStorageModuleInterface } from "./MapStorageModuleInterface";

export class FileModule implements MapStorageModuleInterface {
    public init(hookManager: HookManager): void {
        hookManager.subscribeAreaPropertyChange(async (area, oldProperty, newProperty, hostname) => {
            if (!newProperty) {
                return oldProperty;
            }

            if (newProperty.type !== "openPdf") {
                return newProperty;
            }

            const fileService = new CustomFileService(hostname);

            // If the newProperty link and name are empty, it means the property is not connected to a file
            // and we need to delete the file if it exists
            if (
                oldProperty.type == "openPdf" &&
                oldProperty.name &&
                oldProperty.link &&
                !newProperty.name &&
                !newProperty.link
            ) {
                await fileService.deleteFile(oldProperty);
            }

            return Promise.resolve(newProperty);
        });

        hookManager.subscribeAreaPropertyDelete(async (area, oldProperty, hostname) => {
            if (oldProperty.type !== "openPdf") {
                return oldProperty;
            }

            try {
                const fileService = new CustomFileService(hostname);
                await fileService.deleteFile(oldProperty);
            } catch (error) {
                console.error("Error deleting file", error);
                return oldProperty;
            }

            return Promise.resolve(oldProperty);
        });
    }
}
