import { derived, writable } from "svelte/store";
import { getColorRgbFromHue } from "../WebRtc/ColorGenerator";
import { gameManager } from "../Phaser/Game/GameManager";

export const followStates = {
    off: "off",
    requesting: "requesting",
    active: "active",
    ending: "ending",
};

export const followRoles = {
    leader: "leader",
    follower: "follower",
};

export const followStateStore = writable(followStates.off);
export const followRoleStore = writable(followRoles.leader);
//export const followUsersStore = writable<number[]>([]);

function createFollowUsersStore() {
    const { subscribe, update, set } = writable<number[]>([]);

    return {
        subscribe,
        addFollowRequest(leader: number): void {
            followStateStore.set(followStates.requesting);
            followRoleStore.set(followRoles.follower);
            set([leader]);
        },
        addFollower(user: number): void {
            update((followers) => {
                followers.push(user);
                return followers;
            });
        },
        /**
         * Removes the follower from the store.
         * Will update followStateStore and followRoleStore if nobody is following anymore.
         * @param user
         */
        removeFollower(user: number): void {
            update((followers) => {
                const oldFollowerCount = followers.length;
                followers = followers.filter((id) => id !== user);

                if (followers.length === 0 && oldFollowerCount > 0) {
                    followStateStore.set(followStates.off);
                    followRoleStore.set(followRoles.leader);
                }

                return followers;
            });
        },
        stopFollowing(): void {
            set([]);
            followStateStore.set(followStates.off);
            followRoleStore.set(followRoles.leader);
        },
    };
}

export const followUsersStore = createFollowUsersStore();

/**
 * This store contains the color of the follow group. It is derived from the ID of the leader.
 */
export const followUsersColorStore = derived(
    [followStateStore, followRoleStore, followUsersStore],
    ([$followStateStore, $followRoleStore, $followUsersStore]) => {
        console.log($followStateStore);
        if ($followStateStore !== followStates.active) {
            return undefined;
        }

        if ($followUsersStore.length === 0) {
            return undefined;
        }

        let leaderId: number;
        if ($followRoleStore === followRoles.leader) {
            // Let's get my ID by a quite complicated way....
            leaderId = gameManager.getCurrentGameScene().connection?.getUserId() ?? 0;
        } else {
            leaderId = $followUsersStore[0];
        }

        // Let's compute a random hue between 0 and 1 that varies enough to be interesting
        const hue = ((leaderId * 197) % 255) / 255;

        let { r, g, b } = getColorRgbFromHue(hue);
        if ($followRoleStore === followRoles.follower) {
            // Let's make the followers very slightly darker
            r *= 0.9;
            g *= 0.9;
            b *= 0.9;
        }
        return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
    }
);
