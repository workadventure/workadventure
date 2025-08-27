import { AvailabilityStatus } from "@workadventure/messages";
import { derived, Readable, writable } from "svelte/store";
import { UserProviderInterface } from "../UserProvider/UserProviderInterface";
import { chatId, ChatUser, PartialChatUser } from "../Connection/ChatConnection";

/**
 * Merges several UserProviders into one store that sorts users by room.
 */
export type playUri = string;

export class UserProviderMerger {
    usersByRoomStore: Readable<
        Map<
            playUri | undefined,
            {
                roomName: string | undefined;
                users: ChatUser[];
            }
        >
    >;

    constructor(private userProviders: UserProviderInterface[]) {
        this.usersByRoomStore = derived(
            this.userProviders.map((up) => up.users),
            (users) => {
                const usersByChatId = new Map<chatId, PartialChatUser[]>();

                // Step one: sort users by chatId
                for (const usersList of users) {
                    for (const user of usersList) {
                        const chatUserList = usersByChatId.get(user.chatId ?? user.uuid);
                        if (!chatUserList) {
                            usersByChatId.set(user.chatId ?? user.uuid, [user]);
                        } else {
                            chatUserList.push(user);
                        }
                    }
                }

                // Step 2: merge users with same chatId
                const mergedUsers = new Map<chatId, ChatUser>();
                for (const chatUserList of usersByChatId.values()) {
                    const UUIDs: Map<number, Partial<PartialChatUser>> = new Map();

                    if (chatUserList[0].id)
                        UUIDs.set(chatUserList[0].id, {
                            uuid: chatUserList[0].uuid,
                            availabilityStatus: chatUserList[0].availabilityStatus,
                            avatarUrl: chatUserList[0].avatarUrl,
                            roomName: chatUserList[0].roomName,
                            playUri: chatUserList[0].playUri,
                            id: chatUserList[0].id,
                            color: chatUserList[0].color,
                            username: chatUserList[0].username,
                        });

                    const mergedUser = chatUserList.reduce((acc, user) => {
                        if (user.id)
                            UUIDs.set(user.id, {
                                uuid: user.uuid,
                                availabilityStatus: user.availabilityStatus,
                                avatarUrl: user.avatarUrl,
                                roomName: user.roomName,
                                playUri: user.playUri,
                                id: user.id,
                                color: user.color,
                                username: user.username,
                            });

                        return {
                            chatId: user.chatId,
                            uuid: user.uuid || acc.uuid,
                            username: user.username || acc.username,
                            availabilityStatus: user.availabilityStatus || acc.availabilityStatus,
                            avatarUrl: user.avatarUrl || acc.avatarUrl,
                            roomName: user.roomName || acc.roomName,
                            playUri: user.playUri || acc.playUri,
                            isAdmin: user.isAdmin || acc.isAdmin,
                            isMember: user.isMember || acc.isMember,
                            visitCardUrl: user.visitCardUrl || acc.visitCardUrl,
                            color: user.color || acc.color,
                            spaceUserId: user.spaceUserId || acc.spaceUserId,
                        };
                    });

                    const defaultUser = {
                        chatId: undefined,
                        username: "",
                        avatarUrl: undefined,
                        roomName: undefined,
                        playUri: undefined,
                        color: undefined,
                        spaceUserId: undefined,
                    };

                    Array.from(UUIDs.values()).forEach((user) => {
                        const fullUser = {
                            ...defaultUser,
                            ...mergedUser,
                            ...user,
                            availabilityStatus: user.availabilityStatus ?? writable(AvailabilityStatus.UNCHANGED),
                        };

                        mergedUsers.set(mergedUser.chatId, fullUser);
                        mergedUsers.set(fullUser.id?.toString() ?? mergedUser.chatId, fullUser);
                    });
                }

                // Step 3: sort users by room
                const usersByRoom = new Map<
                    playUri | undefined,
                    {
                        roomName: string | undefined;
                        users: ChatUser[];
                    }
                >();
                for (const user of mergedUsers.values()) {
                    const playUri = user.playUri;
                    const usersInRoom = usersByRoom.get(playUri);
                    if (usersInRoom) {
                        usersInRoom.users.push(user);
                    } else {
                        usersByRoom.set(playUri, {
                            roomName: user.roomName,
                            users: [user],
                        });
                    }
                }

                return usersByRoom;
            },
            new Map()
        );
    }

    setFilter(searchText: string): Promise<void[]> {
        return Promise.all(this.userProviders.map((userProvider) => userProvider.setFilter(searchText)));
    }
}
