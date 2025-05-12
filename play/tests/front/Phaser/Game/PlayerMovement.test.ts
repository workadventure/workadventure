// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { PositionMessage_Direction } from "@workadventure/messages";
import { PlayerMovement } from "../../../../src/front/Phaser/Game/PlayerMovement";

const MAX_EXTRAPOLATION_TIME = 100;
const START_TICK = 42000;
const END_TICK = 42200;

vi.mock("../../../../src/front/Enum/EnvironmentVariable.ts", () => {
    return {
        MAX_EXTRAPOLATION_TIME: 100,
    };
});

describe("Interpolation / Extrapolation", () => {
    it("should interpolate", () => {
        const playerMovement = new PlayerMovement(
            {
                x: 100,
                y: 200,
            },
            START_TICK,
            {
                x: 200,
                y: 100,
                oldX: 100,
                oldY: 200,
                moving: true,
                direction: PositionMessage_Direction.UP,
            },
            END_TICK
        );

        expect(playerMovement.isOutdated(START_TICK + MAX_EXTRAPOLATION_TIME)).toBe(false);
        expect(playerMovement.isOutdated(START_TICK + MAX_EXTRAPOLATION_TIME + 900)).toBe(true);

        expect(playerMovement.getPosition(START_TICK + MAX_EXTRAPOLATION_TIME)).toEqual({
            x: 150,
            y: 150,
            oldX: 100,
            oldY: 200,
            direction: PositionMessage_Direction.UP,
            moving: true,
        });

        expect(playerMovement.getPosition(START_TICK + MAX_EXTRAPOLATION_TIME * 2)).toEqual({
            x: 200,
            y: 100,
            oldX: 100,
            oldY: 200,
            direction: PositionMessage_Direction.UP,
            moving: true,
        });

        expect(playerMovement.getPosition(START_TICK + MAX_EXTRAPOLATION_TIME * 3)).toEqual({
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
            START_TICK,
            {
                x: 200,
                y: 100,
                oldX: 100,
                oldY: 200,
                moving: false,
                direction: PositionMessage_Direction.UP,
            },
            END_TICK
        );

        expect(playerMovement.getPosition(START_TICK + MAX_EXTRAPOLATION_TIME * 3)).toEqual({
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
            START_TICK,
            {
                x: 200,
                y: 100,
                oldX: 100,
                oldY: 200,
                moving: false,
                direction: PositionMessage_Direction.UP,
            },
            END_TICK
        );

        expect(playerMovement.getPosition(START_TICK + MAX_EXTRAPOLATION_TIME)).toEqual({
            x: 150,
            y: 150,
            oldX: 100,
            oldY: 200,
            direction: PositionMessage_Direction.UP,
            moving: false,
        });
    });
});
