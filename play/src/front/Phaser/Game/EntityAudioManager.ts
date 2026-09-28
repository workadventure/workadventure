import type { Subscription } from "rxjs";
import { get } from "svelte/store";
import { MathUtils } from "@workadventure/math-utils";
import type { PlayAudioPropertyData } from "@workadventure/map-editor";
import { findBroadcastablePlayAudioProperty } from "@workadventure/map-editor";
import type { RoomConnection } from "../../Connection/RoomConnection";
import { localUserStore } from "../../Connection/LocalUserStore";
import {
    audioManagerFileStore,
    audioManagerVisibilityStore,
    audioManagerVolumeStore,
} from "../../Stores/AudioManagerStore";
import type { Entity } from "../ECS/Entity";
import type { GameScene } from "./GameScene";

/**
 * Swallows the second half of a double click without getting in the way of someone deliberately
 * changing the sound being played.
 */
export const ENTITY_SOUND_MIN_INTERVAL_IN_MS = 1000;

/**
 * Plays the sounds attached to map entities, whether they were activated by this player or
 * broadcast by another one.
 *
 * Playback goes straight to the audio manager rather than through the property map that
 * GameMapPropertiesListener watches: that map only reacts to values that change, so activating the
 * same entity twice in a row would be swallowed, and it drops everything but the URL, which is why
 * the volume of an entity sound has never had any effect.
 */
export class EntityAudioManager {
    private readonly subscription: Subscription;
    private lastBroadcastAt: number | undefined;
    /** The broadcast sound being played, whose volume follows the player until another sound replaces it. */
    private playing: { entity: Entity; property: PlayAudioPropertyData; file: string } | undefined;

    constructor(
        private scene: GameScene,
        private connection: RoomConnection,
    ) {
        this.subscription = connection.entityMessageStream.subscribe((message) => {
            const event = message.entityEvent?.event;
            if (event?.$case !== "entitySoundPlayed") {
                return;
            }
            this.playBroadcastSound(message.entityId, event.entitySoundPlayed.soundUrl);
        });
    }

    /**
     * Activates the sound of an entity. A sound meant for everyone is not played here: it comes
     * back through the broadcast, so the player who activated it hears it like everybody else.
     */
    public play(entityId: string, property: PlayAudioPropertyData): void {
        if (!property.playForAllUsers) {
            this.playLocally(property.audioLink, property.volume ?? 1);
            return;
        }

        const now = Date.now();
        if (this.lastBroadcastAt !== undefined && now - this.lastBroadcastAt < ENTITY_SOUND_MIN_INTERVAL_IN_MS) {
            return;
        }
        this.lastBroadcastAt = now;
        this.connection.emitEntitySoundPlayed(entityId, property.audioLink);
    }

    /**
     * The volume of a broadcast sound fades as the player walks away from its entity and comes back
     * as they return.
     */
    public onPlayerMoved(): void {
        if (!this.playing) {
            return;
        }
        // Another sound took over the audio player, or this one has ended.
        if (get(audioManagerFileStore) !== this.playing.file || get(audioManagerVisibilityStore) !== "visible") {
            this.playing = undefined;
            return;
        }
        audioManagerVolumeStore.setSoundVolume(this.volumeFor(this.playing.property, this.playing.entity));
    }

    public destroy(): void {
        this.subscription.unsubscribe();
    }

    private playBroadcastSound(entityId: string, soundUrl: string): void {
        const entity = this.scene.getGameMapFrontWrapper().getEntitiesManager().getEntities().get(entityId);
        if (!entity) {
            return;
        }

        // The server relays the URL unchecked, so it is matched against the entity here: what is
        // played comes from this client's own map, never from the message.
        const property = findBroadcastablePlayAudioProperty(entity.getProperties(), soundUrl);
        if (!property) {
            return;
        }

        // ponytail: a player outside the radius when the sound starts never hears it, even walking in.
        // Starting it muted instead would pop the audio player open for every player on the map.
        const volume = this.volumeFor(property, entity);
        if (volume <= 0) {
            return;
        }
        this.playing = this.playLocally(property.audioLink, volume)
            ? { entity, property, file: get(audioManagerFileStore) }
            : undefined;
    }

    /**
     * Outside the radius the sound is not heard at all, and inside it fades linearly with the
     * distance. Without a radius the sound carries across the whole map.
     */
    private volumeFor(property: PlayAudioPropertyData, entity: Entity): number {
        const volume = property.volume ?? 1;
        if (property.audibleRadius === undefined) {
            return volume;
        }

        const player = { x: this.scene.CurrentPlayer.x, y: this.scene.CurrentPlayer.y };
        const distance = MathUtils.distanceBetweenPointAndRectangle(player, entity.getActivationRectangle());
        return volume * Math.max(0, 1 - distance / property.audibleRadius);
    }

    private playLocally(audioLink: string, volume: number): boolean {
        if (localUserStore.getBlockAudio()) {
            audioManagerVisibilityStore.set("disabledBySettings");
            return false;
        }

        audioManagerFileStore.playAudio(audioLink, this.scene.getMapUrl(), volume, false);
        audioManagerVisibilityStore.set("visible");
        return true;
    }
}
