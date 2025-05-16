import { AreaData, AreaDataProperty, AtLeast } from "@workadventure/map-editor";

type AreaDataPropertyChangeCallback = (
    area: AtLeast<AreaData, "id">,
    oldProperty: AreaDataProperty,
    newProperty: AreaDataProperty,
    hostname: string
) => Promise<AreaDataProperty>;
type AreaDataPropertyDeleteCallback = (
    area: AtLeast<AreaData, "id">,
    property: AreaDataProperty,
    hostname: string
) => Promise<AreaDataProperty>;
type AreaDataPropertyAddCallback = (
    area: AtLeast<AreaData, "id">,
    property: AreaDataProperty,
    hostname: string
) => Promise<AreaDataProperty>;

export class HookManager {
    private areaPropertyChangeCallbacks: AreaDataPropertyChangeCallback[] = [];
    private areaPropertyDeleteCallbacks: AreaDataPropertyDeleteCallback[] = [];
    private areaPropertyAddCallbacks: AreaDataPropertyAddCallback[] = [];

    constructor() {}

    public subscribeAreaPropertyChange(callback: AreaDataPropertyChangeCallback): void {
        this.areaPropertyChangeCallbacks.push(callback);
    }

    // TODO : hostname could be passed another way to the callback
    // it is only used in the file module
    public async fireAreaPropertyChange(
        area: AtLeast<AreaData, "id">,
        oldProperty: AreaDataProperty,
        newProperty: AreaDataProperty,
        hostname: string
    ): Promise<void> {
        for (const callback of this.areaPropertyChangeCallbacks) {
            // eslint-disable-next-line no-await-in-loop
            const updatedProperty = await callback(area, oldProperty, newProperty, hostname);

            area.properties = area.properties?.map((property) => {
                if (property.id !== updatedProperty.id) {
                    return property;
                }

                return updatedProperty;
            });

            newProperty = updatedProperty;
        }
    }

    public subscribeAreaPropertyDelete(callback: AreaDataPropertyDeleteCallback): void {
        this.areaPropertyDeleteCallbacks.push(callback);
    }

    public async fireAreaPropertyDelete(
        area: AtLeast<AreaData, "id">,
        property: AreaDataProperty,
        hostname: string
    ): Promise<void> {
        for (const callback of this.areaPropertyDeleteCallbacks) {
            // eslint-disable-next-line no-await-in-loop
            const updatedProperty = await callback(area, property, hostname);

            area.properties = area.properties?.filter((areaProperty) => areaProperty.id !== updatedProperty.id);
        }
    }

    public subscribeAreaPropertyAdd(callback: AreaDataPropertyAddCallback): void {
        this.areaPropertyAddCallbacks.push(callback);
    }

    public async fireAreaPropertyAdd(
        area: AtLeast<AreaData, "id">,
        property: AreaDataProperty,
        hostname: string
    ): Promise<void> {
        for (const callback of this.areaPropertyAddCallbacks) {
            // eslint-disable-next-line no-await-in-loop
            const updatedProperty = await callback(area, property, hostname);

            area.properties = area.properties?.map((property) => {
                if (property.id !== updatedProperty.id) {
                    return property;
                }

                return updatedProperty;
            });

            property = updatedProperty;
        }
    }
}

export const hookManager = new HookManager();
