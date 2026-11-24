import { PositionMessage_Direction } from "@workadventure/messages";
import { CancelablePromise } from "cancelable-promise";
import { MINIMUM_DISTANCE, WOKA_SPEED } from "../Enum/EnvironmentVariable";
import { ConversationBubble } from "../Phaser/Entity/ConversationBubble";
import { RemotePlayer } from "../Phaser/Entity/RemotePlayer";
import { lazyLoadPlayerCharacterTextures } from "../Phaser/Entity/PlayerTexturesLoadingManager";
import { gameManager } from "../Phaser/Game/GameManager";
import type { GameScene } from "../Phaser/Game/GameScene";
import { hasMovedEventName } from "../Phaser/Player/Player";
import type { Streamable } from "../Space/Streamable";
import { scriptingVideoStore } from "../Stores/ScriptingVideoStore";
import { simulatedConversationStore } from "../Stores/SimulatedConversationStore";

const SIMULATED_USER_ID = 999999;
const SPEED = WOKA_SPEED * 2.5;
/** The bubble hides while the user walks away from the fake user, and shows again when they come back. */
const BUBBLE_VISIBILITY_DISTANCE = MINIMUM_DISTANCE * 2.5;

/** A fake user walks up to the player, opens a fake bubble and plays a video, until the returned function is called. */
class SimulatedConversation {
    private player: RemotePlayer | undefined;
    private bubble: ConversationBubble | undefined;
    private video: Streamable | undefined;
    private locked = false;
    private destroyed = false;
    private readonly timers = new Set<ReturnType<typeof setTimeout>>();
    private bubbleInterval: ReturnType<typeof setInterval> | undefined;
    private followTimer: ReturnType<typeof setTimeout> | undefined;

    constructor(private readonly scene: GameScene) {
        simulatedConversationStore.set({ locked: false });
        scene.CurrentPlayer.on(hasMovedEventName, this.follow);
        this.walkUp().catch((error) => {
            console.error("The onboarding's fake user could not walk up", error);
        });
    }

    lock(): void {
        this.locked = true;
        this.bubble?.setLocked(true);
        simulatedConversationStore.set({ locked: true });
    }

    destroy(): void {
        this.destroyed = true;
        for (const timer of this.timers) {
            clearTimeout(timer);
        }
        clearInterval(this.bubbleInterval);
        clearTimeout(this.followTimer);
        this.scene.CurrentPlayer.off(hasMovedEventName, this.follow);
        this.player?.destroy();
        this.bubble?.destroy();
        if (this.video) {
            scriptingVideoStore.removeVideo(this.video.uniqueId);
        }
        simulatedConversationStore.set(undefined);
    }

    private later(delay: number, action: () => void): void {
        const timer = setTimeout(() => {
            this.timers.delete(timer);
            action();
        }, delay);
        this.timers.add(timer);
    }

    private async walkUp(): Promise<void> {
        // Any Woka but the user's own.
        const ownWoka = gameManager.getCharacterTextureIds()?.[0];
        const textures = (await gameManager.loadWokaData()).woka.collections.flatMap((collection) =>
            collection.textures.map((texture) => ({ id: texture.id, url: texture.url })),
        );
        if (this.destroyed || textures.length === 0) {
            return;
        }
        const others = textures.filter((texture) => texture.id !== ownWoka);
        const pool = others.length > 0 ? others : textures;
        const texture = pool[Math.floor(Math.random() * pool.length)];

        const camera = this.scene.cameras.main;
        const me = this.scene.CurrentPlayer;
        const player = new RemotePlayer(
            SIMULATED_USER_ID,
            "onboarding-simulated-player",
            this.scene,
            // From the right edge of the screen.
            camera.scrollX + camera.width,
            me.y,
            "Demo User",
            lazyLoadPlayerCharacterTextures(this.scene.superLoad, [texture]),
            PositionMessage_Direction.LEFT,
            false,
            null,
            new CancelablePromise<string>((_, reject) => reject(new Error("No companion texture"))),
        );
        // Not in the players repository: it would count one player too many.
        player.setVisible(false);
        this.player = player;

        // Lets the textures load.
        this.later(200, () => {
            player.setVisible(true);
            player
                .moveToPosition({ x: me.x + 64, y: me.y - 16 }, true, SPEED)
                .then(() => this.openBubble(player))
                .catch((error) => {
                    console.error("The onboarding's fake user could not walk up", error);
                });
        });
    }

    private openBubble(player: RemotePlayer): void {
        const userId = this.scene.connection?.getUserId();
        if (this.destroyed || this.bubble || userId === undefined) {
            return;
        }
        const me = this.scene.CurrentPlayer;
        const bubble = new ConversationBubble(this.scene, me.x, me.y - 30, this.locked, [userId, SIMULATED_USER_ID]);
        this.bubble = bubble;
        this.bubbleInterval = setInterval(() => {
            bubble.step([
                { x: me.x, y: me.y, inside: true },
                { x: player.x, y: player.y, inside: true },
            ]);
            bubble.setVisible(Math.hypot(me.x - player.x, me.y - 30 - player.y) <= BUBBLE_VISIBILITY_DISTANCE);
            this.scene.markDirty();
        }, 32);
        this.scene.playBubbleInSound();
        this.video = scriptingVideoStore.addVideo(
            `/static/Videos/onboarding/ia-generation-remoteoffice${Math.floor(Math.random() * 5) + 1}.mp4`,
            { name: "Demo User", loop: true },
        );
        this.later(300, () => this.faceAndWave(player));
    }

    private faceAndWave(player: RemotePlayer): void {
        player.updatePosition({ x: player.x, y: player.y, direction: PositionMessage_Direction.DOWN, moving: false });
        player.playEmote("👋");
    }

    /** The fake user follows the player around. */
    private readonly follow = () => {
        const player = this.player;
        if (!player) {
            return;
        }
        clearTimeout(this.followTimer);
        this.followTimer = setTimeout(() => {
            const me = this.scene.CurrentPlayer;
            player
                .moveToPosition({ x: me.x + 60, y: me.y - 16 }, true, SPEED)
                .then(() => {
                    if (!this.destroyed) {
                        player.updatePosition({
                            x: player.x,
                            y: player.y,
                            direction: PositionMessage_Direction.DOWN,
                            moving: false,
                        });
                    }
                })
                .catch((error) => {
                    console.error("The onboarding's fake user could not follow", error);
                });
        }, 100);
    };
}

let current: SimulatedConversation | undefined;

/** Starts the fake conversation. Returns its end. */
export function startSimulatedConversation(scene: GameScene): () => void {
    current?.destroy();
    const conversation = new SimulatedConversation(scene);
    current = conversation;
    return () => {
        conversation.destroy();
        if (current === conversation) {
            current = undefined;
        }
    };
}

/** Turns the fake bubble red, as locking a real one does. */
export function lockSimulatedBubble(): void {
    current?.lock();
}
