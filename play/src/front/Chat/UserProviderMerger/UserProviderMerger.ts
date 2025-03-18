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
                    const mergedUser = chatUserList.reduce((acc, user) => {
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

                    const fullUser = {
                        ...defaultUser,
                        ...mergedUser,
                        username: mergedUser.username ?? "",
                        availabilityStatus: mergedUser.availabilityStatus ?? writable(AvailabilityStatus.UNCHANGED),
                    };

                    mergedUsers.set(mergedUser.chatId, fullUser);
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
