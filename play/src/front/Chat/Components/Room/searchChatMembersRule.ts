import { get } from "svelte/store";
import { gameManager } from "../../../Phaser/Game/GameManager";

export interface SelectItem {
    value: string;
    label: string | undefined;
    verified?: boolean;
    created?: boolean;
}

export const searchChatMembersRule = () => {
    const chat = gameManager.chatConnection;
    const userProviderMergerPromise = gameManager.getCurrentGameScene().userProviderMerger;

    async function searchMembers(filterText: string) {
        try {
            const chatUsers = await chat.searchChatUsers(filterText);
            if (chatUsers === undefined) {
                return [];
            }
            return chatUsers.map((user) => ({ value: user.id, label: user.name ?? user.id }));
        } catch (error) {
            console.error(error);
        }

        return [];
    }

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
                label: user.username ?? user.spaceUserId?.toString(),
                verified: true,
                created: false,
            }));
        } catch (error) {
            console.error(error);
        }

        return [];
    }

    return { searchMembers, searchWorldMembers };
};
