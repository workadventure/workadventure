import { get } from "svelte/store";
import { gameManager } from "../../../Phaser/Game/GameManager";

export interface SelectItem {
    value: string;
    label: string | undefined;
    verified?: boolean;
    created?: boolean;
}

export const searchChatMembersRule = () => {
    const userProviderMergerPromise = gameManager.getCurrentGameScene().userProviderMerger;

    async function searchWorldMembers(filterText: string): Promise<SelectItem[]> {
        try {
            const userProviderMerger = await userProviderMergerPromise;
            const chatUsersMap = get(userProviderMerger.usersByRoomStore);
            const chatUsers = Array.from(chatUsersMap.values())
                .flatMap((room) => room.users)
                .filter((user) => user.username?.includes(filterText) && user.chatId);
            if (chatUsers === undefined) {
                return [];
            }
            return chatUsers.map((user) => ({
                value: user.chatId,
                label: user.username ?? user.id?.toString(),
                verified: true,
                created: false,
            }));
        } catch (error) {
            console.error(error);
        }

        return [];
    }

    return { searchWorldMembers };
};
