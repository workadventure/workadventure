import { AreaDataProperty } from "@workadventure/map-editor";
import { _axios } from "../Services/axiosInstance";
import { HookManager } from "./HookManager";
import { MapStorageModuleInterface } from "./MapStorageModuleInterface";

export class ResourceUrlModule implements MapStorageModuleInterface {
    public init(hookManager: HookManager): void {
        hookManager.subscribeAreaPropertyChange(async (area, oldProperty, newProperty) => {
            if (!newProperty) {
                return oldProperty;
            }
            const resourceUrl = newProperty.resourceUrl;

            if (!resourceUrl) {
                return newProperty;
            }

            if (newProperty.serverData) {
                newProperty.serverData = undefined;
            }

            const response = await _axios.patch(resourceUrl, newProperty);
            if (!response.data) {
                return Promise.resolve(newProperty);
            }

            const isAreaDataProperty = AreaDataProperty.safeParse(response.data);

            if (!isAreaDataProperty.success) {
                return Promise.resolve(newProperty);
            }

            return Promise.resolve(isAreaDataProperty.data);
        });

        hookManager.subscribeAreaPropertyDelete(async (area, oldProperty) => {
            const resourceUrl = oldProperty.resourceUrl;

            if (!resourceUrl) {
                return oldProperty;
            }
            await _axios.delete(resourceUrl, { data: oldProperty });

            // What to return here?
            // The property is deleted, so we can return undefined or null
            return Promise.resolve(oldProperty);
        });

        hookManager.subscribeAreaPropertyAdd(async (area, oldProperty) => {
            const resourceUrl = oldProperty.resourceUrl;

            if (!resourceUrl) {
                return oldProperty;
            }

            if (oldProperty.serverData) {
                oldProperty.serverData = undefined;
            }

            const response = await _axios.post(resourceUrl, oldProperty);
            if (!response.data) {
                return Promise.resolve(oldProperty);
            }

            const isAreaDataProperty = AreaDataProperty.safeParse(response.data);

            if (!isAreaDataProperty.success) {
                return Promise.resolve(oldProperty);
            }

            return Promise.resolve(isAreaDataProperty.data);
        });
    }
}
