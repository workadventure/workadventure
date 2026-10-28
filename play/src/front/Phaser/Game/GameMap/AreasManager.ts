import { get } from "svelte/store";
import type { Unsubscriber } from "svelte/store";
import type {
    AreaData,
    AtLeast,
    GameMapAreas,
    LockableAreaPropertyData,
    MaxUsersInAreaPropertyData,
} from "@workadventure/map-editor";
import { AreaPermissions } from "@workadventure/map-editor";
import { Area } from "../../Entity/Area";
import type { GameScene } from "../GameScene";
import { mapEditorActivatedForThematics } from "../../../Stores/MenuStore";
import { localUserStore } from "../../../Connection/LocalUserStore";
import { personalAreaDataStore } from "../../../Stores/PersonalDeskStore";
import { areaPropertyVariablesManagerStore } from "../../../Stores/AreaPropertyVariablesStore";

/**
 * This class handles the display
 * of Phaser Areas objects
 */
export class AreasManager {
    private areas = new Map<string, Area>();
    private areaPermissions: AreaPermissions;
    private areaPropertyVariablesSubscription: Unsubscriber | undefined;
    private variableChangesSubscription: Unsubscriber | undefined;
    // Locked areas the current player may enter once, because someone inside invited them (see grantLockPass).
    private lockPassAreaIds = new Set<string>();
    private lockPassTimeout: ReturnType<typeof setTimeout> | undefined;

    constructor(
        private scene: GameScene,
        private gameMapAreas: GameMapAreas,
        private userConnectedTags: string[],
        private userCanEdit: boolean,
        private _personalAreaDataStore = personalAreaDataStore,
        private onCollisionStateChanged?: () => void,
    ) {
        this.areaPermissions = new AreaPermissions(gameMapAreas, userConnectedTags, userCanEdit);
        this.initializeAreas();
        this.subscribeToAreaPropertyVariableChanges();
    }

    /**
     * Subscribe to area property variable changes to update collisions.
     */
    private subscribeToAreaPropertyVariableChanges(): void {
        // Subscribe to the manager store to handle cases where the manager is set later
        this.areaPropertyVariablesSubscription = areaPropertyVariablesManagerStore.subscribe((manager) => {
            // Clean up previous subscription if any
            if (this.variableChangesSubscription) {
                this.variableChangesSubscription();
                this.variableChangesSubscription = undefined;
            }

            if (!manager) {
                return;
            }

            // Subscribe to variable changes and update collision when relevant area variables change
            this.variableChangesSubscription = manager.variableChanges.subscribe((change) => {
                if (!change || (change.key !== "lock" && change.key !== "maxUsersReached")) {
                    return;
                }

                // Update collision for the affected area
                this.updateAreaCollision(change.areaId);
            });
        });
    }

    public addArea(areaData: AreaData): void {
        this.areas.set(
            areaData.id,
            new Area(this.scene, areaData, this.areaPermissions.isOverlappingArea(areaData.id), undefined, this),
        );
        this.updateMapEditorOptionForSpecificAreas();

        this.onCollisionStateChanged?.();
    }

    public updateArea(updatedArea: AtLeast<AreaData, "id">): void {
        const areaToUpdate = this.areas.get(updatedArea.id);
        if (!areaToUpdate) {
            console.error("Unable to find area to update : ", updatedArea.id);
            return;
        }
        areaToUpdate.updateArea(updatedArea);
        this.updateMapEditorOptionForSpecificAreas();

        const userUUID = localUserStore.getLocalUser()?.uuid;
        const personalAreaData = get(this._personalAreaDataStore);

        if (!personalAreaData || personalAreaData.id !== updatedArea.id) {
            this.onCollisionStateChanged?.();
            return;
        }

        if (userUUID && !this.gameMapAreas.isAreaOwner(areaToUpdate.areaData, userUUID)) {
            this._personalAreaDataStore.set(null);
        }

        this.onCollisionStateChanged?.();
    }

    public removeArea(deletedAreaId: string): void {
        const areaToRemove = this.areas.get(deletedAreaId);
        if (!areaToRemove) {
            console.error("Unable to find area to remove : ", deletedAreaId);
            return;
        }
        areaToRemove.destroy();
        this.areas.delete(deletedAreaId);
        this.updateMapEditorOptionForSpecificAreas();
        this.onCollisionStateChanged?.();
    }

    private initializeAreas() {
        const gameMapAreas = this.gameMapAreas.getAreas();
        const userUUID = localUserStore.getLocalUser()?.uuid;
        gameMapAreas.forEach((areaData) => {
            if (userUUID && this.gameMapAreas.isAreaOwner(areaData, userUUID)) {
                this._personalAreaDataStore.set(areaData);
            }
            this.areas.set(
                areaData.id,
                new Area(this.scene, areaData, this.areaPermissions.isOverlappingArea(areaData.id), undefined, this),
            );
        });
        this.updateMapEditorOptionForSpecificAreas();
    }

