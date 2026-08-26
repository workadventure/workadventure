import { GameMap } from "@workadventure/map-editor";
import { wamFileMigration } from "@workadventure/map-editor/src/Migrations/WamFileMigration";
import { PositionMessage_Direction } from "@workadventure/messages";
import type { AvailabilityStatus } from "@workadventure/messages";
import type { ITiledMap } from "@workadventure/tiled-map-type-guard";

import { computeStartPosition } from "../Phaser/Game/StartPositionCalculator";
import { GameMapStartPositionSource } from "../Phaser/Game/StartPositionSource";
import { urlManager } from "../Url/UrlManager";
import type { PositionInterface } from "./ConnexionModels";
import { connectionManager } from "./ConnectionManager";
import { peekPrefetchedTmjFile, peekPrefetchedWamFile } from "./MapPrefetch";
import { SingleUseSlot } from "./SingleUseSlot";
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
    /**
     * Where we announced the player — absent when we deliberately left the join to the scene, in
     * which case it must compute the position itself.
     */
    startPosition?: PositionInterface;
};

/**
 * Filled synchronously, before any of the work below runs. If it were only filled once joined, a
 * scene reaching connect() while the join was still in flight would find nothing to claim and open
 * a second socket — two connections, two presences, for one user.
 *
 * Closing on discard matters as much: whatever is dropped here has a socket open.
 */
const earlySession = new SingleUseSlot<Promise<JoinedSession>>((ready) => {
    ready
        .then(({ connection }) => connection.connection.closeConnection())
        .catch(() => {
            // It never connected; there is nothing to close.
        });
});

export type RoomSessionInput = {
    roomUrl: string;
    playerName: string;
    characterTextureIds: string[];
    companionTextureId: string | null;
    availabilityStatus: AvailabilityStatus;
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

        // The room may have been edited since the WAM we computed from was last saved: the server
        // sends those commands on connect, and GameScene applies them *before* working out where to
        // stand. A desk claimed in the map editor is exactly that kind of edit — computing from the
        // stale copy would spawn the player away from their own desk. When there is anything to
        // apply, hand the connection over unjoined and let the scene do it on the up-to-date map.
        const pendingEdits = onConnect.roomConnectedMessage.editMapCommandsArrayMessage?.editMapCommands ?? [];
        if (pendingEdits.length > 0) {
            return { connection: onConnect };
        }

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
            input.availabilityStatus,
        );

        return { connection: onConnect, startPosition };
    })();

    // Filling discards anything still held: reaching here again means the boot that opened it never
    // got to a scene — a reconnection, or a room change — so that connection is stale.
    earlySession.fill(input.roomUrl, ready);

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
    return earlySession.take(roomUrl);
}
