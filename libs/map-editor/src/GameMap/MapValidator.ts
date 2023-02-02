import { ITiledMap } from "@workadventure/tiled-map-type-guard";
import { z } from "zod";
import path from "node:path";
import { EntityData } from "../types";

export type Success<T> = { ok: true; value: T };
export type Failure<E> = { ok: false; error: E };
export type Result<T, E> = Success<T> | Failure<E>;
export type MapValidation = Result<ITiledMap, ValidationError[]>;

export type ErrorType = "error" | "warning" | "info";
export interface ValidationError {
    type: ErrorType;
    message: string;
    details: string;
    link?: string;
}

export class MapValidator {
    private logLevel: number;

    constructor(level: ErrorType) {
        this.logLevel = this.toLogNumber(level);
    }

    private toLogNumber(level: ErrorType): number {
        switch (level) {
            case "info": {
                return 2;
            }
            case "warning": {
                return 1;
            }
            case "error": {
                return 0;
            }
            default: {
                const _exhaustiveCheck: never = level;
                return -1;
            }
        }
    }

    public validateStringMap(data: string, mapPath: string, availableFiles: string[]): MapValidation {
        let map: unknown;
        try {
            map = JSON.parse(data);
        } catch (err) {
            if (err instanceof Error) {
                return {
                    ok: false,
                    error: [
                        {
                            type: "error",
                            message: "The provided map is not in a valid JSON format.",
                            details: "",
                        },
                    ],
                };
            }
            throw err;
        }
        return this.validateMap(map, mapPath, availableFiles);
    }

    /**
     * Check each parameter of the JSON file which can have an impact on the display of the map in play.
     * Each note of validation as the following attribute :
     * type : can have three value
     *       error : not validating this parameter will prevent the game from running
     *       warning : not validating this parameter will cause in-game problems but the game can run
     *       info : not validating this parameter has no influence on the game but we inform the admin that the map is not perfect
     * message : A concise and easily understandable text that indicate the parameter that failed validation
     * details : A text that give details on why the parameter failed the validation
     * link : A link on the documentation that indicate the rules to follow to have a valid parameter
     */
    public validateMap(data: unknown, mapPath: string, availableFiles: string[]): MapValidation {
        // Let's start by a check on "infinite maps" because the Zod validator does not validate infinite maps.
        const isInfiniteMap = z.object({
            infinite: z.literal(true),
        });

        if (isInfiniteMap.safeParse(data).success) {
            return {
                ok: false,
                error: [
                    {
                        type: "error",
                        message: "Infinite map size is not supported. Please use a fixed map size.",
                        details: "",
                    },
                ],
            };
        }

        const parsedMap = ITiledMap.safeParse(data);

        if (!parsedMap.success) {
            const error = parsedMap.error;

            const flattenerErrors = error.flatten((issue): string => {
                return `For field "${issue.path.join(".")}": ${issue.message}`;
            });

            return {
                ok: false,
                error: [
                    {
                        type: "error",
                        message: "Your map file contains an invalid JSON structure.",
                        details: Object.values(flattenerErrors.fieldErrors).join("\n"),
                    },
                ],
            };
        }

        const map = parsedMap.data;

        let errors: ValidationError[] = [];

        errors.push(...this.validateRootProperties(map));
        errors.push(...this.validateLayers(map, mapPath, availableFiles));
        errors.push(...this.validateTileset(map, mapPath, availableFiles));
        errors.push(...this.validateEntitiesProperty(map, mapPath, availableFiles));

        errors = errors.filter((error) => {
            const logLevel = this.toLogNumber(error.type);
            return this.logLevel >= logLevel;
        });

        if (errors.length > 0) {
            return {
                ok: false,
                error: errors,
            };
        }

        return {
            ok: true,
            value: map,
        };
    }

    private validateRootProperties(map: ITiledMap): ValidationError[] {
        const errors: ValidationError[] = [];

        //test of orientation value : orientation === orthogonal : ERRORS
        if (!(map.orientation === "orthogonal")) {
            errors.push({
                type: "error",
                message: "The orientation of your map must be orthogonal.",
                details: "",
            });
        }
        //test of tileheight and tilewidth : Warnings
        if (!(map.tileheight === 32 && map.tilewidth === 32)) {
            errors.push({
                type: "warning",
                message: "The tiles on your map are not the same size as the characters.",
                details: `Your tiles are ${map.tileheight ?? "undefined"}x${
                    map.tilewidth ?? "undefined"
                } pixels wide, but characters in WorkAdventure are 32x32 pixels. The characters will appear larger or smaller than your tiles. We recommend using tiles of 32x32 pixels.`,
            });
        }

        return errors;
    }

