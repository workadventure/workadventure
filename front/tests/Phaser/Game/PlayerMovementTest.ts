import "jasmine";
import {PlayerMovement} from "../../../src/Phaser/Game/PlayerMovement";

describe("Interpolation / Extrapolation", () => {
    it("should interpolate", () => {
        const playerMovement = new PlayerMovement({
            x: 100, y: 200
        }, 42000,
            {
                x: 200, y: 100, moving: true, direction: "up"
            },
            42200
            );


        expect(playerMovement.isOutdated(42100)).toBe(false);
        expect(playerMovement.isOutdated(43000)).toBe(true);

        expect(playerMovement.getPosition(42100)).toEqual({
            x: 150,
            y: 150,
            direction: 'up',
            moving: true
        });

        expect(playerMovement.getPosition(42200)).toEqual({
            x: 200,
            y: 100,
            direction: 'up',
            moving: true
        });

        expect(playerMovement.getPosition(42300)).toEqual({
            x: 250,
            y: 50,
            direction: 'up',
            moving: true
        });
    });

    it("should not extrapolate if we stop", () => {
        const playerMovement = new PlayerMovement({
                x: 100, y: 200
            }, 42000,
            {
                x: 200, y: 100, moving: false, direction: "up"
            },
            42200
        );

        expect(playerMovement.getPosition(42300)).toEqual({
            x: 200,
            y: 100,
            direction: 'up',
            moving: false
        });
    });

    it("should should keep moving until it stops", () => {
        const playerMovement = new PlayerMovement({
                x: 100, y: 200
            }, 42000,
            {
                x: 200, y: 100, moving: false, direction: "up"
            },
            42200
        );

        expect(playerMovement.getPosition(42100)).toEqual({
            x: 150,
            y: 150,
            direction: 'up',
            moving: true
        });
    });
})
