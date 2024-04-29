/**
 * An actionable item represents an in-game object that can be activated using the space-bar.
 * It has coordinates and an "activation radius"
 */
import type OutlinePipelinePlugin from "phaser3-rex-plugins/plugins/outlinepipeline-plugin.js";
import type { GameScene } from "../Game/GameScene";
import type { ActivatableInterface } from "../Game/ActivatableInterface";
import { gameManager } from "../Game/GameManager";
import Sprite = Phaser.GameObjects.Sprite;

type EventCallback = (state: unknown, parameters: unknown) => void;

export class ActionableItem implements ActivatableInterface {
    private readonly activationRadiusSquared: number;
    private isSelectable = false;
    private callbacks: Map<string, Array<EventCallback>> = new Map<string, Array<EventCallback>>();

    public constructor(
        private id: number,
        private sprite: Sprite,
        private eventHandler: GameScene,
        public readonly activationRadius: number,
        private onActivateCallback: (item: ActionableItem) => void
    ) {
        this.activationRadiusSquared = activationRadius * activationRadius;

        gameManager
            .getCurrentGameScene()
            .getOutlineManager()
            .add(this.sprite, () => {
                return { thickness: 2, outlineColor: 0xf9e81e };
            });
    }

    public getId(): number {
        return this.id;
    }

    /**
     * Returns the square of the distance to the object center IF we are in item action range
     * OR null if we are out of range.
     */
    public actionableDistance(x: number, y: number): number | null {
        const distanceSquared = (x - this.sprite.x) * (x - this.sprite.x) + (y - this.sprite.y) * (y - this.sprite.y);
        if (distanceSquared < this.activationRadiusSquared) {
            return distanceSquared;
        } else {
            return null;
        }
    }

    public getPosition(): { x: number; y: number } {
        return { x: this.sprite.x, y: this.sprite.y };
    }

    /**
     * Show the outline of the sprite.
     */
    public selectable(): void {
        if (this.isSelectable) {
            return;
        }
        this.isSelectable = true;

        this.getOutlinePlugin()?.add(this.sprite, {
            thickness: 2,
            outlineColor: 0xf9e81e,
        });
    }

    /**
     * Hide the outline of the sprite
     */
    public notSelectable(): void {
        if (!this.isSelectable) {
            return;
        }
        this.isSelectable = false;
        this.getOutlinePlugin()?.remove(this.sprite);
    }

    private getOutlinePlugin(): OutlinePipelinePlugin | undefined {
        return this.sprite.scene.plugins.get("rexOutlinePipeline") as unknown as OutlinePipelinePlugin | undefined;
    }

    public isActivatable(): boolean {
        return this.isSelectable;
    }

    public activate(): void {
        this.onActivateCallback(this);
    }

    public deactivate(): void {}

    public emit(eventName: string, state: unknown, parameters: unknown = null): void {
        this.eventHandler.emitActionableEvent(this.id, eventName, state, parameters);
        // Also, execute the action locally.
        this.fire(eventName, state, parameters);
    }

    public on(eventName: string, callback: EventCallback): void {
        let callbacksArray: Array<EventCallback> | undefined = this.callbacks.get(eventName);
        if (callbacksArray === undefined) {
            callbacksArray = new Array<EventCallback>();
            this.callbacks.set(eventName, callbacksArray);
        }
        callbacksArray.push(callback);
    }

    public fire(eventName: string, state: unknown, parameters: unknown): void {
        const callbacksArray = this.callbacks.get(eventName);
        if (callbacksArray === undefined) {
            return;
        }
        for (const callback of callbacksArray) {
            callback(state, parameters);
        }
    }

    public playText(id: string, text: string, duration?: number, callback?: () => void): void {
        // TODO: Implement
    }

    public destroyText(id: string): void {
        // TODO: Implement
    }
}
