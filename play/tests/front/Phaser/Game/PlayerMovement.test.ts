// @vitest-environment jsdom
//@ts-ignore
//@ts-ignore
window.env = {
    MAX_USERNAME_LENGTH: 10,
    DEBUG_MODE: true,
};

import { describe, expect, it } from "vitest";
import { PositionMessage_Direction } from "@workadventure/messages";
import { PlayerMovement } from "../../../../src/front/Phaser/Game/PlayerMovement";

describe("Interpolation / Extrapolation", () => {
    it("should interpolate", () => {
        const playerMovement = new PlayerMovement(
            {
                x: 100,
                y: 200,
            },
            42000,
            {
                x: 200,
                y: 100,
                oldX: 100,
                oldY: 200,
                moving: true,
                direction: PositionMessage_Direction.UP,
            },
            42200
        );

        expect(playerMovement.isOutdated(42100)).toBe(false);
        expect(playerMovement.isOutdated(43000)).toBe(true);

        expect(playerMovement.getPosition(42100)).toEqual({
            x: 150,
            y: 150,
            oldX: 100,
            oldY: 200,
            direction: PositionMessage_Direction.UP,
            moving: true,
        });

        expect(playerMovement.getPosition(42200)).toEqual({
            x: 200,
            y: 100,
            oldX: 100,
            oldY: 200,
            direction: PositionMessage_Direction.UP,
            moving: true,
        });

        expect(playerMovement.getPosition(42300)).toEqual({
            x: 250,
            y: 50,
            oldX: 100,
            oldY: 200,
            direction: PositionMessage_Direction.UP,
            moving: true,
        });
    });

    it("should not extrapolate if we stop", () => {
        const playerMovement = new PlayerMovement(
            {
                x: 100,
                y: 200,
            },
            42000,
            {
                x: 200,
                y: 100,
                oldX: 100,
                oldY: 200,
                moving: false,
                direction: PositionMessage_Direction.UP,
            },
            42200
        );

        expect(playerMovement.getPosition(42300)).toEqual({
            x: 200,
            y: 100,
            oldX: 100,
            oldY: 200,
            direction: PositionMessage_Direction.UP,
            moving: false,
        });
    });

    it("should keep moving until it stops", () => {
        const playerMovement = new PlayerMovement(
            {
                x: 100,
                y: 200,
            },
            42000,
            {
                x: 200,
                y: 100,
                oldX: 100,
                oldY: 200,
                moving: false,
                direction: PositionMessage_Direction.UP,
            },
            42200
        );

        expect(playerMovement.getPosition(42100)).toEqual({
            x: 150,
            y: 150,
            oldX: 100,
            oldY: 200,
            direction: PositionMessage_Direction.UP,
            moving: false,
        });
    });
});
