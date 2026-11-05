import { FilterType } from "@workadventure/messages";
import { get } from "svelte/store";
import { getMegaphoneSpaceFields } from "../../Streaming/MegaphoneSpaceFields";
import type { SpaceInterface } from "../../Space/SpaceInterface";
import type { RoomConnection } from "../../Connection/RoomConnection";
import { recorderLayoutModeStore, recorderPinsStore } from "../../Utils/RecorderMode";
import type { GameScene } from "./GameScene";

// How often the camera checks whether the people it films moved.
const REFRAME_INTERVAL_MS = 1000;
// How long a recorder following someone waits for their bubble before it starts recording anyway.
const FIRST_BUBBLE_TIMEOUT_MS = 5000;
// Room around the group, as a share of its size.
const FRAMING_MARGIN = 0.4;
// The smallest window of the map filmed, in map px: wide enough to see the room around the bubble and who walks in.
// The producer panel can change it (RecordingProduction.zoom).
// On a small map, it shows at most 3/4 of the map so the bubble still stands out (the whole map would sit in bands).
const MIN_FRAME = { width: 960, height: 540 };
const MAX_MIN_FRAME_SHARE_OF_MAP = 0.75;
// The producer's "tight" zoom: one person alone is still not filmed from 10 cm.
const TIGHT_MIN_FRAME = { width: 480, height: 270 };
// Movements smaller than this do not move the camera (no jitter while people shuffle on the spot).
const FRAME_STEP = 32;

/**
 * What the ?recorder page films. It frames the members of the space it is in, following them when they move.
 * - With `?space=` (an area, a megaphone) it joins that space by name.
 * - Without, it follows the person who started the recording: the back sends it into each bubble that person joins
 *   and out of each one they leave, as it does for a user (join/leaveSpaceRequestMessage).
 */
export class RecorderDirector {
    private readonly abortController = new AbortController();
    private space: SpaceInterface | undefined;
    private interval: ReturnType<typeof setInterval> | undefined;
    private lastFrame = "";
    // Bubble switches run one after the other: a leave must not overtake the join it undoes.
    private switching: Promise<void> = Promise.resolve();
    private firstJoin: Promise<void> | undefined;
    private readonly subscriptions: { unsubscribe(): void }[] = [];

    constructor(
        private readonly scene: GameScene,
        private readonly spaceName: string | undefined,
        private readonly filterType: FilterType,
    ) {}

    /**
     * Follow mode. Called as soon as the connection exists: the back sends the first bubble right after the room is
     * joined, before the scene is ready to film, and these messages are not replayed. They wait for `ready` (the space
     * registry exists).
     */
    public follow(connection: RoomConnection, ready: Promise<void>): void {
        this.switching = ready;
        let joined: () => void = () => {};
        this.firstJoin = new Promise((resolve) => {
            joined = resolve;
        });
        this.subscriptions.push(
            connection.joinSpaceRequestMessage.subscribe(({ spaceName, propertiesToSync }) => {
                this.queue(async () => {
                    await this.leave();
                    this.space = await this.scene.spaceRegistry.joinSpace(
                        spaceName,
                        FilterType.ALL_USERS,
                        propertiesToSync,
                        this.abortController.signal,
                    );
                    joined();
                });
            }),
            connection.leaveSpaceRequestMessage.subscribe(({ spaceName }) => {
                this.queue(async () => {
                    // Keep the last shot until the person is in a bubble again.
                    if (this.space?.getName() === spaceName) await this.leave();
                });
            }),
        );
    }

    private queue(task: () => Promise<void>): void {
        this.switching = this.switching
            .then(task)
            .catch((e) => console.error("The recorder could not follow the bubble", e));
    }

    private async leave(): Promise<void> {
        const space = this.space;
        this.space = undefined;
        if (space) await this.scene.spaceRegistry.leaveSpace(space);
    }