    private validateLayers(map: ITiledMap, mapPath: string, availableFiles: string[]): ValidationError[] {
        const errors: ValidationError[] = [];

        //test of floorLayer existence : ERRORS
        if (!map.layers.find((layer) => layer.name === "floorLayer" && layer.type === "objectgroup")) {
            errors.push({
                type: "error",
                message: 'Your map must have a layer named "floorLayer" of type "Object Layer".',
                details: "",
                link: "https://workadventu.re/map-building/wa-maps.md#workadventure-maps-rules",
            });
        }
        //test of start layer existence : Warnings
        if (!map.layers.find((layer) => layer.name === "start")) {
            errors.push({
                type: "warning",
                message: 'Could not find a layer whose name is "start".',
                details:
                    'WorkAdventure uses this "start" layer as a starting position for incoming players. Without a "start" layer, players will appear in the middle of the map.',
                link: "https://workadventu.re/map-building/entry-exit#defining-a-default-entry-point",
            });
        }
        //test of layers properties : Warnings
        map.layers.forEach((layer) => {
            if (!(layer.properties == undefined)) {
                layer.properties.forEach((property) => {
                    //exitUrl property or openWebsite property or playAudio
                    switch (property.name) {
                        case "exitUrl":
                            if (property.type === "string") {
                                if (property.value === "") {
                                    errors.push({
                                        type: "warning",
                                        message: 'Property "exitUrl" of layer "' + layer.name + '" is empty.',
                                        details: "",
                                        link: "https://workadventu.re/map-building/entry-exit#defining-exits",
                                    });
                                }
                            } else {
                                errors.push({
                                    type: "warning",
                                    message:
                                        'The layer named "' +
                                        layer.name +
                                        ' has a property "' +
                                        property.name +
                                        '" of a different type than "string". The property "' +
                                        property.name +
                                        '" should be of type "string".',
                                    details: "",
                                    link: "https://workadventu.re/map-building/entry-exit#defining-exits",
                                });
                            }
                            break;
                        case "openWebsite":
                            if (property.type === "string") {
                                if (property.value === "") {
                                    errors.push({
                                        type: "warning",
                                        message: 'Property "openWebsite" of layer "' + layer.name + '" is empty.',
                                        details: "",
                                        link: "https://workadventu.re/map-building/special-zones#opening-a-website-when-walking-on-the-map",
                                    });
                                }
                            } else {
                                errors.push({
                                    type: "warning",
                                    message:
                                        'The layer named "' +
                                        layer.name +
                                        ' has a property "' +
                                        property.name +
                                        '" of a different type than "string". The property "' +
                                        property.name +
                                        '" should be of type "string".',
                                    details: "",
                                    link: "https://workadventu.re/map-building/special-zones#opening-a-website-when-walking-on-the-map",
                                });
                            }
                            break;
                        case "playAudio":
                            if (property.type === "string") {
                                if (!this.doesFileExist(property.value, mapPath, availableFiles)) {
                                    errors.push({
                                        type: "warning",
                                        message: `The layer named "${layer.name}" has a property "${
                                            property.name
                                        }" that has a wrong url: ${property.value ?? "undefined"}`,
                                        details: "",
                                        link: "https://workadventu.re/map-building/special-zones#playing-sounds",
                                    });
                                }
                            } else {
                                errors.push({
                                    type: "warning",
                                    message:
                                        'The layer named "' +
                                        layer.name +
                                        ' has a property "' +
                                        property.name +
                                        '" of a different type than "string". The property "' +
                                        property.name +
                                        '" should be of type "string".',
                                    details: "",
                                    link: "https://workadventu.re/map-building/special-zones#playing-sounds",
                                });
                            }
                            break;
                        case "exitInstance" || "exitSceneUrl":
                            errors.push({
                                type: "warning",
                                message:
                                    'The layer named "' +
                                    layer.name +
                                    '" has a property named "' +
                                    property.name +
                                    '". That property is no longer supported. The property named that you need to use is : "exitUrl".',
                                details: "",
                                link: "https://workadventu.re/map-building/entry-exit#defining-exits",
                            });
                            break;
                        case "playAudioLoop":
                            errors.push({
                                type: "warning",
                                message:
                                    'The layer named "' +
                                    layer.name +
                                    '" has a property named "' +
                                    property.name +
                                    '". That property is no longer supported. The property named that you need to use is : "audioLoop".',
                                details: "",
                                link: "https://workadventu.re/map-building/special-zones#playing-sounds",
                            });
                            break;
                    }
                });
            }
        });

        return errors;
    }

