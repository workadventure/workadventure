import type { Subscription } from "rxjs";
import type { SpaceStateQuery, SpaceUser } from "@workadventure/messages";
import { FilterType } from "@workadventure/messages";
import type { SpaceState } from "@workadventure/shared-utils";
import type { SpaceStateHost } from "./SpaceStateHost";
import { isAdmin } from "./SpaceStateHost";

export type RaiseHandQuery = Extract<
    NonNullable<SpaceStateQuery["query"]>,
    { $case: "raiseHand" | "lowerHand" | "giveFloor" | "revokeFloor" }
>;

/**
 * Owns the `raisedHands` queue and the `floorHolders` list of a space's state.
 *
 * The queue is kept in the order hands were raised, which IS the order the front displays. `floorHolders` only
 * ever lists users who were GIVEN the floor after raising their hand, never the original speakers, so the host
 * panel can offer taking the floor back.
 */
export class RaiseHandManager {
    private readonly subscription: Subscription;

    constructor(private readonly space: SpaceStateHost) {
        // A user who leaves must not keep a ghost entry in the queue, nor in the host's "take back" panel.
        this.subscription = space.userRemoved$.subscribe((user) => {
            this.space.updateState((state) => {
                removeEntry(state.raisedHands, user.spaceUserId);
                removeEntry(state.floorHolders, user.spaceUserId);
            });
        });
    }

    public handleQuery(sender: SpaceUser, query: RaiseHandQuery): void {
        switch (query.$case) {
            case "raiseHand": {
                this.space.updateState((state) => {
                    if (!query.raiseHand.raised) {
                        removeEntry(state.raisedHands, sender.spaceUserId);
                    } else if (!state.raisedHands.some((entry) => entry.spaceUserId === sender.spaceUserId)) {
                        state.raisedHands.push({ spaceUserId: sender.spaceUserId, name: sender.name, at: Date.now() });
                    }
                });
                return;
            }
            case "lowerHand": {
                this.assertCanModerate(sender);
                this.space.updateState((state) => {
                    removeEntry(state.raisedHands, query.lowerHand.targetSpaceUserId);
                });
                return;
            }
            case "giveFloor": {
                this.assertCanModerate(sender);
                const target = this.getTarget(query.giveFloor.targetSpaceUserId);
                this.space.updateState((state) => {
                    removeEntry(state.raisedHands, target.spaceUserId);
                    // In a proximity (ALL_USERS) space everyone already speaks: there is no floor to hold.
                    if (
                        this.space.filterType !== FilterType.ALL_USERS &&
                        !state.floorHolders.some((entry) => entry.spaceUserId === target.spaceUserId)
                    ) {
                        state.floorHolders.push({ spaceUserId: target.spaceUserId, name: target.name });
                    }
                });
                return;
            }
            case "revokeFloor": {
                // A floor holder may always hand the floor back themselves.
                if (query.revokeFloor.targetSpaceUserId !== sender.spaceUserId) {
                    this.assertCanModerate(sender);
                }
                this.space.updateState((state) => {
                    removeEntry(state.floorHolders, query.revokeFloor.targetSpaceUserId);
                });
                return;
            }
            default: {
                const _exhaustiveCheck: never = query;
            }
        }
    }

    public destroy(): void {
        this.subscription.unsubscribe();
    }

    /**
     * Admins always moderate. In a proximity (ALL_USERS) space anyone may: whoever leads the discussion hands the
     * floor around. In a broadcast space only speakers may, and not a guest who was only given the floor.
     */
    private assertCanModerate(sender: SpaceUser): void {
        if (isAdmin(sender) || this.space.filterType === FilterType.ALL_USERS) {
            return;
        }
        const isPromotedGuest = this.space
            .getState()
            .floorHolders.some((entry) => entry.spaceUserId === sender.spaceUserId);
        if (sender.megaphoneState && !isPromotedGuest) {
            return;
        }
        throw new Error("Only a speaker or an admin can manage the floor");
    }

    private getTarget(spaceUserId: string): SpaceUser {
        const target = this.space.getUser(spaceUserId);
        if (!target) {
            throw new Error(`User ${spaceUserId} is not in the space`);
        }
        return target;
    }
}

function removeEntry(list: SpaceState["raisedHands"] | SpaceState["floorHolders"], spaceUserId: string): void {
    const index = list.findIndex((entry) => entry.spaceUserId === spaceUserId);
    if (index !== -1) {
        list.splice(index, 1);
    }
}
