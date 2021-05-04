import "jasmine";
import {HdpiManager} from "../../../src/Phaser/Services/HdpiManager";

describe("Test HdpiManager", () => {
    it("should match screen size if size is too small.", () => {
        const hdpiManager = new HdpiManager(640*480);

        const result = hdpiManager.getOptimalGameSize({ width: 320, height: 200 });
        expect(result.game.width).toEqual(320);
        expect(result.game.height).toEqual(200);
        expect(result.real.width).toEqual(320);
        expect(result.real.height).toEqual(200);
    });

    it("should match multiple just above.", () => {
        const hdpiManager = new HdpiManager(640*480);

        let result = hdpiManager.getOptimalGameSize({ width: 960, height: 600 });
        expect(result.game.width).toEqual(960);
        expect(result.game.height).toEqual(600);

        result = hdpiManager.getOptimalGameSize({ width: 640 * 2 + 50, height: 480 * 2 + 50 });
        expect(result.game.width).toEqual(Math.ceil((640 * 2 + 50) / 2));
        expect(result.game.height).toEqual((480 * 2 + 50) / 2);

        result = hdpiManager.getOptimalGameSize({ width: 640 * 3 + 50, height: 480 * 3 + 50 });
        expect(result.game.width).toEqual(Math.ceil((640 * 3 + 50) / 3));
        expect(result.game.height).toEqual(Math.ceil((480 * 3 + 50) / 3));
        expect(result.real.width).toEqual(result.game.width * 3);
        expect(result.real.height).toEqual(result.game.height * 3);
    });
});
