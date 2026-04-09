import { AreaDataProperty } from "@workadventure/map-editor";
import { fetchResourceUrl, readOptionalJson } from "../Services/resourceUrlFetch";
import type { HookManager } from "./HookManager";
import type { MapStorageModuleInterface } from "./MapStorageModuleInterface";

export class ResourceUrlModule implements MapStorageModuleInterface {
    private readonly hookTimeoutMs = 15000;

    public init(hookManager: HookManager): void {
        hookManager.subscribeAreaPropertyChange(async (area, oldProperty, newProperty) => {
            if (!newProperty) {
                return oldProperty;
            }
            const resourceUrl = newProperty.resourceUrl;

            if (!resourceUrl) {
                return newProperty;
            }

            const response = await fetchResourceUrl(resourceUrl, {
                method: "PATCH",
                signal: AbortSignal.timeout(this.hookTimeoutMs),
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newProperty),
            });
            const data = await readOptionalJson(response);
            if (!data) {
                return Promise.resolve(newProperty);
            }

            const isAreaDataProperty = AreaDataProperty.safeParse(data);

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
            await fetchResourceUrl(resourceUrl, {
                method: "DELETE",
                signal: AbortSignal.timeout(this.hookTimeoutMs),
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(oldProperty),
            });

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

            const response = await fetchResourceUrl(resourceUrl, {
                method: "POST",
                signal: AbortSignal.timeout(this.hookTimeoutMs),
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(oldProperty),
            });
            const data = await readOptionalJson(response);
            if (!data) {
                return Promise.resolve(oldProperty);
            }

            const isAreaDataProperty = AreaDataProperty.safeParse(data);

            if (!isAreaDataProperty.success) {
                return Promise.resolve(oldProperty);
            }

            return Promise.resolve(isAreaDataProperty.data);
        });
    }
}