    private validateEntitiesProperty(map: ITiledMap, mapPath: string, availableFiles: string[]): ValidationError[] {
        const errors: ValidationError[] = [];

        const mapProperties = map.properties;
        if (!mapProperties) {
            return errors;
        }

        const entitiesProperty = mapProperties.find((property) => property.name === "entities");

        if (!entitiesProperty) {
            return errors;
        }

        const parsedEntitiesPropertyValue = z.array(EntityData).safeParse(entitiesProperty.value);

        if (!parsedEntitiesPropertyValue.success) {
            const error = parsedEntitiesPropertyValue.error;
            const flattenerErrors = error.flatten((issue): string => {
                return `For field "${issue.path.join(".")}": ${issue.message}`;
            });
            errors.push({
                type: "error",
                message: "Your map file contains invalid entities.",
                details: Object.values(flattenerErrors.fieldErrors).join("\n"),
            });
        }

        return errors;
    }

    private validateTileset(map: ITiledMap, mapPath: string, availableFiles: string[]): ValidationError[] {
        const errors: ValidationError[] = [];

        //test of embed tilseset : ERRORS
        const tilesetTsx: string[] = [];
        map.tilesets.forEach((tileset) => {
            if ("source" in tileset) {
                tilesetTsx.push(tileset.source);
                return;
            }
            //test of tileset image existence : ERRORS
            if (!this.doesFileExist(tileset.image, mapPath, availableFiles)) {
                errors.push({
                    type: "error",
                    message: `Image of the tileset "${tileset.name}": "${tileset.image}" is not loadable.`,
                    details: "",
                    link: "",
                });
            }
            //test of tileset image size : Warnings Firefox
            // No errors for this because we will optimize this anyway.
            /*if (tileset.imageheight > 4096 || tileset.imagewidth > 4096) {
                this.messageValidationMap.tileset.push({
                    type : 'warning',
                    message : 'Image of the tileset ' + tileset.name + ' is too high and/or wide to be displayed on Firefox.',
                    details : 'Tilesets size should be less than 4096x4096 px.',
                    HTMLlink : ''
                });
            }*/

            //test of properties != collides or == collides and false : Infos
            const tilesCollidesFalse: number[] = [];
            const tilesNotBool: number[] = [];
            const tilesUnknownProps: number[] = [];
            if (!(tileset.tiles == undefined)) {
                tileset.tiles.forEach((tile) => {
                    //if null or undefined
                    if (!(tile.properties == undefined)) {
                        tile.properties.forEach((properties) => {
                            if (properties.name === "collides") {
                                if (properties.type === "bool") {
                                    if (properties.value === false) {
                                        tilesCollidesFalse.push(tile.id);
                                    }
                                } else {
                                    tilesNotBool.push(tile.id);
                                }
                            } else {
                                tilesUnknownProps.push(tile.id);
                            }
                        });
                    }
                });
            }
            if (tilesCollidesFalse.length > 0) {
                errors.push({
                    type: "info",
                    message:
                        "The tileset named " +
                        tileset.name +
                        ' has tiles that have property "collides" set to false. This property will have no effect in the room.',
                    details: "The tiles concerned are : " + tilesCollidesFalse.join(", ") + ".",
                });
            }
            if (tilesNotBool.length > 0) {
                errors.push({
                    type: "info",
                    message:
                        "The tileset named " +
                        tileset.name +
                        ' has tiles that have property "collides" of a different type than "bool". The property "collides" should be of type bool.',
                    details: "The tiles concerned are : " + tilesNotBool.join(", ") + ".",
                });
            }
            if (tilesUnknownProps.length > 0) {
                errors.push({
                    type: "info",
                    message: "The tileset named " + tileset.name + " has tiles that have unknown property name.",
                    details: "The tiles concerned are : " + tilesUnknownProps.join(", ") + ".",
                });
            }
        });
        if (tilesetTsx.length > 0) {
            errors.push({
                type: "error",
                message:
                    "Tilesets in TSX/TSJ format are not supported. You must embed the tilesets in the map directly.",
                details: `We detected the following tileset(s): "${tilesetTsx.join('", "')}".`,
                link: "https://workadventu.re/map-building/wa-maps.md#workadventure-maps-rules",
            });
        }

        return errors;
    }

    /**
     * Validates that the passed string is valid JSON and that it passes the Zod validation of the map.
     * @returns true on success, false on failure
     */
    public doesStringLooksLikeMap(data: string): boolean {
        let map: unknown;
        try {
            map = JSON.parse(data);
        } catch (_exhaustiveCheck) {
            return false;
        }
        return ITiledMap.safeParse(map).success;
    }

    private doesFileExist(filePath: string | undefined, mapPath: string, availableFiles: string[]): boolean {
        if (filePath === undefined) {
            return false;
        }

        const resolvedPath = path.normalize(`${path.dirname(mapPath)}/${filePath}`);

        return availableFiles.includes(resolvedPath);
    }
}
