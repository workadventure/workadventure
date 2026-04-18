import { gameManager } from "../Phaser/Game/GameManager";

let webRtcConnectionsCount = 0;
let livekitConnectionsCount = 0;
let livekitRoomCount = 0;

interface Coordinates {
    x: number;
    y: number;
}

interface E2ECoordinateOptions {
    timeoutMs?: number;
    retryIntervalMs?: number;
    tolerance?: number;
}

interface CameraEffectWithIsRunning {
    isRunning?: boolean;
}

interface CameraWithTransform extends Phaser.Cameras.Scene2D.Camera {
    matrix: Phaser.GameObjects.Components.TransformMatrix;
}

const DEFAULT_COORDINATE_STABILITY_TIMEOUT_MS = 10_000;
const DEFAULT_COORDINATE_STABILITY_RETRY_INTERVAL_MS = 500;
const DEFAULT_COORDINATE_STABILITY_TOLERANCE = 1;

function wait(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, delayMs);
    });
}

function waitForNextFrame(): Promise<void> {
    return new Promise((resolve) => {
        gameManager.getCurrentGameScene().events.once(Phaser.Scenes.Events.POST_UPDATE, () => {
            resolve();
        });
    });
}

function isEffectRunning(effect: CameraEffectWithIsRunning | undefined): boolean {
    return effect?.isRunning === true;
}

function hasRunningCameraEffect(camera: Phaser.Cameras.Scene2D.Camera): boolean {
    return (
        isEffectRunning(camera.fadeEffect) ||
        isEffectRunning(camera.flashEffect) ||
        isEffectRunning(camera.panEffect) ||
        isEffectRunning(camera.rotateToEffect) ||
        isEffectRunning(camera.shakeEffect) ||
        isEffectRunning(camera.zoomEffect)
    );
}

function currentCameraHasRunningEffect(): boolean {
    return hasRunningCameraEffect(gameManager.getCurrentGameScene().getCameraManager().getCamera());
}

function getGameCanvas(): HTMLCanvasElement {
    const canvas = document.querySelector<HTMLCanvasElement>("#game canvas");

    if (!canvas) {
        throw new Error('Unable to convert game coordinates: "#game canvas" was not found.');
    }

    return canvas;
}

function getGameToBrowserCoordinatesSnapshot(gameCoordinates: Coordinates): Coordinates {
    const scene = gameManager.getCurrentGameScene();
    const camera = scene.getCameraManager().getCamera();
    const cameraWithTransform = camera as CameraWithTransform;

    // camera.preRender() must be called before accessing worldView or the camera matrix to ensure it is up to date.
    // See the same pattern in GameScene.connect().
    // @ts-ignore preRender is protected, but Phaser documents it as the way to refresh worldView.
    camera.preRender();

    const canvas = getGameCanvas();
    const canvasRect = canvas.getBoundingClientRect();
    const canvasInternalWidth = canvas.width || camera.width;
    const canvasInternalHeight = canvas.height || camera.height;
    const scaleX = canvasRect.width / canvasInternalWidth;
    const scaleY = canvasRect.height / canvasInternalHeight;
    const canvasPoint = cameraWithTransform.matrix.transformPoint(
        gameCoordinates.x - camera.scrollX,
        gameCoordinates.y - camera.scrollY,
        { x: 0, y: 0 }
    );
    const x = canvasRect.left + canvasPoint.x * scaleX;
    const y = canvasRect.top + canvasPoint.y * scaleY;
    const roundTrip = camera.getWorldPoint(canvasPoint.x, canvasPoint.y);

    if (!areCoordinatesClose(gameCoordinates, roundTrip, DEFAULT_COORDINATE_STABILITY_TOLERANCE)) {
        throw new Error(
            "Unable to convert game coordinates: camera coordinate round trip did not return the original point. " +
                JSON.stringify({
                    gameCoordinates,
                    canvasPoint,
                    roundTrip: {
                        x: roundTrip.x,
                        y: roundTrip.y,
                    },
                    tolerance: DEFAULT_COORDINATE_STABILITY_TOLERANCE,
                })
        );
    }

    return {
        x,
        y,
    };
}

function areCoordinatesClose(first: Coordinates, second: Coordinates, tolerance: number): boolean {
    return Math.abs(first.x - second.x) <= tolerance && Math.abs(first.y - second.y) <= tolerance;
}

async function gameToBrowserCoordinates(
    gameCoordinates: Coordinates,
    options: E2ECoordinateOptions = {}
): Promise<Coordinates> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_COORDINATE_STABILITY_TIMEOUT_MS;
    const retryIntervalMs = options.retryIntervalMs ?? DEFAULT_COORDINATE_STABILITY_RETRY_INTERVAL_MS;
    const tolerance = options.tolerance ?? DEFAULT_COORDINATE_STABILITY_TOLERANCE;
    const startedAt = Date.now();

    const waitForStableCoordinates = async (): Promise<Coordinates> => {
        const firstSnapshot = getGameToBrowserCoordinatesSnapshot(gameCoordinates);
        const cameraWasAnimating = currentCameraHasRunningEffect();

        await waitForNextFrame();

        const secondSnapshot = getGameToBrowserCoordinatesSnapshot(gameCoordinates);
        const coordinatesAreStable = areCoordinatesClose(firstSnapshot, secondSnapshot, tolerance);
        const cameraIsAnimating = currentCameraHasRunningEffect();
        const cameraIsStable = !cameraWasAnimating && !cameraIsAnimating;

        if (coordinatesAreStable && cameraIsStable) {
            return {
                x: secondSnapshot.x,
                y: secondSnapshot.y,
            };
        }

        if (Date.now() - startedAt >= timeoutMs) {
            throw new Error(
                `Unable to convert game coordinates to stable browser coordinates within ${timeoutMs}ms. ` +
                    JSON.stringify({
                        firstSnapshot,
                        secondSnapshot,
                        cameraWasAnimating,
                        cameraIsAnimating,
                        tolerance,
                    })
            );
        }

        await wait(retryIntervalMs);
        return waitForStableCoordinates();
    };

    return waitForStableCoordinates();
}

