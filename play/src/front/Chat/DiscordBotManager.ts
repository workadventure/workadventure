import { get } from "svelte/store";
import { Subscription } from "rxjs";
import { notificationPlayingStore } from "../Stores/NotificationStore";
import { DiscordServer } from "../Interfaces/DiscordServerInterface";
import { DISCORD_BOT_ID } from "../Enum/EnvironmentVariable";
import { ChatMessage } from "./Connection/ChatConnection";
import { MatrixChatConnection } from "./Connection/Matrix/MatrixChatConnection";
import { MatrixChatRoom } from "./Connection/Matrix/MatrixChatRoom";
import { storedQrCodeUrl } from "./Stores/DiscordConnectionStore";
import { MatrixChatMessage } from "./Connection/Matrix/MatrixChatMessage";

export interface DiscordUser {
    id: string;
    username: string;
}

export class DiscordBotManager {
    private discordBotRoom: MatrixChatRoom | undefined = undefined;
    private botMessageSubscription: Subscription | undefined;
    //TODO Test DiscordBotManager Class
    //TODO add discord bot Id in a env file
    constructor(private chatConnection: MatrixChatConnection) {}

    //init the direct room with the discord bot
    public async initDiscordBotRoom() {
        if (!DISCORD_BOT_ID) {
            console.error("Discord bot id is not defined");
            return;
        }
        try {
            //try to get existing direct room with the bot
            const existingDirectRoom = this.chatConnection.getDirectRoomFor(DISCORD_BOT_ID);
            console.log(" 🫡existingDirectRoom", this.chatConnection.getRoomList());
            console.log("discord bot id", DISCORD_BOT_ID);
            console.log(">>>>>>>existingDirectRoom", existingDirectRoom);
            if (existingDirectRoom instanceof MatrixChatRoom) {
                this.discordBotRoom = existingDirectRoom;
                return;
            }else {
                //if no existing direct room create one
                const discordChatRoom = await this.chatConnection.createDirectRoom(DISCORD_BOT_ID);
                if (discordChatRoom instanceof MatrixChatRoom) {
                    this.discordBotRoom = discordChatRoom;
                }
            }
        } catch (error) {
            console.error("Failed to create direct room with the bot", error);
        }
    }

    public async sendMessage(message: string): Promise<ChatMessage> {
        let welcomeMessageNumber = 0;
        return new Promise((resolve, reject) => {
            if (this.botMessageSubscription) this.botMessageSubscription.unsubscribe();
            if (!this.discordBotRoom) {
                throw new Error("Discord bot room is not initialized");
            }
            try {
                this.discordBotRoom.sendMessage(message);
                console.log("-------> send message: ", message);
            } catch (e) {
                console.error("Failed to send message to discord bot", e);
                reject(e);
            }
            this.botMessageSubscription = this.discordBotRoom.messages.onPush.subscribe((lastMessage) => {
                // console.log("lastMessage", get(lastMessage.content).body);
                // console.log(">>>>>>", this.discordBotRoom?.messages.length);
                if (!this.discordBotRoom) {
                    return reject(new Error("Discord bot room is not initialized"));
                }
                if (`${lastMessage.sender?.chatId}` !== DISCORD_BOT_ID) {
                    return;
                } else if (get(lastMessage.content).body.includes("websocket: close sent")) {
                    return;
                } else if (get(lastMessage.content).body.includes("welcome from bridge bot")) {
                    //ignoring the welcome message
                    welcomeMessageNumber++;
                    //console.log("welcomeMessageNumber", welcomeMessageNumber);
                    if (welcomeMessageNumber > 3) {
                        return resolve(this.sendMessage(message));
                    }
                    return;
                } else if (
                    get(lastMessage.content).body.includes(
                        "This room has been registered as your bridge management/status room."
                    )
                ) {
                    //ignoring the room registration message
                    return;
                } else {
                    if (this.botMessageSubscription) this.botMessageSubscription.unsubscribe();
                    console.log(">>>> 👌lastMessage", get(lastMessage.content).body);
                    return resolve(lastMessage);
                }
            });
        });
    }

    public async getCurrentDiscordUser(message?: ChatMessage): Promise<DiscordUser | null> {
        if (!message) {
            message = await this.sendMessage("ping");
            if (!get(message.content).body.includes("logged in as")) {
                return null;
            }
        }
        if (message) {
            const regex = /@([^\s]+) \(`(\d+)`\)/;
            const matches = get(message.content).body.match(regex);
            if (matches) {
                return {
                    id: matches[2],
                    username: matches[1],
                };
            }
        }
        return null;
    }

    //Not same as parseGuilds, parseGuildsContentMessage is in case guild status response message is not a MatrixChatMessageor
    // or if we have only a string to parse in guilds list
    public parseGuildsContentMessage(message: string): DiscordServer[] {
        const regex = /^\* (.*) \(`(\d+)`\) - (.*)$/gm;

        const matches = message.matchAll(regex);

        return Array.from(matches).map((match) => {
            // const guild = guilds.find((guild: { id: string }) => guild.id === match[2]);
            return {
                name: match[1],
                id: match[2],
                isSync: !match[3].includes("never"),
                isBridging: false,
            };
        });
    }

    public parseGuilds(guildsMessage: MatrixChatMessage): DiscordServer[] {
        const htmlString = guildsMessage.getFormattedBody();
        if (!htmlString) {
            return [];
        }
        const regex =
            /<li>(?:<img [^>]*?src="([^"]+)"[^>]*>)?\s*([^<]+)\s*\(<code>(\d+)<\/code>\)\s*-\s*(never bridge messages|bridge all messages)/g;

