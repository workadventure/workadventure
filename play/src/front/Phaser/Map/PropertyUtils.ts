import type { ITiledMapProperty, Json } from "@workadventure/tiled-map-type-guard";

export class PropertyUtils {
    public static findProperty(name: string, properties: ITiledMapProperty[] | undefined): Json | undefined {
        return properties?.find((property) => property.name === name)?.value;
    }

    public static findBooleanProperty(
        name: string,
        properties: ITiledMapProperty[] | undefined,
        context?: string
    ): boolean | undefined {
        const property = PropertyUtils.findProperty(name, properties);
        if (property === undefined) {
            return undefined;
        }
        if (typeof property !== "boolean") {
            throw new Error(
                'Expected property "' + name + '" to be a boolean. ' + (context ? " (" + context + ")" : "")
            );
        }
        return property;
    }

    public static findStringProperty(
        name: string,
        properties: ITiledMapProperty[] | undefined,
        context?: string
    ): string | undefined {
        const property = PropertyUtils.findProperty(name, properties);
        if (property === undefined) {
            return undefined;
        }
        if (typeof property !== "string") {
            throw new Error(
                'Expected property "' + name + '" to be a string. ' + (context ? " (" + context + ")" : "")
            );
        }
        return property;
    }

    public static mustFindProperty(
        name: string,
        properties: ITiledMapProperty[] | undefined,
        context?: string
    ): Exclude<Json, null> {
        const property = PropertyUtils.findProperty(name, properties);
        if (property === undefined || property === null) {
            throw new Error('Could not find property "' + name + '"' + (context ? " (" + context + ")" : ""));
        }
        return property;
    }

    public static mustFindStringProperty(
        name: string,
        properties: ITiledMapProperty[] | undefined,
        context?: string
    ): string {
        const property = PropertyUtils.mustFindProperty(name, properties, context);
        if (typeof property !== "string") {
            throw new Error(
                'Expected property "' + name + '" to be a string. ' + (context ? " (" + context + ")" : "")
            );
        }
        return property;
    }
}