    private updateMapEditorOptionForSpecificAreas() {
        const userId = localUserStore.getLocalUser()?.uuid;
        const userTags = this.scene.connection?.getAllTags() ?? [];
        const isGameMapHasSpecificAreas = this.gameMapAreas.isGameMapContainsSpecificAreas(userId, userTags);
        mapEditorActivatedForThematics.set(isGameMapHasSpecificAreas);
    }

    public getAreaById(areaId: string): Area | undefined {
        return this.areas.get(areaId);
    }

    public getAreasByPropertyType(propertyType: string): Area[] {
        return Array.from(this.areas.values()).reduce((areas, area) => {
            const areaFound = area.areaData.properties.find((property) => property.type === propertyType);
            if (areaFound) {
                areas.push(area);
            }
            return areas;
        }, [] as Area[]);
    }

    /**
     * Returns the list of all areas that should collide for the current player.
     *
     * Note: this must stay aligned with the physical collider applied on each Area (see Area.applyCollider), which
     * is based on shouldAreaCollide() too. Otherwise, a pathfinding move (right click, "walk to" / "talk to", the
     * scripting API...) would compute a path going through an area the player cannot walk into with the keyboard.
     * Users allowed to edit the map are already granted access by AreaPermissions.isUserHasAreaAccess(), so they
     * never collide because of missing rights, but they are still stopped by locks and by full areas.
     */
    public getCollidingAreas(): AreaData[] {
        return Array.from(this.gameMapAreas.getAreas().values()).filter((area) => this.shouldAreaCollide(area.id));
    }

    /**
     * Checks if the current player is inside the specified area.
     * @param areaId - The ID of the area to check
     * @returns true if the current player is inside the area, false otherwise
     */
    public isCurrentPlayerInArea(areaId: string): boolean {
        if (!this.scene.CurrentPlayer) {
            return false;
        }
        return this.gameMapAreas.isPlayerInsideArea(areaId, {
            x: this.scene.CurrentPlayer.x,
            y: this.scene.CurrentPlayer.y,
        });
    }

    /**
     * Lets the current player into the locked areas at this position, where the person who invited them stands.
     * The pass works once (it is used up when the player enters) and only for durationMs. The back opens the locked
     * bubble the same way (see User.lockPass). Areas the player has no access to, or full ones, still block them.
     */
    public grantLockPass(position: { x: number; y: number }, durationMs: number): void {
        this.revokeLockPass();
        for (const area of this.gameMapAreas.getAreas().values()) {
            if (
                area.properties.some((property) => property.type === "lockableAreaPropertyData") &&
                this.gameMapAreas.isPlayerInsideArea(area.id, position)
            ) {
                this.lockPassAreaIds.add(area.id);
            }
        }
        this.updateAreasCollision([...this.lockPassAreaIds]);
        this.lockPassTimeout = setTimeout(() => this.revokeLockPass(), durationMs);
    }

    private revokeLockPass(): void {
        clearTimeout(this.lockPassTimeout);
        const areaIds = [...this.lockPassAreaIds];
        this.lockPassAreaIds.clear();
        this.updateAreasCollision(areaIds);
    }

    /**
     * Checks if the specified area is locked.
     * @param areaId - The ID of the area to check
     * @returns true if the area is locked, false otherwise
     */
    private isAreaLocked(areaId: string): boolean {
        if (this.lockPassAreaIds.has(areaId)) {
            return false;
        }
        const area = this.gameMapAreas.getArea(areaId);
        if (!area) {
            return false;
        }

        const lockableProperty = area.properties.find(
            (property): property is LockableAreaPropertyData => property.type === "lockableAreaPropertyData",
        );

        if (!lockableProperty) {
            return false;
        }

        // Get lock state from area property variables
        const manager = get(areaPropertyVariablesManagerStore);
        if (!manager) {
            return false;
        }

        const lockState = manager.getVariable(areaId, lockableProperty.id, "lock");
        return lockState === true;
    }

    /**
     * Checks if the maxUsersReached state is set for the specified area.
     * Returns undefined when the variable has not been initialized yet.
     */
    private isAreaMaxUsersReached(areaId: string): boolean | undefined {
        const area = this.gameMapAreas.getArea(areaId);
        if (!area) {
            return false;
        }

        const maxUsersProperty = area.properties.find(
            (property): property is MaxUsersInAreaPropertyData => property.type === "maxUsersInAreaPropertyData",
        );
        if (!maxUsersProperty) {
            return false;
        }

        const manager = get(areaPropertyVariablesManagerStore);
        if (!manager) {
            return undefined;
        }

        const maxUsersReachedState = manager.getVariable(areaId, maxUsersProperty.id, "maxUsersReached");
        if (maxUsersReachedState === true || maxUsersReachedState === false) {
            return maxUsersReachedState;
        }

        return undefined;
    }

