import { describe, expect, it } from "@jest/globals";
import { ErrorType, Failure, MapValidation, MapValidator, ValidationError } from "../../src/GameMap/MapValidator";
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
        const errors = (result as Failure<ValidationError[]>).error;
        expect(errors.length).toBe(1);
        expect(errors[0].message).toBe("The provided map is not in a valid JSON format.");
        expect(errors[0].type).toBe("error");
    });

    it("should fail on invalid JSON", () => {
        const mapValidator = new MapValidator("error");

        const result = mapValidator.validateMap({ foo: "bar" }, "map.json", ["map.json"]);

        expect(result.ok).toBe(false);
        const errors = (result as Failure<ValidationError[]>).error;
        expect(errors.length).toBe(1);
        expect(errors[0].message).toBe("Your map file contains an invalid JSON structure.");
        expect(errors[0].type).toBe("error");
        expect(errors[0].details).toContain('For field "type": Invalid literal value, expected "map"');
    });

    it("should detect none orthogonal maps", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/orientation.json");

        expect(result.ok).toBe(false);
        const errors = (result as Failure<ValidationError[]>).error;
        expect(errors.length).toBe(1);
        expect(errors[0].message).toBe("The orientation of your map must be orthogonal.");
        expect(errors[0].type).toBe("error");
    });

    it("should detect invalid entities map property type", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/invalidEntitiesPropertyType.json");

        expect(result.ok).toBe(false);
        const errors = (result as Failure<ValidationError[]>).error;
        expect(errors.length).toBe(1);
        expect(errors[0].message).toBe("Your map file contains an invalid JSON structure.");
        expect(errors[0].type).toBe("error");
        expect(errors[0].details).toBe('For field "properties.0": Invalid input');
    });

    it("should detect invalid entities", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/invalidEntities.json");

        expect(result.ok).toBe(false);
        const errors = (result as Failure<ValidationError[]>).error;
        expect(errors.length).toBe(1);
        expect(errors[0].message).toBe("Your map file contains invalid entities.");
        expect(errors[0].type).toBe("error");
    });

    it("should not be infinite", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/Infini.json");

        expect(result.ok).toBe(false);
        const errors = (result as Failure<ValidationError[]>).error;

        expect(errors.length).toBe(1);
        expect(errors[0].message).toBe("Infinite map size is not supported. Please use a fixed map size.");
        expect(errors[0].type).toBe("error");
    });

    it("should warn on != 32x32 tiles", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/tileheight.json");

        expect(result.ok).toBe(false);
        const errors = (result as Failure<ValidationError[]>).error;

        expect(errors.length).toBe(1);
        expect(errors[0].message).toBe("The tiles on your map are not the same size as the characters.");
        expect(errors[0].details).toBe(
            "Your tiles are 16x16 pixels wide, but characters in WorkAdventure are 32x32 pixels. The characters will appear larger or smaller than your tiles. We recommend using tiles of 32x32 pixels."
        );
        expect(errors[0].type).toBe("warning");
    });

    it("should detect missing floorLayer", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/floorLayer.json");

        expect(result.ok).toBe(false);
        const errors = (result as Failure<ValidationError[]>).error;

        expect(errors.length).toBe(1);
        expect(errors[0].message).toBe('Your map must have a layer named "floorLayer" of type "Object Layer".');
        expect(errors[0].type).toBe("error");
    });

    it("should detect missing start layer", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/start.json");

        expect(result.ok).toBe(false);
        const errors = (result as Failure<ValidationError[]>).error;

        expect(errors.length).toBe(1);
        expect(errors[0].message).toBe('Could not find a layer whose name is "start".');
        expect(errors[0].details).toBe(
            'WorkAdventure uses this "start" layer as a starting position for incoming players. Without a "start" layer, players will appear in the middle of the map.'
        );
        expect(errors[0].type).toBe("warning");
    });

    it("should detect issues in layer properties", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/layerProperties.json");

        expect(result.ok).toBe(false);
        const errors = (result as Failure<ValidationError[]>).error;

        expect(errors.length).toBe(6);

        expect(errors[0].message).toBe('Property "openWebsite" of layer "Website" is empty.');
        expect(errors[0].type).toBe("warning");

        expect(errors[1].message).toBe(
            'The layer named "Audio" has a property "playAudio" that has a wrong url: testAudio'
        );
        expect(errors[1].type).toBe("warning");

        expect(errors[2].message).toBe('Property "exitUrl" of layer "exit" is empty.');
        expect(errors[2].type).toBe("warning");

        expect(errors[3].message).toBe(
            'The layer named "update" has a property named "exitInstance". That property is no longer supported. The property named that you need to use is : "exitUrl".'
        );
        expect(errors[3].type).toBe("warning");

        expect(errors[4].message).toBe(
            'The layer named "update" has a property named "playAudioLoop". That property is no longer supported. The property named that you need to use is : "audioLoop".'
        );
        expect(errors[4].type).toBe("warning");

        expect(errors[5].message).toBe(
            'The tileset named Dungeon has tiles that have property "collides" set to false. This property will have no effect in the room.'
        );
        expect(errors[5].details).toContain("The tiles concerned are");
        expect(errors[5].type).toBe("info");
    });

    it("should detect false collides", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/CollidesFalse.json");

        expect(result.ok).toBe(false);
        const errors = (result as Failure<ValidationError[]>).error;

        expect(errors.length).toBe(1);

        expect(errors[0].message).toBe(
            'The tileset named dungeon has tiles that have property "collides" set to false. This property will have no effect in the room.'
        );
        expect(errors[0].details).toContain("The tiles concerned are");
        expect(errors[0].type).toBe("info");
    });

    it("should not output 'info' logs if minimum level is 'warn'", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/CollidesFalse.json", "warning");

        expect(result.ok).toBe(true);
    });

    it("should detect no collides", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/NoCollides.json");

        expect(result.ok).toBe(false);
        const errors = (result as Failure<ValidationError[]>).error;

        expect(errors.length).toBe(1);

        expect(errors[0].message).toBe("The tileset named dungeon has tiles that have unknown property name.");
        expect(errors[0].type).toBe("info");
    });

    it("should detect no image", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/NoImage.json");

        expect(result.ok).toBe(false);
        const errors = (result as Failure<ValidationError[]>).error;

        expect(errors.length).toBe(1);

        expect(errors[0].message).toBe(
            'Image of the tileset "Yellow Dungeon Tileset": "Yellow Dungeon Tileset.png" is not loadable.'
        );
        expect(errors[0].type).toBe("error");
    });

    it("should detect not embedded tilesets", () => {
        const result = loadMap(__dirname + "/../../../../maps/tests/Validation/embarquer.json");

        expect(result.ok).toBe(false);
        const errors = (result as Failure<ValidationError[]>).error;

        expect(errors.length).toBe(1);

        expect(errors[0].message).toBe(
            "Tilesets in TSX/TSJ format are not supported. You must embed the tilesets in the map directly."
        );
        expect(errors[0].details).toBe('We detected the following tileset(s): "dungeon.tsx".');
        expect(errors[0].type).toBe("error");
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
