import type { AreaData, AreaDataProperty, AtLeast, EntityDataProperty, WAMEntityData } from "@workadventure/map-editor";

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

type EntityDataPropertyChangeCallback = (
    entity: Partial<WAMEntityData>,
    oldProperty: EntityDataProperty,
    newProperty: EntityDataProperty,
    hostname: string
) => Promise<EntityDataProperty>;
type EntityDataPropertyDeleteCallback = (
    entity: Partial<WAMEntityData>,
    property: EntityDataProperty,
    hostname: string
) => Promise<EntityDataProperty>;
type EntityDataPropertyAddCallback = (
    entity: Partial<WAMEntityData>,
    property: EntityDataProperty,
    hostname: string
) => Promise<EntityDataProperty>;

export class HookManager {
    private areaPropertyChangeCallbacks: AreaDataPropertyChangeCallback[] = [];
    private areaPropertyDeleteCallbacks: AreaDataPropertyDeleteCallback[] = [];
    private areaPropertyAddCallbacks: AreaDataPropertyAddCallback[] = [];
    private entityPropertyChangeCallbacks: EntityDataPropertyChangeCallback[] = [];
    private entityPropertyDeleteCallbacks: EntityDataPropertyDeleteCallback[] = [];
    private entityPropertyAddCallbacks: EntityDataPropertyAddCallback[] = [];

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
    public subscribeEntityPropertyChange(callback: EntityDataPropertyChangeCallback): void {
        this.entityPropertyChangeCallbacks.push(callback);
    }

    // TODO : hostname could be passed another way to the callback
    // it is only used in the file module
    public async fireEntityPropertyChange(
        entity: Partial<WAMEntityData>,
        oldProperty: EntityDataProperty,
        newProperty: EntityDataProperty,
        hostname: string
    ): Promise<void> {
        for (const callback of this.entityPropertyChangeCallbacks) {
            // eslint-disable-next-line no-await-in-loop
            const updatedProperty = await callback(entity, oldProperty, newProperty, hostname);

            entity.properties = entity.properties?.map((property) => {
                if (property.id !== updatedProperty.id) {
                    return property;
                }

                return updatedProperty;
            });

            newProperty = updatedProperty;
        }
    }

    public subscribeEntityPropertyDelete(callback: EntityDataPropertyDeleteCallback): void {
        this.entityPropertyDeleteCallbacks.push(callback);
    }

    public async fireEntityPropertyDelete(
        entity: Partial<WAMEntityData>,
        property: EntityDataProperty,
        hostname: string
    ): Promise<void> {
        for (const callback of this.entityPropertyDeleteCallbacks) {
            // eslint-disable-next-line no-await-in-loop
            const updatedProperty = await callback(entity, property, hostname);

            entity.properties = entity.properties?.filter((entityProperty) => entityProperty.id !== updatedProperty.id);
        }
    }

    public subscribeEntityPropertyAdd(callback: EntityDataPropertyAddCallback): void {
        this.entityPropertyAddCallbacks.push(callback);
    }

    public async fireEntityPropertyAdd(
        entity: Partial<WAMEntityData>,
        property: EntityDataProperty,
        hostname: string
    ): Promise<void> {
        for (const callback of this.entityPropertyAddCallbacks) {
            // eslint-disable-next-line no-await-in-loop
            const updatedProperty = await callback(entity, property, hostname);

            entity.properties = entity.properties?.map((property) => {
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