/**
 * [DEBUG] Forces a WebRTC peer failure to test the retry mechanism.
 * This function finds the first SimplePeer with active video peers and triggers a forced failure.
 * @returns Information about the triggered failure, or null if no peers found
 */
function testWebRtcRetry(): { spaceName: string; userId: string; triggered: boolean } | null {
    try {
        const spaceRegistry = gameManager.getCurrentGameScene().spaceRegistry;
        const spaces = spaceRegistry.getAll();

        for (const space of spaces) {
            const simplePeer = space.simplePeer;
            if (simplePeer) {
                const result = simplePeer.forceFirstPeerFailure();
                if (result) {
                    console.info(
                        `[DEBUG] Retry test triggered for space "${space.getName()}", userId: ${result.userId}`
                    );
                    return { spaceName: space.getName(), ...result };
                }
            }
        }

        console.warn("[DEBUG] No active video peers found in any space to test retry");
        return null;
    } catch (error) {
        console.error("[DEBUG] Error while triggering WebRTC retry test:", error);
        return null;
    }
}

/**
 * [DEBUG] Forces a server disconnected event to test the reconnection flow (connection issue toast, wait for pusher, reload scene).
 * Emits on the current RoomConnection's serverDisconnected subject so the same handlers as a real disconnect run.
 * @returns { triggered: true } if the event was emitted, or null if not in a game scene or no connection
 */
function triggerServerDisconnected(): { triggered: true } | null {
    try {
        const scene = gameManager.getCurrentGameScene();
        const connection = scene.connection;
        if (!connection) {
            console.warn("[DEBUG] No room connection available to trigger serverDisconnected");
            return null;
        }
        connection._serverDisconnected.next();
        console.info("[DEBUG] serverDisconnected event triggered for E2E test");
        return { triggered: true };
    } catch (error) {
        console.error("[DEBUG] Error while triggering serverDisconnected:", error);
        return null;
    }
}

/**
 * [DEBUG] Forces a LiveKit WebSocket close to test the reconnection mechanism.
 * This function finds the first space with an active LiveKit connection and closes the WebSocket.
 * @returns Information about the triggered close, or null if no LiveKit connection found
 */
function testLivekitRetry(): { spaceName: string; closed: boolean } | null {
    try {
        const spaceRegistry = gameManager.getCurrentGameScene().spaceRegistry;
        const spaces = spaceRegistry.getAll();

        for (const space of spaces) {
            const spacePeerManager = space.spacePeerManager;
            if (spacePeerManager) {
                const result = spacePeerManager.forceWebSocketClose();
                if (result) {
                    console.info(`[DEBUG] LiveKit WebSocket close triggered for space "${space.getName()}"`);
                    return { spaceName: space.getName(), closed: true };
                }
            }
        }

        console.warn("[DEBUG] No active LiveKit connections found in any space to test retry");
        return null;
    } catch (error) {
        console.error("[DEBUG] Error while triggering LiveKit retry test:", error);
        return null;
    }
}

export function incrementWebRtcConnectionsCount() {
    webRtcConnectionsCount++;
}

export function decrementWebRtcConnectionsCount() {
    webRtcConnectionsCount--;
}

export function incrementLivekitConnectionsCount() {
    livekitConnectionsCount++;
}

export function decrementLivekitConnectionsCount() {
    livekitConnectionsCount--;
}

export function incrementLivekitRoomCount() {
    livekitRoomCount++;
}

export function decrementLivekitRoomCount() {
    livekitRoomCount--;
}

/**
 * The e2eHooks object contains methods used for E2E tests.
 * We should refrain from growing this object too much but it can be useful in very specific circumstances (usually linked to Phaser testing)
 */
export const e2eHooks = {
    waitForNextFrame,
    getWebRtcConnectionsCount(): number {
        return webRtcConnectionsCount;
    },
    getLivekitConnectionsCount(): number {
        return livekitConnectionsCount;
    },
    getLivekitRoomsCount(): number {
        return livekitRoomCount;
    },
    gameToBrowserCoordinates,
    /**
     * [DEBUG] Forces a WebRTC peer failure to test the retry mechanism.
     */
    testWebRtcRetry,
    /**
     * [DEBUG] Forces a LiveKit WebSocket close to test the reconnection mechanism.
     */
    testLivekitRetry,
    /**
     * [DEBUG] Forces a server disconnected event to test the reconnection flow.
     */
    triggerServerDisconnected,
};
