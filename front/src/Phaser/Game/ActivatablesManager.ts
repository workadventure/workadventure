import { isOutlineable } from "../../Utils/CustomTypeGuards";
import { MathUtils } from "../../Utils/MathUtils";
import type { Player } from "../Player/Player";
import type { ActivatableInterface } from "./ActivatableInterface";

export class ActivatablesManager {
    // The item that can be selected by pressing the space key.
    private selectedActivatableObjectByDistance?: ActivatableInterface;
    private selectedActivatableObjectByPointer?: ActivatableInterface;
    private activatableObjectsDistances: Map<ActivatableInterface, number> = new Map<ActivatableInterface, number>();

    private currentPlayer: Player;

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
            this.selectedActivatableObjectByPointer?.pointerOverOutline();
        }
    }

    public handlePointerOutActivatableObject(): void {
        if (isOutlineable(this.selectedActivatableObjectByPointer)) {
            this.selectedActivatableObjectByPointer?.pointerOutOutline();
        }
        this.selectedActivatableObjectByPointer = undefined;
        if (isOutlineable(this.selectedActivatableObjectByDistance)) {
            this.selectedActivatableObjectByDistance?.characterCloseByOutline();
        }
    }

    public getSelectedActivatableObject(): ActivatableInterface | undefined {
        return this.selectedActivatableObjectByPointer ?? this.selectedActivatableObjectByDistance;
    }

    public deduceSelectedActivatableObjectByDistance(): void {
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
        }
        this.selectedActivatableObjectByDistance = newNearestObject;
        if (isOutlineable(this.selectedActivatableObjectByDistance)) {
            this.selectedActivatableObjectByDistance?.characterCloseByOutline();
        }
    }

    private findNearestActivatableObject(): ActivatableInterface | undefined {
        let shortestDistance: number = Infinity;
        let closestObject: ActivatableInterface | undefined = undefined;

        for (const [object, distance] of this.activatableObjectsDistances.entries()) {
            if (object.isActivatable() && object.activationRadius > distance && shortestDistance > distance) {
                shortestDistance = distance;
                closestObject = object;
            }
        }
        return closestObject;
    }
    public updateActivatableObjectsDistances(objects: ActivatableInterface[]): void {
        const currentPlayerPos = this.currentPlayer.getPosition();
        for (const object of objects) {
            const distance = MathUtils.distanceBetween(currentPlayerPos, object.getPosition());
            this.activatableObjectsDistances.set(object, distance);
        }
    }

    public updateDistanceForSingleActivatableObject(object: ActivatableInterface): void {
        this.activatableObjectsDistances.set(
            object,
            MathUtils.distanceBetween(this.currentPlayer.getPosition(), object.getPosition())
        );
    }
}