        const matches = htmlString.matchAll(regex);
        return Array.from(matches)
            .map((match) => {
                return {
                    name: match[2].trim(),
                    id: match[3],
                    isSync: !match[4].includes("never"),
                    isBridging: false,
                    icon: guildsMessage.mxcUrlToHttp(match[1]) || undefined,
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    public async getParsedUserGuilds(): Promise<DiscordServer[]> {
        const guildsMessage = await this.sendMessage("guild status");
        if (guildsMessage instanceof MatrixChatMessage) {
            return this.parseGuilds(guildsMessage);
        } else {
            return this.parseGuildsContentMessage(get(guildsMessage.content).body);
        }
    }

    public async bridgesGuilds(guilds: DiscordServer[]): Promise<boolean> {
        if (guilds.length === 0) {
            return false;
        }
        const promiseAllSendMessages: Array<Promise<void>> = [];
        for (const guild of guilds) {
            promiseAllSendMessages.push(
                (async () => {
                    try {
                        await this.sendMessage(`guild bridge ${guild.id}`);
                        notificationPlayingStore.playNotification(
                            `Successfully bridging ${guilds.length > 1 ? "all of your servers" : guilds[0].name}}`,
                            "discord-logo.svg"
                        );
                    } catch (e) {
                        console.error("Failed to bridge guild", e);
                        notificationPlayingStore.playNotification(
                            `Error while bridging server: ${guild.name}`,
                            "discord-logo.svg"
                        );
                    }
                })()
            );
        }
        return Promise.all(promiseAllSendMessages)
            .then(() => {
                return true;
            })
            .catch(() => {
                return false;
            });
    }

    public async unBridgesGuilds(guilds: DiscordServer[]): Promise<boolean> {
        if (guilds.length === 0) {
            return false;
        }
        const promiseAllSendMessages: Array<Promise<void>> = [];
        for (const guild of guilds) {
            promiseAllSendMessages.push(
                (async () => {
                    try {
                        await this.sendMessage(`guild unbridge ${guild.id}`);
                        notificationPlayingStore.playNotification(
                            `Successfully unbridging ${guilds.length > 1 ? "all of your servers" : guilds[0].name}`,
                            "discord-logo.svg"
                        );
                    } catch (e) {
                        console.error("Failed to unbridge guild", e);
                        notificationPlayingStore.playNotification(
                            `Error while unbridging server: ${guild.name}`,
                            "discord-logo.svg"
                        );
                    }
                })()
            );
        }
        return Promise.all(promiseAllSendMessages)
            .then(() => {
                return true;
            })
            .catch(() => {
                return false;
            });
    }

    public async AttemptQrCode(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.botMessageSubscription) this.botMessageSubscription.unsubscribe();
            if (!this.discordBotRoom) {
                reject(new Error("Discord bot room is not initialized"));
                return;
            }

            try {
                this.discordBotRoom.sendMessage("login qr");
            } catch (e) {
                console.error("Failed to send QR code request to discord bot", e);
                reject(e);
            }

            let messageCount = 0;

            this.botMessageSubscription = this.discordBotRoom.messages.onPush.subscribe((lastMessage) => {
                if (!this.discordBotRoom) {
                    throw new Error("Discord bot room is not initialized");
                }

                if (`${lastMessage.sender?.chatId}` !== DISCORD_BOT_ID) {
                    return;
                } else if (get(lastMessage.content).body.includes("websocket: close sent")) {
                    return;
                } else if (get(lastMessage.content).body.includes("captchat")) {
                    if (this.botMessageSubscription) this.botMessageSubscription.unsubscribe();
                    resolve("captcha error");
                    return;
                } else {
                    messageCount++;

                    if (messageCount === 1) {
                        const qrCodeUrl = get(lastMessage.content).url;
                        if (qrCodeUrl) {
                            storedQrCodeUrl.set(qrCodeUrl);
                        }
                    } else if (messageCount === 2) {
                        const secondMessage = get(lastMessage.content).body;
                        if (this.botMessageSubscription) this.botMessageSubscription.unsubscribe();
                        resolve(secondMessage);
                    }
                }
            });
        });
    }
    public async AttemptToken(token: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.botMessageSubscription) this.botMessageSubscription.unsubscribe();
            if (!this.discordBotRoom) {
                throw new Error("Discord bot room is not initialized");
            }
            try {
                this.discordBotRoom.sendMessage(`login-token user ${token}`);
            } catch (e) {
                console.error("Failed to send your token to discord bot", e);
                reject(e);
            }
            let messageCount = 0;
            this.botMessageSubscription = this.discordBotRoom.messages.onPush.subscribe((lastMessage) => {
                if (!this.discordBotRoom) {
                    return reject(new Error("Discord bot room is not initialized"));
                }

                if (`${lastMessage.sender?.chatId}` !== DISCORD_BOT_ID) {
                    return;
                } else if (get(lastMessage.content).body.includes("websocket: close sent")) {
                    return;
                } else {
                    messageCount++;
                    if (messageCount === 1) {
                        if (!get(lastMessage.content).body.includes("Connecting to")) {
                            notificationPlayingStore.playNotification(
                                "Error while sending your token",
                                "discord-logo.svg"
                            );
                            if (this.botMessageSubscription) this.botMessageSubscription.unsubscribe();
                            return reject(new Error("Error while sending your token"));
                        }
                    } else if (messageCount === 2) {
                        const secondMessage = get(lastMessage.content).body;
                        if (this.botMessageSubscription) this.botMessageSubscription.unsubscribe();
                        return resolve(secondMessage);
                    }
                }
            });
        });
    }
    destroy() {
        //close the direct room with the bot
        if (this.discordBotRoom) {
            this.discordBotRoom.destroy();
        }
        if (this.botMessageSubscription) this.botMessageSubscription.unsubscribe();
    }
}
