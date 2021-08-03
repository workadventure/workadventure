import "jasmine";
import { getRessourceDescriptor } from "../../../src/Phaser/Entity/PlayerTexturesLoadingManager";

describe("getRessourceDescriptor()", () => {
    it(", if given a valid descriptor as parameter, should return it", () => {
        const desc = getRessourceDescriptor({ name: "name", img: "url" });
        expect(desc.name).toEqual("name");
        expect(desc.img).toEqual("url");
    });

    it(", if given a string as parameter, should search through hardcoded values", () => {
        const desc = getRessourceDescriptor("male1");
        expect(desc.name).toEqual("male1");
        expect(desc.img).toEqual("resources/characters/pipoya/Male 01-1.png");
    });

    it(", if given a string as parameter, should search through hardcoded values (bis)", () => {
        const desc = getRessourceDescriptor("color_2");
        expect(desc.name).toEqual("color_2");
        expect(desc.img).toEqual("resources/customisation/character_color/character_color1.png");
    });

    it(", if given a descriptor without url as parameter, should search through hardcoded values", () => {
        const desc = getRessourceDescriptor({ name: "male1", img: "" });
        expect(desc.name).toEqual("male1");
        expect(desc.img).toEqual("resources/characters/pipoya/Male 01-1.png");
    });
});
