import type { Subscription } from "rxjs";
import type { AreaData } from "@workadventure/map-editor";
import type { GameRoom } from "../GameRoom";
import type { AreaZoneTracker } from "../AreaZoneTracker";

/**
 * The goal of this class is to listen to areas with maxUsersInAreaPropertyData and keep the maxUsersReached
 * variable in sync with the number of users currently inside each area.
 */
export class MaxUsersInAreaManager {
    private enterSubscription: Subscription | undefined;
    private leaveSubscription: Subscription | undefined;
    private readonly usersInArea = new Map<string, number>();

    constructor(private gameRoom: GameRoom, private areaZoneTracker: AreaZoneTracker) {
        this.enterSubscription = this.areaZoneTracker
            .registerEventListener("enter", "maxUsersInAreaPropertyData")
            .subscribe((area) => {
                this.handleAreaOccupancyChange(area, 1);
            });

        this.leaveSubscription = this.areaZoneTracker
            .registerEventListener("leave", "maxUsersInAreaPropertyData")
            .subscribe((area) => {
                this.handleAreaOccupancyChange(area, -1);
            });

        // No need to unsubscribe since GameRoom.destroy completes this stream.
        // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
        this.gameRoom.destroyRoomStream.subscribe(() => {
            this.enterSubscription?.unsubscribe();
            this.leaveSubscription?.unsubscribe();
            this.enterSubscription = undefined;
            this.leaveSubscription = undefined;
            this.usersInArea.clear();
        });
    }

    private handleAreaOccupancyChange(area: AreaData, delta: 1 | -1): void {
        const previousUsersInArea = this.usersInArea.get(area.id) ?? 0;
        const updatedUsersInArea = Math.max(0, previousUsersInArea + delta);

        if (updatedUsersInArea === 0) {
            this.usersInArea.delete(area.id);
        } else {
            this.usersInArea.set(area.id, updatedUsersInArea);
        }

        const property = area.properties.find((p) => p.type === "maxUsersInAreaPropertyData");
        if (!property || property.maxUsers === undefined || property.maxUsers === null) {
            return;
        }

        if (
            delta === 1 &&
            updatedUsersInArea >= property.maxUsers &&
            this.gameRoom.getAreaPropertyVariable(area.id, property.id, "maxUsersReached") !== "true"
        ) {
            this.gameRoom.setAreaPropertyVariable(area.id, property.id, "maxUsersReached", "true");
        } else if (
            delta === -1 &&
            updatedUsersInArea <= property.maxUsers - 1 &&
            this.gameRoom.getAreaPropertyVariable(area.id, property.id, "maxUsersReached") !== "false"
        ) {
            this.gameRoom.setAreaPropertyVariable(area.id, property.id, "maxUsersReached", "false");
        }
    }
}
