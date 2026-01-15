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
import {
    areaPropertyVariablesManagerStore,
    setAreaPropertyLockState,
} from "../../../Stores/AreaPropertyVariablesStore";

/**
 * This class handles the display
 * of Phaser Areas objects
 */
export class AreasManager {
    private areas = new Map<string, Area>();
    private areaPermissions: AreaPermissions;
    private areaPropertyVariablesSubscription: Unsubscriber | undefined;
    private variableChangesSubscription: Unsubscriber | undefined;

    constructor(
        private scene: GameScene,
        private gameMapAreas: GameMapAreas,
        private userConnectedTags: string[],
        private userCanEdit: boolean,
        private _personalAreaDataStore = personalAreaDataStore
    ) {
        this.areaPermissions = new AreaPermissions(gameMapAreas, userConnectedTags, userCanEdit);
        this.initializeAreas();
        this.subscribeToLockStateChanges();
    }

    /**
     * Subscribe to lock state changes from area property variables to update collisions.
     */
    private subscribeToLockStateChanges(): void {
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

            // Subscribe to variable changes and update collision when lock state changes
            this.variableChangesSubscription = manager.variableChanges.subscribe((change) => {
                if (!change || change.key !== "lock") {
                    return;
                }

                // Update collision for the affected area
                this.updateAreaCollision(change.areaId);
            });
        });
    }

    public addArea(areaData: AreaData): void {
        const hasTooManyUsers = this.hasTooManyUsersInArea(areaData.id);
        const isLocked = this.isAreaLocked(areaData.id);
        const shouldCollide = !this.areaPermissions.isUserHasAreaAccess(areaData.id) || hasTooManyUsers || isLocked;
        this.areas.set(
            areaData.id,
            new Area(
                this.scene,
                areaData,
                shouldCollide,
                this.areaPermissions.isOverlappingArea(areaData.id),
                undefined,
                this
            )
        );
        this.updateMapEditorOptionForSpecificAreas();

        // Update viewport if area has maxUsersInAreaPropertyData
        if (this.hasMaxUsersInAreaProperty(areaData)) {
            this.scene.sendViewportToServer();
        }
    }

    public updateArea(updatedArea: AtLeast<AreaData, "id">): void {
        const areaToUpdate = this.areas.get(updatedArea.id);
        if (!areaToUpdate) {
            console.error("Unable to find area to update : ", updatedArea.id);
            return;
        }
        const oldAreaHasMaxUsersProperty = this.hasMaxUsersInAreaProperty(areaToUpdate.areaData);
        const hasTooManyUsers = this.hasTooManyUsersInArea(updatedArea.id);
        const isLocked = this.isAreaLocked(updatedArea.id);
        const shouldCollide = !this.areaPermissions.isUserHasAreaAccess(updatedArea.id) || hasTooManyUsers || isLocked;
        areaToUpdate.updateArea(updatedArea, shouldCollide);
        this.updateMapEditorOptionForSpecificAreas();

        // Update viewport if maxUsersInAreaPropertyData was added, removed, or area position/size changed
        const newAreaHasMaxUsersProperty = this.hasMaxUsersInAreaProperty(updatedArea);
        if (
            oldAreaHasMaxUsersProperty !== newAreaHasMaxUsersProperty ||
            (newAreaHasMaxUsersProperty && this.hasAreaPositionOrSizeChanged(areaToUpdate.areaData, updatedArea))
        ) {
            this.scene.sendViewportToServer();
        }

        const userUUID = localUserStore.getLocalUser()?.uuid;
        const personalAreaData = get(this._personalAreaDataStore);

        if (!personalAreaData || personalAreaData.id !== updatedArea.id) {
            return;
        }

        if (userUUID && !this.gameMapAreas.isAreaOwner(areaToUpdate.areaData, userUUID)) {
            this._personalAreaDataStore.set(null);
        }
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
    }

    private initializeAreas() {
        const gameMapAreas = this.gameMapAreas.getAreas();
        const userUUID = localUserStore.getLocalUser()?.uuid;
        gameMapAreas.forEach((areaData) => {
            if (userUUID && this.gameMapAreas.isAreaOwner(areaData, userUUID)) {
                this._personalAreaDataStore.set(areaData);
            }
            const hasTooManyUsers = this.hasTooManyUsersInArea(areaData.id);
            const isLocked = this.isAreaLocked(areaData.id);
            const shouldCollide = !this.areaPermissions.isUserHasAreaAccess(areaData.id) || hasTooManyUsers || isLocked;

            this.areas.set(
                areaData.id,
                new Area(
                    this.scene,
                    areaData,
                    shouldCollide,
                    this.areaPermissions.isOverlappingArea(areaData.id),
                    undefined,
                    this
                )
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
     * Returns the list of all areas that the user has no access to.
     */
    public getCollidingAreas(): AreaData[] {
        if (this.userCanEdit) {
            return [];
        }
        return this.gameMapAreas.getCollidingAreas(this.userConnectedTags);
    }

    /**
     * Counts the number of users currently inside the specified area.
     * @param areaId - The ID of the area to check
     * @returns The number of users inside the area
     */
    public getUsersCountInArea(areaId: string): number {
        let count = 0;

        // Check current player position
        if (this.scene.CurrentPlayer) {
            const currentPlayerPosition = {
                x: this.scene.CurrentPlayer.x,
                y: this.scene.CurrentPlayer.y,
            };
            if (this.gameMapAreas.isPlayerInsideArea(areaId, currentPlayerPosition)) {
                count++;
            }
        }

        // Check remote players positions
        const remotePlayers = this.scene.getRemotePlayersRepository().getPlayers();
        for (const player of remotePlayers.values()) {
            if (player.position) {
                const playerPosition = {
                    x: player.position.x,
                    y: player.position.y,
                };
                if (this.gameMapAreas.isPlayerInsideArea(areaId, playerPosition)) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * Gets the max users limit for the specified area from its properties.
     * @param areaId - The ID of the area to check
     * @returns The max users limit or null if not defined (no limit)
     */
    private getMaxUsersInArea(areaId: string): number | null {
        const area = this.gameMapAreas.getArea(areaId);
        if (!area) {
            return null;
        }

        const maxUsersProperty = area.properties.find(
            (property): property is MaxUsersInAreaPropertyData => property.type === "maxUsersInAreaPropertyData"
        );

        if (!maxUsersProperty || maxUsersProperty.maxUsers === null || maxUsersProperty.maxUsers === undefined) {
            return null;
        }

        return maxUsersProperty.maxUsers;
    }

    /**
     * Checks if the specified area is locked.
     * @param areaId - The ID of the area to check
     * @returns true if the area is locked, false otherwise
     */
    private isAreaLocked(areaId: string): boolean {
        const area = this.gameMapAreas.getArea(areaId);
        if (!area) {
            return false;
        }

        const lockableProperty = area.properties.find(
            (property): property is LockableAreaPropertyData => property.type === "lockableAreaPropertyData"
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
     * Unlocks an area if it becomes empty (no users inside).
     * This is called automatically when a locked area becomes empty.
     * @param areaId - The ID of the area to unlock
     */
    private unlockAreaIfEmpty(areaId: string): void {
        const area = this.gameMapAreas.getArea(areaId);
        if (!area) {
            return;
        }

        const lockableProperty = area.properties.find(
            (property): property is LockableAreaPropertyData => property.type === "lockableAreaPropertyData"
        );

        if (!lockableProperty) {
            return;
        }

        // Get lock state from area property variables
        const manager = get(areaPropertyVariablesManagerStore);
        if (!manager) {
            return;
        }

        const isLocked = manager.getVariable(areaId, lockableProperty.id, "lock");
        if (isLocked !== true) {
            return;
        }

        // Area is locked and empty, unlock it automatically using area property variables
        setAreaPropertyLockState(areaId, lockableProperty.id, false);
    }

    /**
     * Checks if there are too many users in the specified area.
     * @param areaId - The ID of the area to check
     * @returns true if the number of users in the area exceeds the max limit (from property), false if no limit
     */
    public hasTooManyUsersInArea(areaId: string): boolean {
        const maxUsers = this.getMaxUsersInArea(areaId);
        // If no limit is set, area is never full
        if (maxUsers === null) {
            return false;
        }

        const usersCount = this.getUsersCountInArea(areaId);

        return usersCount >= maxUsers;
    }

    /**
     * Counts the number of users currently inside the specified area, excluding the current player.
     * @param areaId - The ID of the area to check
     * @returns The number of users inside the area (excluding current player)
     */
    public getOtherUsersCountInArea(areaId: string): number {
        let count = 0;

        // Only check remote players positions (exclude current player)
        const remotePlayers = this.scene.getRemotePlayersRepository().getPlayers();
        for (const player of remotePlayers.values()) {
            if (player.position) {
                const playerPosition = {
                    x: player.position.x,
                    y: player.position.y,
                };
                if (this.gameMapAreas.isPlayerInsideArea(areaId, playerPosition)) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * Updates the collision state for a specific area based on current user count.
     * @param areaId - The ID of the area to update
     */
    public updateAreaCollision(areaId: string): void {
        const area = this.getAreaById(areaId);
        if (!area) {
            console.warn(`[AreasManager] Cannot update collision for area ${areaId}: area not found`);
            return;
        }

        const hasAccess = this.areaPermissions.isUserHasAreaAccess(areaId);

        // Check if current player is already inside the area
        const isCurrentPlayerInside = this.scene.CurrentPlayer
            ? this.gameMapAreas.isPlayerInsideArea(areaId, {
                  x: this.scene.CurrentPlayer.x,
                  y: this.scene.CurrentPlayer.y,
              })
            : false;

        // Check if area is locked
        const isLocked = this.isAreaLocked(areaId);

        // If area is locked, check if it becomes empty and unlock it automatically
        if (isLocked) {
            const usersCount = this.getUsersCountInArea(areaId);
            if (usersCount === 0) {
                // Area is now empty, unlock it automatically
                this.unlockAreaIfEmpty(areaId);
            }

            // If area is locked and current player is not inside, block entry
            // Users already inside can still exit
            // Lock takes priority over access permissions
            if (!isCurrentPlayerInside) {
                const shouldCollide = true; // Lock blocks entry regardless of access
                area.updateArea(area.areaData, shouldCollide);
                return;
            }
        }

        // Count other users (excluding current player) to determine if area is full
        const otherUsersCount = this.getOtherUsersCountInArea(areaId);
        const maxUsers = this.getMaxUsersInArea(areaId);

        // If no limit is set, area is never full (no collision based on user count)
        // If current player is inside, they don't count toward the limit for blocking themselves
        // If current player is NOT inside, check if area is already at capacity
        // Block if other users already reached maxUsers (no space left for current player)
        const wouldExceedLimit = maxUsers !== null && otherUsersCount >= maxUsers;

        // If current player is already inside the area, don't activate collide for them
        // This avoids showing error message to people already inside when area becomes blocked
        // But still block new entrants if area is full
        const shouldCollide = !hasAccess || (wouldExceedLimit && !isCurrentPlayerInside);

        // Update the area with the new collision state
        area.updateArea(area.areaData, shouldCollide);
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
     * Checks if an area has the maxUsersInAreaPropertyData property.
     * @param areaData - The area data to check
     * @returns true if the area has the property, false otherwise
     */
    private hasMaxUsersInAreaProperty(areaData: AreaData | AtLeast<AreaData, "id">): boolean {
        if (!areaData.properties) {
            return false;
        }
        return areaData.properties.some((property) => property.type === "maxUsersInAreaPropertyData");
    }

    /**
     * Checks if an area's position or size has changed.
     * @param oldArea - The old area data
     * @param newArea - The new area data
     * @returns true if position or size changed, false otherwise
     */
    private hasAreaPositionOrSizeChanged(oldArea: AreaData, newArea: AtLeast<AreaData, "id">): boolean {
        return (
            oldArea.x !== newArea.x ||
            oldArea.y !== newArea.y ||
            oldArea.width !== newArea.width ||
            oldArea.height !== newArea.height
        );
    }

    /**
     * Gets the reason why an area is blocked (if it is blocked).
     * @param areaId - The ID of the area to check
     * @returns The reason for blocking: "locked", "maxUsers", "noAccess", or null if not blocked
     */
    public getAreaBlockReason(areaId: string): "locked" | "maxUsers" | "noAccess" | null {
        const hasAccess = this.areaPermissions.isUserHasAreaAccess(areaId);

        // Check if current player is already inside the area
        const isCurrentPlayerInside = this.scene.CurrentPlayer
            ? this.gameMapAreas.isPlayerInsideArea(areaId, {
                  x: this.scene.CurrentPlayer.x,
                  y: this.scene.CurrentPlayer.y,
              })
            : false;

        // Check if area is locked
        const isLocked = this.isAreaLocked(areaId);

        // If area is locked and current player is not inside, block entry
        // Lock takes priority over access permissions
        if (isLocked && !isCurrentPlayerInside) {
            return "locked";
        }

        // Count other users (excluding current player) to determine if area is full
        const otherUsersCount = this.getOtherUsersCountInArea(areaId);
        const maxUsers = this.getMaxUsersInArea(areaId);

        // If no limit is set, area is never full (no collision based on user count)
        // Block if other users already reached maxUsers (no space left for current player)
        const wouldExceedLimit = maxUsers !== null && otherUsersCount >= maxUsers;

        if (wouldExceedLimit && !isCurrentPlayerInside) {
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
}
