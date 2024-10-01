import { gameManager } from "../../../Phaser/Game/GameManager";

export const searchChatMembersRule = () => {
    const chat = gameManager.chatConnection;

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

    return { searchMembers };
};
