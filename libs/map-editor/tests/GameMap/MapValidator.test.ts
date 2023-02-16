import { describe, expect, it } from "@jest/globals";
import { ErrorType, isFailure, MapValidation, MapValidator } from "../../src/GameMap/MapValidator";
import * as fs from "fs";
import path from "node:path";

function loadMap(mapPath: string, logLevel: ErrorType = "info"): MapValidation {
    const mapValidator = new MapValidator(logLevel);
    const file = fs.readFileSync(mapPath);
    const files = fs.readdirSync(path.dirname(mapPath)).map((dir) => path.resolve(path.dirname(mapPath), dir));

    return mapValidator.validateStringMap(file.toString(), mapPath, files);
}

describe("Map validator", () => {
    it("should fail on not parsable JSON", () => {
        const mapValidator = new MapValidator("warning");

        const result = mapValidator.validateStringMap("not valid JSON", "map.json", ["map.json"]);

        expect(result.ok).toBe(false);

        if (!isFailure(result)) {
            throw new Error("Not an error");
        }

        const errors = result.error;
        expect(errors.map).toBeDefined();

        if (!errors.map) {
            throw new Error("Not existing map on errors");
        }

        expect(errors.map[0].message).toBe("The provided map is not in a valid JSON format.");
        expect(errors.map[0].type).toBe("error");
    });

    it("should fail on invalid JSON", () => {
        const mapValidator = new MapValidator("error");

        const result = mapValidator.validateMap({ foo: "bar" }, "map.json", ["map.json"]);

        expect(result.ok).toBe(false);

        if (!isFailure(result)) {
            throw new Error("Not an error");
        }

        const errors = result.error;
        expect(errors.map).toBeDefined();

        if (!errors.map) {
            throw new Error("Not existing map on errors");
        }

        expect(errors.map[0].message).toBe("Your map file contains an invalid JSON structure.");
        expect(errors.map[0].type).toBe("error");
        expect(errors.map[0].details).toContain('For field "type": Invalid literal value, expected "map"');
    });

    it("should detect none orthogonal maps", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/orientation.json");

        expect(result.ok).toBe(false);

        if (!isFailure(result)) {
            throw new Error("Not an error");
        }

        const errors = result.error;
        expect(errors.map).toBeDefined();

        if (!errors.map) {
            throw new Error("Not existing map on errors");
        }

        expect(errors.map[0].message).toBe("The orientation of your map must be orthogonal.");
        expect(errors.map[0].type).toBe("error");
    });

    it("should detect invalid entities map property type", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/invalidEntitiesPropertyType.json");

        expect(result.ok).toBe(false);

        if (!isFailure(result)) {
            throw new Error("Not an error");
        }

        const errors = result.error;
        expect(errors.map).toBeDefined();

        if (!errors.map) {
            throw new Error("Not existing map on errors");
        }

        expect(errors.map[0].message).toBe("Your map file contains an invalid JSON structure.");
        expect(errors.map[0].type).toBe("error");
        expect(errors.map[0].details).toBe('For field "properties.0": Invalid input');
    });

    it("should detect invalid entities", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/invalidEntities.json");

        expect(result.ok).toBe(false);

        if (!isFailure(result)) {
            throw new Error("Not an error");
        }

        const errors = result.error;
        expect(errors.entities).toBeDefined();

        if (!errors.entities) {
            throw new Error("Not existing entities on errors");
        }

        expect(errors.entities[0].message).toBe("Your map file contains invalid entities.");
        expect(errors.entities[0].type).toBe("error");
    });

    it("should not be infinite", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/Infini.json");

        expect(result.ok).toBe(false);

        if (!isFailure(result)) {
            throw new Error("Not an error");
        }

        const errors = result.error;
        expect(errors.map).toBeDefined();

        if (!errors.map) {
            throw new Error("Not existing map on errors");
        }

        expect(errors.map[0].message).toBe("Infinite map size is not supported. Please use a fixed map size.");
        expect(errors.map[0].type).toBe("error");
    });

    it("should warn on != 32x32 tiles", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/tileheight.json");

        expect(result.ok).toBe(false);

        if (!isFailure(result)) {
            throw new Error("Not an error");
        }

        const errors = result.error;
        expect(errors.map).toBeDefined();

        if (!errors.map) {
            throw new Error("Not existing map on errors");
        }

        expect(errors.map[0].message).toBe("The tiles on your map are not the same size as the characters.");
        expect(errors.map[0].details).toBe(
            "Your tiles are 16x16 pixels wide, but characters in WorkAdventure are 32x32 pixels. The characters will appear larger or smaller than your tiles. We recommend using tiles of 32x32 pixels."
        );
        expect(errors.map[0].type).toBe("warning");
    });

    it("should detect missing floorLayer", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/floorLayer.json");

        expect(result.ok).toBe(false);

        if (!isFailure(result)) {
            throw new Error("Not an error");
        }

        const errors = result.error;
        expect(errors.layers).toBeDefined();

        if (!errors.layers) {
            throw new Error("Not existing layers on errors");
        }

        expect(errors.layers[0].message).toBe('Your map must have a layer named "floorLayer" of type "Object Layer".');
        expect(errors.layers[0].type).toBe("error");
    });

    it("should detect missing start layer", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/start.json");

        expect(result.ok).toBe(false);

        if (!isFailure(result)) {
            throw new Error("Not an error");
        }

        const errors = result.error;
        expect(errors.layers).toBeDefined();

        if (!errors.layers) {
            throw new Error("Not existing layers on errors");
        }

        expect(errors.layers[0].message).toBe('Could not find a layer whose name is "start".');
        expect(errors.layers[0].details).toBe(
            'WorkAdventure uses this "start" layer as a starting position for incoming players. Without a "start" layer, players will appear in the middle of the map.'
        );
        expect(errors.layers[0].type).toBe("warning");
    });

    it("should detect issues in layer properties", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/layerProperties.json");

        expect(result.ok).toBe(false);

        if (!isFailure(result)) {
            throw new Error("Not an error");
        }

        const errors = result.error;
        expect(errors.layers).toBeDefined();

        if (!errors.layers) {
            throw new Error("Not existing layers on errors");
        }

        if (!errors.tilesets) {
            throw new Error("Not existing tilesets on errors");
        }

        expect(errors.layers.length).toBe(5);
        expect(errors.tilesets.length).toBe(1);

        expect(errors.layers[0].message).toBe('Property "openWebsite" of layer "Website" is empty.');
        expect(errors.layers[0].type).toBe("warning");

        expect(errors.layers[1].message).toBe(
            'The layer named "Audio" has a property "playAudio" that has a wrong url: testAudio'
        );
        expect(errors.layers[1].type).toBe("warning");

        expect(errors.layers[2].message).toBe('Property "exitUrl" of layer "exit" is empty.');
        expect(errors.layers[2].type).toBe("warning");

        expect(errors.layers[3].message).toBe(
            'The layer named "update" has a property named "exitInstance". That property is no longer supported. The property named that you need to use is : "exitUrl".'
        );
        expect(errors.layers[3].type).toBe("warning");

        expect(errors.layers[4].message).toBe(
            'The layer named "update" has a property named "playAudioLoop". That property is no longer supported. The property named that you need to use is : "audioLoop".'
        );
        expect(errors.layers[4].type).toBe("warning");

        expect(errors.tilesets[0].message).toBe(
            'The tileset named Dungeon has tiles that have property "collides" set to false. This property will have no effect in the room.'
        );
        expect(errors.tilesets[0].details).toContain("The tiles concerned are");
        expect(errors.tilesets[0].type).toBe("info");
    });

    it("should detect false collides", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/CollidesFalse.json");

        expect(result.ok).toBe(false);

        if (!isFailure(result)) {
            throw new Error("Not an error");
        }

        const errors = result.error;
        expect(errors.tilesets).toBeDefined();

        if (!errors.tilesets) {
            throw new Error("Not existing layers on errors");
        }

        expect(errors.tilesets[0].message).toBe(
            'The tileset named dungeon has tiles that have property "collides" set to false. This property will have no effect in the room.'
        );
        expect(errors.tilesets[0].details).toContain("The tiles concerned are");
        expect(errors.tilesets[0].type).toBe("info");
    });

    it("should not output 'info' logs if minimum level is 'warn'", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/CollidesFalse.json", "warning");

        expect(result.ok).toBe(true);
    });

    it("should detect no collides", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/NoCollides.json");

        expect(result.ok).toBe(false);

        if (!isFailure(result)) {
            throw new Error("Not an error");
        }

        const errors = result.error;
        expect(errors.tilesets).toBeDefined();

        if (!errors.tilesets) {
            throw new Error("Not existing tilesets on errors");
        }

        expect(errors.tilesets[0].message).toBe("The tileset named dungeon has tiles that have unknown property name.");
        expect(errors.tilesets[0].type).toBe("info");
    });

    it("should detect no image", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/NoImage.json");

        expect(result.ok).toBe(false);

        if (!isFailure(result)) {
            throw new Error("Not an error");
        }

        const errors = result.error;
        expect(errors.tilesets).toBeDefined();

        if (!errors.tilesets) {
            throw new Error("Not existing tilesets on errors");
        }

        expect(errors.tilesets[0].message).toBe(
            'Image of the tileset "Yellow Dungeon Tileset": "Yellow Dungeon Tileset.png" is not loadable.'
        );
        expect(errors.tilesets[0].type).toBe("error");
    });

    it("should detect not embedded tilesets", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/embarquer.json");

        expect(result.ok).toBe(false);

        if (!isFailure(result)) {
            throw new Error("Not an error");
        }

        const errors = result.error;
        expect(errors.tilesets).toBeDefined();

        if (!errors.tilesets) {
            throw new Error("Not existing tilesets on errors");
        }

        expect(errors.tilesets[0].message).toBe(
            "Tilesets in TSX/TSJ format are not supported. You must embed the tilesets in the map directly."
        );
        expect(errors.tilesets[0].details).toBe('We detected the following tileset(s): "dungeon.tsx".');
        expect(errors.tilesets[0].type).toBe("error");
    });

    it("validates a map", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/simplicity.json");

        expect(result.ok).toBe(true);
    });

    it("knows if a string looks like a map", () => {
        const mapValidator = new MapValidator("info");
        const file = fs.readFileSync(__dirname + "/../../../../maps/tests/Validation/simplicity.json");

        expect(mapValidator.doesStringLooksLikeMap(file.toString())).toBe(true);

        expect(mapValidator.doesStringLooksLikeMap("foobar")).toBe(false);
    });
});
