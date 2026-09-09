import { gameManager } from "../Phaser/Game/GameManager";

export interface Coordinates {
    x: number;
    y: number;
}

export interface GameToBrowserProjection {
    /** Where the point lands in the page, in CSS pixels. */
    browser: Coordinates;
    /** The same point converted back to game coordinates, for callers that want to check the round trip. */
    roundTrip: Coordinates;
}

export function getGameCanvas(): HTMLCanvasElement | null {
    return document.querySelector<HTMLCanvasElement>("#game canvas");
}

/**
 * Projects a point of the game world onto the page.
 *
 * The canvas is not necessarily the whole window and its internal resolution rarely matches its CSS
 * size, so the camera matrix alone is not enough: the result has to be rescaled by the canvas box and
 * offset by its position. Returns undefined when there is no scene or canvas to project onto.
 */
export function projectGameToBrowser(gameCoordinates: Coordinates): GameToBrowserProjection | undefined {
    const canvas = getGameCanvas();
    if (!canvas) {
        return undefined;
    }

    const camera = gameManager.getCurrentGameScene().getCameraManager().getCamera();
    // preRender() must be called before reading the camera matrices, or they may be a frame stale.
    // See the same pattern in GameScene.connect().
    camera.preRender();

    const canvasRect = canvas.getBoundingClientRect();
    const canvasInternalWidth = canvas.width || camera.width;
    const canvasInternalHeight = canvas.height || camera.height;
    const scaleX = canvasRect.width / canvasInternalWidth;
    const scaleY = canvasRect.height / canvasInternalHeight;
    const canvasPoint = camera.matrixCombined.transformPoint(gameCoordinates.x, gameCoordinates.y, { x: 0, y: 0 });
    const roundTrip = camera.getWorldPoint(canvasPoint.x, canvasPoint.y);

    return {
        browser: {
            x: canvasRect.left + canvasPoint.x * scaleX,
            y: canvasRect.top + canvasPoint.y * scaleY,
        },
        roundTrip: { x: roundTrip.x, y: roundTrip.y },
    };
}

/** Where the player's own Woka currently sits on screen, or undefined if it cannot be located. */
export function getCurrentPlayerScreenPosition(): Coordinates | undefined {
    try {
        const player = gameManager.getCurrentGameScene().CurrentPlayer;
        if (!player) {
            return undefined;
        }
        return projectGameToBrowser({ x: player.x, y: player.y })?.browser;
    } catch {
        // No game scene yet: callers fall back to centring on the viewport.
        return undefined;
    }
}
