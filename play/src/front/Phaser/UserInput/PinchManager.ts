import type * as Phaser from "phaser";
import { waScaleManager } from "../Services/WaScaleManager";
import { GameScene } from "../Game/GameScene";

type Point = { x: number; y: number };

/**
 * Two-finger gestures: pinch to zoom, and move both fingers together to pan.
 *
 * The fingers are read from the browser's touches, in page pixels. Phaser's pointer coordinates are in game pixels,
 * which change every time a zoom step resizes the canvas: a finger standing still would seem to move, and the map
 * would jump. Positions are converted to game pixels only when used.
 */
export class PinchManager {
    private pinching = false;
    private distance = 0;
    private last: Point = { x: 0, y: 0 };

    constructor(private readonly scene: Phaser.Scene) {
        // Phaser tracks a single touch pointer by default; the second finger needs its own.
        const touchPointers = scene.input.manager.pointersTotal - 1;
        if (touchPointers < 2) {
            scene.input.addPointer(2 - touchPointers);
        }
        for (const type of ["touchstart", "touchmove", "touchend", "touchcancel"] as const) {
            scene.game.canvas.addEventListener(type, this.onTouch, { passive: true });
        }
    }

    private readonly onTouch = (event: TouchEvent): void => {
        if (event.touches.length !== 2) {
            this.pinching = false;
            return;
        }
        const [a, b] = [event.touches[0], event.touches[1]];
        const centre = { x: (a.pageX + b.pageX) / 2, y: (a.pageY + b.pageY) / 2 };
        const distance = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
        if (!this.pinching) {
            this.pinching = true;
            this.distance = distance;
            this.last = centre;
            return;
        }
        if (event.type !== "touchmove" || this.distance === 0) {
            return;
        }
        const zoomFactor = distance / this.distance;
        this.distance = distance;
        if (!(this.scene instanceof GameScene)) {
            waScaleManager.zoomModifier *= zoomFactor;
            return;
        }

        // The map follows the point between the fingers, which pans when both move together.
        const scale = this.scene.scale;
        const pan = {
            x: (this.last.x - centre.x) * scale.displayScale.x,
            y: (this.last.y - centre.y) * scale.displayScale.y,
        };
        this.last = centre;
        const centreInGame = { x: scale.transformX(centre.x), y: scale.transformY(centre.y) };
        this.scene.userInputManager.userInputHandler.handlePinch?.(zoomFactor, centreInGame, pan);
    };

    destroy() {
        for (const type of ["touchstart", "touchmove", "touchend", "touchcancel"] as const) {
            this.scene.game.canvas.removeEventListener(type, this.onTouch);
        }
    }
}
