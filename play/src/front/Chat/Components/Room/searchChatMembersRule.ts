import { gameManager } from "../../../Phaser/Game/GameManager";
import type { ChatUser } from "../../Connection/ChatConnection";

export interface SelectItem {
    value: string;
    label: string | undefined;
    verified?: boolean;
    created?: boolean;
}

export const searchChatMembersRule = () => {
    const userProviderMergerPromise = gameManager.getCurrentGameScene().userProviderMerger;

    /**
     * Subscribes to the list of users known by the user providers (world members from the Admin API,
     * users currently connected and users we already have a direct room with).
     *
     * The subscription must be kept alive for as long as the list is displayed: the providers only
     * load their users (and only honor `setFilter`) while their store has at least one subscriber.
     */
    async function subscribeToWorldMembers(onMembers: (members: SelectItem[]) => void): Promise<() => void> {
        const userProviderMerger = await userProviderMergerPromise;

        return userProviderMerger.usersByRoomStore.subscribe((chatUsersMap) => {
            const chatUsers = Array.from(chatUsersMap.values())
                .flatMap((room) => room.users)
                .filter((user) => user.chatId) as (ChatUser & { chatId: string })[];

            onMembers(
                chatUsers.map((user) => ({
                    value: user.chatId,
                    label: user.username ?? user.spaceUserId?.toString(),
                    verified: true,
                    created: false,
                })),
            );
        });
    }

    /**
     * Asks the user providers to reload their users for the given search text.
     *
     * This is what makes users that are not part of the members initially loaded from the Admin API
     * (only the first few hundreds are) reachable: the search is performed by the Admin API itself.
     */
    async function searchWorldMembers(searchText: string): Promise<void> {
        const userProviderMerger = await userProviderMergerPromise;
        await userProviderMerger.setFilter(searchText);
    }

    return { subscribeToWorldMembers, searchWorldMembers };
};