    /**
     * Checks if there are too many users in the specified area.
     * @param areaId - The ID of the area to check
     * @returns true if maxUsersReached is true for the area, false otherwise
     */
    public hasTooManyUsersInArea(areaId: string): boolean {
        const maxUsersReached = this.isAreaMaxUsersReached(areaId);
        return maxUsersReached === true;
    }

    /**
     * Updates the collision state for a specific area.
     * @param areaId - The ID of the area to update
     */
    public updateAreaCollision(areaId: string): void {
        const area = this.getAreaById(areaId);
        if (!area) {
            console.warn(`[AreasManager] Cannot update collision for area ${areaId}: area not found`);
            return;
        }

        // Check if current player is already inside the area
        const isCurrentPlayerInside = this.isCurrentPlayerInArea(areaId);
        // The lock pass is used up once the player is in: when they leave, the lock applies to them again.
        if (isCurrentPlayerInside) {
            this.lockPassAreaIds.delete(areaId);
        }

        // Check if area is locked
        const isLocked = this.isAreaLocked(areaId);
        area.updateArea(area.areaData);
        // If area is locked (unlock when empty is handled by the back on user leave)
        if (isLocked) {
            // If area is locked and current player is not inside, block entry
            // Users already inside can still exit
            // Lock takes priority over access permissions
            if (!isCurrentPlayerInside) {
                if (area.updateCollision(true)) {
                    this.onCollisionStateChanged?.();
                }
                return;
            }
        }

        // If current player is already inside the area, don't activate collide for them
        // This avoids showing error message to people already inside when area becomes blocked
        // But still block new entrants if area is full
        const shouldCollide = this.shouldAreaCollide(areaId) && !isCurrentPlayerInside;

        // Update the area with the new collision state
        if (area.updateCollision(shouldCollide)) {
            this.onCollisionStateChanged?.();
        }
    }

    /**
     * Flashes the area with the same red highlight used when colliding with a locked zone.
     * Use after the user locks a zone to give visual confirmation of which area was locked.
     * @param areaId - The ID of the area to highlight
     * @param duration - Duration of the fade-out in milliseconds (default: 800ms)
     */
    public flashAreaAsLocked(areaId: string, duration = 800): void {
        const area = this.getAreaById(areaId);
        if (!area) {
            return;
        }
        area.flashBlockedArea(duration);
    }

    /**
     * Updates collision states for multiple areas at once.
     * @param areaIds - Array of area IDs to update
     */
    public updateAreasCollision(areaIds: string[]): void {
        for (const areaId of areaIds) {
            this.updateAreaCollision(areaId);
        }
    }

    /**
     * Gets the reason why an area is blocked (if it is blocked).
     * @param areaId - The ID of the area to check
     * @returns The reason for blocking: "locked", "maxUsers", "noAccess", or null if not blocked
     */
    public getAreaBlockReason(areaId: string): "locked" | "maxUsers" | "noAccess" | null {
        const hasAccess = this.areaPermissions.isUserHasAreaAccess(areaId);

        // Check if current player is already inside the area
        const isCurrentPlayerInside = this.isCurrentPlayerInArea(areaId);

        // Check if area is locked
        const isLocked = this.isAreaLocked(areaId);

        // If area is locked and current player is not inside, block entry
        // Lock takes priority over access permissions
        if (isLocked && !isCurrentPlayerInside) {
            return "locked";
        }

        const hasTooManyUsers = this.hasTooManyUsersInArea(areaId);
        if (hasTooManyUsers && !isCurrentPlayerInside) {
            return "maxUsers";
        }

        if (!hasAccess) {
            return "noAccess";
        }

        return null;
    }

    /**
     * Checks if an area should collide based on current state.
     * @param areaId - The ID of the area to check
     * @returns true if the area should collide, false otherwise
     */
    public shouldAreaCollide(areaId: string): boolean {
        return this.getAreaBlockReason(areaId) !== null;
    }

    /**
     * Cleans up all subscriptions and resources.
     * Must be called when the AreasManager is no longer needed to prevent memory leaks.
     */
    public destroy(): void {
        clearTimeout(this.lockPassTimeout);
        // Unsubscribe from variable changes first (inner subscription)
        if (this.variableChangesSubscription) {
            this.variableChangesSubscription();
            this.variableChangesSubscription = undefined;
        }

        // Unsubscribe from the manager store (outer subscription)
        if (this.areaPropertyVariablesSubscription) {
            this.areaPropertyVariablesSubscription();
            this.areaPropertyVariablesSubscription = undefined;
        }

        // Destroy all Area objects
        for (const area of this.areas.values()) {
            area.destroy();
        }
        this.areas.clear();
    }
}