    public async start(): Promise<void> {
        if (this.firstJoin) {
            // The person may be in no bubble right now: film the map meanwhile rather than not start at all.
            await Promise.race([
                this.firstJoin,
                new Promise((resolve) => {
                    setTimeout(resolve, FIRST_BUBBLE_TIMEOUT_MS);
                }),
            ]);
        } else if (this.spaceName !== undefined) {
            const propertiesToSync =
                this.filterType === FilterType.ALL_USERS
                    ? ["cameraState", "microphoneState", "screenSharingState"]
                    : getMegaphoneSpaceFields(this.filterType === FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK);
            this.space = await this.scene.spaceRegistry.joinSpace(
                this.spaceName,
                this.filterType,
                propertiesToSync,
                this.abortController.signal,
            );
        } else {
            throw new Error("?recorder needs a space to record or a person to follow");
        }
        this.frame();
        this.interval = setInterval(() => this.frame(), REFRAME_INTERVAL_MS);
        // Resolve once the first zoom is over, so the recording does not open on the whole map.
        await new Promise((resolve) => {
            setTimeout(resolve, REFRAME_INTERVAL_MS);
        });
    }

    private frame(): void {
        if (!this.space) return;
        // What the person recording directs (the producer panel), read on each reframe: it shows within a second.
        const production = get(this.space.state.store).recording.production;
        if (production) {
            recorderLayoutModeStore.set(production.layout);
            if (get(recorderPinsStore).join() !== production.pins.join()) recorderPinsStore.set(production.pins);
        }
        const map = this.scene.Map;
        const shot = production?.frame
            ? { ...production.frame, margin: 0 }
            : production?.zoom === "whole"
              ? { x: 0, y: 0, width: map.widthInPixels, height: map.heightInPixels, margin: 0 }
              : this.peopleShot(production?.zoom === "tight" ? TIGHT_MIN_FRAME : MIN_FRAME);
        if (!shot) return;
        const x = shot.x + shot.width / 2;
        const y = shot.y + shot.height / 2;
        const key = [x, y, shot.width, shot.height, shot.margin].map((v) => Math.round(v / FRAME_STEP)).join(",");
        if (key === this.lastFrame) return;
        this.lastFrame = key;
        this.scene
            .getCameraManager()
            .enterFocusMode({ x, y, width: shot.width, height: shot.height }, shot.margin, REFRAME_INTERVAL_MS);
    }

    /** The members of the space on this map, with room around them. Undefined: nobody here, keep the last shot. */
    private peopleShot(minFrame: { width: number; height: number }) {
        if (!this.space) return undefined;
        let left = Infinity;
        let top = Infinity;
        let right = -Infinity;
        let bottom = -Infinity;
        for (const user of get(this.space.usersStore).values()) {
            // spaceUserId is "<room>_<userId>". Users of another map (a megaphone reaches every map) are not on ours.
            const userId = Number(user.spaceUserId.slice(user.spaceUserId.lastIndexOf("_") + 1));
            const player = this.scene.MapPlayersByKey.get(userId);
            if (!player) continue;
            left = Math.min(left, player.x);
            top = Math.min(top, player.y);
            right = Math.max(right, player.x);
            bottom = Math.max(bottom, player.y);
        }
        if (left === Infinity) return undefined;
        const map = this.scene.Map;
        const cap = MAX_MIN_FRAME_SHARE_OF_MAP / (1 + FRAMING_MARGIN);
        const width = Math.max(Math.min(minFrame.width, map.widthInPixels * cap), right - left);
        const height = Math.max(Math.min(minFrame.height, map.heightInPixels * cap), bottom - top);
        const x = (left + right) / 2;
        const y = (top + bottom) / 2;
        return { x: x - width / 2, y: y - height / 2, width, height, margin: FRAMING_MARGIN };
    }

    public destroy(): void {
        clearInterval(this.interval);
        for (const subscription of this.subscriptions) subscription.unsubscribe();
        this.abortController.abort();
    }
}
