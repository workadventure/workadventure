import { MathUtils } from "@workadventure/math-utils";
import { get } from "svelte/store";
import { isOutlineable } from "../../Utils/CustomTypeGuards";
import type { Player } from "../Player/Player";
import LL from "../../../i18n/i18n-svelte";
import { isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
import { RemotePlayer } from "../Entity/RemotePlayer";
import { Entity } from "../ECS/Entity";
import type { ActivatableInterface } from "./ActivatableInterface";

export class ActivatablesManager {
    // The item that can be selected by pressing the space key.
    private selectedActivatableObjectByDistance?: ActivatableInterface;
    private selectedActivatableObjectByPointer?: ActivatableInterface;
    private activatableObjectsDistances: Map<ActivatableInterface, number> = new Map<ActivatableInterface, number>();

    private currentPlayer: Player;

    private canSelectByDistance = true;

    private readonly outlineColor = 0xf9e81e;
    private readonly directionalActivationPositionShift = 50;

    constructor(currentPlayer: Player) {
        this.currentPlayer = currentPlayer;
    }

    public handlePointerOverActivatableObject(object: ActivatableInterface): void {
        if (this.selectedActivatableObjectByPointer === object) {
            return;
        }
        if (isOutlineable(this.selectedActivatableObjectByDistance)) {
            this.selectedActivatableObjectByDistance?.characterFarAwayOutline();
        }
        if (isOutlineable(this.selectedActivatableObjectByPointer)) {
            this.selectedActivatableObjectByPointer?.pointerOutOutline();
        }
        this.selectedActivatableObjectByPointer = object;
        if (isOutlineable(this.selectedActivatableObjectByPointer)) {
            this.selectedActivatableObjectByPointer?.pointerOverOutline(this.outlineColor);
        }
    }

    public handlePointerOutActivatableObject(): void {
        if (isOutlineable(this.selectedActivatableObjectByPointer)) {
            this.selectedActivatableObjectByPointer?.pointerOutOutline();
        }
        this.selectedActivatableObjectByPointer = undefined;
        if (isOutlineable(this.selectedActivatableObjectByDistance)) {
            this.selectedActivatableObjectByDistance?.characterCloseByOutline(this.outlineColor);
        }
    }

    public handlePointerDownEvent(object: ActivatableInterface): void {
        // Let's consider a pointer down is like an over (for mobile)
        this.handlePointerOverActivatableObject(object);
        object.activate();
    }

    public deactivateSelectedObject(): void {
        this.selectedActivatableObjectByPointer?.deactivate();
        this.selectedActivatableObjectByDistance?.deactivate();
    }

    public getSelectedActivatableObject(): ActivatableInterface | undefined {
        return this.selectedActivatableObjectByPointer ?? this.selectedActivatableObjectByDistance;
    }

    public deduceSelectedActivatableObjectByDistance(): void {
        if (!this.canSelectByDistance) {
            return;
        }
        const newNearestObject = this.findNearestActivatableObject();
        if (this.selectedActivatableObjectByDistance === newNearestObject) {
            return;
        }
        // update value but do not change the outline
        if (this.selectedActivatableObjectByPointer) {
            this.selectedActivatableObjectByDistance = newNearestObject;
            return;
        }
        if (isOutlineable(this.selectedActivatableObjectByDistance)) {
            this.selectedActivatableObjectByDistance?.characterFarAwayOutline();
            this.selectedActivatableObjectByDistance.destroyText("object");
        }
        this.selectedActivatableObjectByDistance = newNearestObject;
        if (isOutlineable(this.selectedActivatableObjectByDistance)) {
            this.selectedActivatableObjectByDistance?.characterCloseByOutline(this.outlineColor);
            if (this.selectedActivatableObjectByDistance instanceof RemotePlayer == false) {
                // TODO: improve this to show multiple trigger messages
                let triggerMessage: string = isMediaBreakpointUp("md")
                    ? get(LL).trigger.mobile.object()
                    : get(LL).trigger.object();
                if (this.selectedActivatableObjectByDistance instanceof Entity) {
                    for (const property of this.selectedActivatableObjectByDistance.getEntityData().properties) {
                        if (property.type === "entityDescriptionProperties") continue;
                        if (property.triggerMessage) {
                            triggerMessage = property.triggerMessage;
                            break;
                        }
                    }
                }
                this.selectedActivatableObjectByDistance.destroyText("object");
                this.selectedActivatableObjectByDistance.playText("object", triggerMessage, 10000, () => {
                    this.currentPlayer.scene.userInputManager.handleActivableEntity();
                });
            }
        }
    }

    public updateActivatableObjectsDistances(objects: ActivatableInterface[]): void {
        const playerRect = this.currentPlayer.getCollisionRectangle();
        this.activatableObjectsDistances.clear();
        for (const object of objects) {
            let distance: number;
            if (object instanceof Entity) {
                // Use rectangle-based distance calculation for entities
                const entityRect = object.getActivationRectangle();
                distance = MathUtils.distanceBetweenRectangles(playerRect, entityRect);
            } else {
                // Fallback to point-based distance for other activatable objects (like RemotePlayer)
                const currentPlayerPos = this.currentPlayer.getDirectionalActivationPosition(0);
                distance = MathUtils.distanceBetween(currentPlayerPos, object.getPosition());
            }
            this.activatableObjectsDistances.set(object, distance);
        }
    }

    public updateDistanceForSingleActivatableObject(object: ActivatableInterface): void {
        const playerRect = this.currentPlayer.getCollisionRectangle();
        let distance: number;
        if (object instanceof Entity) {
            // Use rectangle-based distance calculation for entities
            const entityRect = object.getActivationRectangle();
            distance = MathUtils.distanceBetweenRectangles(playerRect, entityRect);
        } else {
            // Fallback to point-based distance for other activatable objects
            distance = MathUtils.distanceBetween(
                this.currentPlayer.getDirectionalActivationPosition(this.directionalActivationPositionShift),
                object.getPosition()
            );
        }
        this.activatableObjectsDistances.set(object, distance);
    }

    public disableSelectingByDistance(): void {
        this.canSelectByDistance = false;
        if (isOutlineable(this.selectedActivatableObjectByDistance)) {
            this.selectedActivatableObjectByDistance?.characterFarAwayOutline();
            // destroy text if it exists
            this.selectedActivatableObjectByDistance?.destroyText("object");
        }
        this.selectedActivatableObjectByDistance = undefined;
    }

    public enableSelectingByDistance(): void {
        this.canSelectByDistance = true;
    }

    private findNearestActivatableObject(): ActivatableInterface | undefined {
        let shortestDistance = Infinity;
        let closestObject: ActivatableInterface | undefined = undefined;

        for (const [object, distance] of this.activatableObjectsDistances.entries()) {
            // For rectangle-based detection, distance of 0 means rectangles overlap/touch
            // For point-based detection (fallback), we still check against activationRadius
            const isInRange =
                object instanceof Entity
                    ? distance === 0 // Rectangles overlap or touch
                    : object.activationRadius > distance; // Point-based check

            if (object.isActivatable() && isInRange && shortestDistance > distance) {
                shortestDistance = distance;
                closestObject = object;
            }
        }
        return closestObject;
    }

    public isSelectingByDistanceEnabled(): boolean {
        return this.canSelectByDistance;
    }
}
