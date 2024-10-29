import { notificationPlayingStore } from "../Stores/NotificationStore";
import {ChatConnectionInterface, ChatMessage, ChatRoom} from "./Connection/ChatConnection";
import {get, Unsubscriber} from "svelte/store";
import {DiscordServer} from "../Interfaces/DiscordServerInterface";
import {attempt, forEach, initial} from "lodash";
import {MatrixChatConnection} from "./Connection/Matrix/MatrixChatConnection";
import {MatrixChatRoom} from "./Connection/Matrix/MatrixChatRoom";
import {Subscription} from "rxjs";
import { connectionStatus, storedQrCodeUrl } from "./Stores/DiscordConnectionStore"
import {success} from "@workadventure/map-editor";
import {resolve} from "path";

export default class DiscordBotManager {
    private discordBotRoom: MatrixChatRoom | undefined = undefined;
    private botMessageSubscription: Subscription | undefined;
    private waitForALoginMessage: Subscription | undefined;
    //private loginQrAttempt = false;
    //TODO add discord bot Id in a env file
    static DISCORD_BOT_ID = "@discordbot:matrix.workadventure.localhost";

    constructor(private chatConnection: MatrixChatConnection) {
    }

    //init the direct room with the discord bot
    public async initDiscordBotRoom() {
        try {
            this.discordBotRoom = await this.chatConnection.createDirectRoom(DiscordBotManager.DISCORD_BOT_ID);
        } catch (error) {
            console.error("Failed to create direct room with the bot", error);
        }
    }

    public async sendMessage(message: string): Promise<ChatMessage> {
        return new Promise((resolve, reject) => {
            if(this.botMessageSubscription) this.botMessageSubscription.unsubscribe();
            if (!this.discordBotRoom) {
                reject("Discord bot room is not initialized");
                return
            }

            try {
                this.discordBotRoom.sendMessage(message);
            }
            catch (e) {
                console.error("Failed to send message to discord bot", e);
                reject(e);
            }

            this.botMessageSubscription = this.discordBotRoom.messages.onPush.subscribe(async (lastMessage) => {
                if (!this.discordBotRoom) {
                    reject("Discord bot room is not initialized");
                    return
                }

                if (`${lastMessage.sender?.chatId}` !== DiscordBotManager.DISCORD_BOT_ID) {
                    return;
                }
                else if((get(lastMessage.content).body).includes('websocket: close sent')) {
                    return;
                }
                else{
                    console.log(
                        "@@@@@ message received from discord bot",
                        get(lastMessage.content),
                    )

                    resolve(lastMessage);
                    if(this.botMessageSubscription) this.botMessageSubscription.unsubscribe();
                    return
                }
            });
        });
    }

    public getParsedGuilds(message: string): DiscordServer[] {
        const regex = /^\* (.*) \(`(\d+)`\) - (.*)$/gm;

        const matches = message.matchAll(regex);

        return Array.from(matches).map((match) => {
            // const guild = guilds.find((guild: { id: string }) => guild.id === match[2]);
            return {
                name: match[1],
                id: match[2],
                isSync: !match[3].includes("never"),
                isBridging: false,
                // ...guild,
            };
        });
    }

    public async getParsedUserGuilds(): Promise<DiscordServer[]>{
        const guildsMessage = await this.sendMessage("guild status");
        return this.getParsedGuilds(get(guildsMessage.content).body);
    }

    public async bridgesGuilds(guilds: DiscordServer[]): Promise<boolean> {
            if (guilds.length === 0){
                return true;
            }
            for (const guild of guilds) {
                try {
                    await this.sendMessage(`guild bridge ${guild.id} --entire`);
                } catch (e) {
                    console.error("Failed to bridge guild", e);
                    notificationPlayingStore.playNotification(`Error while bridging server: ${guild.name}`, "discord-logo.svg")
                    return false;
                }
            }
            notificationPlayingStore.playNotification(`Successfully bridging ${guilds.length > 1 ? 'all of your servers' : guilds[0].name}}`, "discord-logo.svg")
            return true;
    }

    public async unBridgesGuilds(guilds: DiscordServer[]): Promise<boolean> {
            if (guilds.length === 0){
                return true;
            }
            for (const guild of guilds) {
                try {
                    await this.sendMessage(`guild unbridge ${guild.id}`);
                } catch (e) {
                    console.error("Failed to unbridge guild", e);
                    notificationPlayingStore.playNotification(`Error while unbridging server: ${guild.name}`, "discord-logo.svg")
                    return false
                }
            }
            notificationPlayingStore.playNotification(`Successfully unbridging ${guilds.length>1? 'all of your servers' : guilds[0].name}`, "discord-logo.svg")
            return true;
    }

    public async AttemptQrCode (): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.botMessageSubscription) this.botMessageSubscription.unsubscribe();
            if (!this.discordBotRoom) {
                reject("Discord bot room is not initialized");
                return;
            }

            try {
                this.discordBotRoom.sendMessage("login qr");
            } catch (e) {
                console.error("Failed to send QR code request to discord bot", e);
                reject(e);
            }

            let messageCount = 0;

            this.botMessageSubscription = this.discordBotRoom.messages.onPush.subscribe(async (lastMessage) => {
                if (!this.discordBotRoom) {
                    reject("Discord bot room is not initialized");
                    return;
                }

                if (`${lastMessage.sender?.chatId}` !== DiscordBotManager.DISCORD_BOT_ID) {
                    return;
                } else if ((get(lastMessage.content).body).includes('websocket: close sent')) {
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
}