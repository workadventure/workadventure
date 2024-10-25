import { notificationPlayingStore } from "../Stores/NotificationStore";
import {ChatConnectionInterface, ChatMessage, ChatRoom} from "./Connection/ChatConnection";
import {get, Unsubscriber} from "svelte/store";
import {DiscordServer} from "../Interfaces/DiscordServerInterface";
import {attempt} from "lodash";

export default class DiscordBotManager {
    private chatConnection
    private discordBotRoom :ChatRoom | undefined = undefined;
    private unsubscribeBotMessage: Unsubscriber | undefined;
    private loginQrAttempt = false;
    //TODO add discord bot Id in a env file
    static DISCORD_BOT_ID = "@discordbot:matrix.workadventure.localhost";

    constructor(chatConnection:  ChatConnectionInterface) {
        this.chatConnection = chatConnection;
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
            if(this.unsubscribeBotMessage) this.unsubscribeBotMessage();
            if (!this.discordBotRoom) {
                reject("Discord bot room is not initialized");
                return
            }
            this.discordBotRoom.sendMessage(message);
            this.unsubscribeBotMessage = this.discordBotRoom.messages.subscribe(async (messages) => {
                const lastMessage = messages[messages.length - 1];
                if (`${lastMessage.sender?.chatId}` !== DiscordBotManager.DISCORD_BOT_ID) {
                    return;
                }
                else if((get(lastMessage.content).body).includes('websocket: close sent')) {
                    return;
                } else {
                    resolve(lastMessage);
                    if(this.unsubscribeBotMessage) this.unsubscribeBotMessage();
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

    public async getUserGuilds(): Promise<DiscordServer[]>{
        const guildsMessage = await this.sendMessage("guild status");
        return this.getParsedGuilds(get(guildsMessage.content).body);
    }

    public async getQrCode (): Promise<string> {
        const qrMessage = await this.sendMessage("login qr");
        return get(qrMessage.content).body;
    }

    public async loginWithToken(token: string): Promise<string> {
        this.loginQrAttempt = false;
        const loginResponse = await this.sendMessage(`login-token token ${token}`)
        return get(loginResponse.content).body;
    }
}