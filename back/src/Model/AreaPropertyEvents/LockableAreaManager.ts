import type { Subscription } from "rxjs";
import type { AreaData } from "@workadventure/map-editor";
import type { GameRoom } from "../GameRoom";
import type { AreaZoneTracker } from "../AreaZoneTracker";

/**
 * The goal of this class is to listen to all the lockable areas in a GameRoom and to set the variable associated
 * to the lockable area to false as soon as the area is empty.
 */
export class LockableAreaManager {
    private enterSubscription: Subscription | undefined;
    private leaveSubscription: Subscription | undefined;
    private readonly usersInArea = new Map<string, number>();

    constructor(private gameRoom: GameRoom, private areaZoneTracker: AreaZoneTracker) {
        this.enterSubscription = this.areaZoneTracker
            .registerEventListener("enter", "lockableAreaPropertyData")
            .subscribe((area) => {
                this.handleAreaOccupancyChange(area, 1);
            });

        this.leaveSubscription = this.areaZoneTracker
            .registerEventListener("leave", "lockableAreaPropertyData")
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

        if (delta === -1 && updatedUsersInArea === 0) {
            // Let's look for the "lockableAreaPropertyData" property of the area and set its "lock" variable to false.
            const property = area.properties.find((p) => p.type === "lockableAreaPropertyData");
            if (!property) {
                return;
            }

            this.gameRoom.setAreaPropertyVariable(area.id, property.id, "lock", "false");
        }
    }
}
