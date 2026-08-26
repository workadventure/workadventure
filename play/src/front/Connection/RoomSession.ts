import { GameMap } from "@workadventure/map-editor";
import { wamFileMigration } from "@workadventure/map-editor/src/Migrations/WamFileMigration";
import { AvailabilityStatus, PositionMessage_Direction } from "@workadventure/messages";
import type { ITiledMap } from "@workadventure/tiled-map-type-guard";

import { computeStartPosition } from "../Phaser/Game/StartPositionCalculator";
import { GameMapStartPositionSource } from "../Phaser/Game/StartPositionSource";
import { urlManager } from "../Url/UrlManager";
import type { PositionInterface } from "./ConnexionModels";
import { connectionManager } from "./ConnectionManager";
import { peekPrefetchedTmjFile, peekPrefetchedWamFile } from "./MapPrefetch";
import type { OnConnectInterface } from "./ConnexionModels";

/**
 * Joins the room without waiting for a renderer.
 *
 * WorkAdventure's boot is driven by Phaser's game loop, which runs on requestAnimationFrame, and
 * Chromium schedules no frames for a hidden or minimized window. Everything below — resolving where
 * to stand, opening the socket, announcing ourselves — is HTTP, map data and a WebSocket, so none
 * of it needs a frame. Run here, a world finishes joining while the window is away; GameScene then
 * attaches to a session that is already live.
 *
 * The connection holds what it receives until GameScene has subscribed (see
 * RoomConnection.holdMessages). Room state lands in plain RxJS Subjects, which do not buffer, so
 * without that the gap between joining and rendering would silently swallow every user who moved.
 */

// Wide enough that the server sends the neighbours worth having before the camera exists. The
// scene replaces it with the real one as soon as the camera settles — setViewport is only accepted
// after a join, which this performs.
const PROVISIONAL_VIEWPORT_HALF_WIDTH = 960;
const PROVISIONAL_VIEWPORT_HALF_HEIGHT = 540;

export type JoinedSession = {
    connection: OnConnectInterface;
    startPosition: PositionInterface;
};

/**
 * Registered synchronously, before any of the work below runs. If it were only published once
 * joined, a scene reaching connect() while the join was still in flight would find nothing to
 * claim and open a second socket — two connections, two presences, for one user.
 */
type EarlySession = {
    roomUrl: string;
    ready: Promise<JoinedSession>;
};

let earlySession: EarlySession | undefined;

export type RoomSessionInput = {
    roomUrl: string;
    playerName: string;
    characterTextureIds: string[];
    companionTextureId: string | null;
};

/**
 * Work out where this player starts, from map data alone. Returns undefined when the map has not
 * been prefetched (nothing to compute from), and the scene falls back to computing it itself.
 */
async function resolveStartPosition(): Promise<PositionInterface | undefined> {
    const wamResponse = peekPrefetchedWamFile();
    const tmjResponse = peekPrefetchedTmjFile();
    if (!wamResponse || !tmjResponse) {
        return undefined;
    }

    const [wamData, tmjData] = await Promise.all([wamResponse, tmjResponse]);
    // Migrated on a copy: GameScene receives the untouched response and migrates it itself.
    const wamFile = wamFileMigration.migrate(structuredClone(wamData));
    const mapFile = tmjData as ITiledMap;
    const gameMap = new GameMap(mapFile, wamFile);

    return computeStartPosition(
        new GameMapStartPositionSource(gameMap),
        mapFile,
        undefined,
        urlManager.getStartPositionNameFromUrl(),
    );
}

/**
 * Open the socket and announce ourselves, holding incoming room state for GameScene. Best-effort:
 * anything that goes wrong here leaves the scene to do exactly what it does today.
 */
export function startRoomSession(input: RoomSessionInput): void {
    if (earlySession) {
        return;
    }

    const ready = (async (): Promise<JoinedSession> => {
        const startPosition = await resolveStartPosition();
        if (!startPosition) {
            throw new Error("No prefetched map to compute a start position from");
        }

        const wamData = await peekPrefetchedWamFile();
        const lastCommandId = wamFileMigration.migrate(structuredClone(wamData)).lastCommandId;

        const onConnect = await connectionManager.connectToRoomSocket(
            input.roomUrl,
            input.playerName,
            input.characterTextureIds,
            input.companionTextureId,
            lastCommandId,
        );

        // Hold before announcing ourselves: the server starts streaming room state the moment it
        // sees the join, and nothing is subscribed yet.
        onConnect.connection.holdMessages();
        onConnect.connection.emitJoinRoom(
            input.playerName,
            { x: startPosition.x, y: startPosition.y, direction: PositionMessage_Direction.DOWN, moving: false },
            {
                left: startPosition.x - PROVISIONAL_VIEWPORT_HALF_WIDTH,
                top: startPosition.y - PROVISIONAL_VIEWPORT_HALF_HEIGHT,
                right: startPosition.x + PROVISIONAL_VIEWPORT_HALF_WIDTH,
                bottom: startPosition.y + PROVISIONAL_VIEWPORT_HALF_HEIGHT,
            },
            // Deliberately not read from availabilityStatusStore: it lives in MediaStore, and pulling
            // that into the boot path risks the import cycle GameScene already has with it. The scene
            // pushes the real status as soon as it subscribes, so a persisted "busy" corrects itself.
            AvailabilityStatus.ONLINE,
        );

        return { connection: onConnect, startPosition };
    })();

    earlySession = { roomUrl: input.roomUrl, ready };

    ready.catch((error) => {
        // Nothing here is load-bearing: GameScene falls back to connecting and joining itself.
        // Logged rather than surfaced, so a failed head start never becomes a failed boot.
        console.info("Could not join the room ahead of the scene; the scene will do it.", error);
    });
}

/**
 * Claim the session GameScene should attach to. One-shot: a scene re-created on a portal, a room
 * change or a reconnection must build its own, against the room it is going to *now*.
 */
export function takeRoomSession(roomUrl: string): Promise<JoinedSession> | undefined {
    if (earlySession?.roomUrl !== roomUrl) {
        return undefined;
    }
    const { ready } = earlySession;
    earlySession = undefined;
    return ready;
}
