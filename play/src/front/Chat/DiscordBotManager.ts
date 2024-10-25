import { notificationPlayingStore } from "../Stores/NotificationStore";
import {ChatConnectionInterface, ChatMessage, ChatRoom} from "./Connection/ChatConnection";
import {get} from "svelte/store";

class DiscordBotManager {

    private chatConnection
    private discordBotRoom :ChatRoom | undefined = undefined;
    //TODO add discord bot Id in a env file
    static DISCORD_BOT_ID = "@discordbot:matrix.workadventure.localhost";

    constructor(chatConnection:  ChatConnectionInterface) {
        this.chatConnection = chatConnection;
        this.initDiscordBotRoom();
    }

    //init the direct room with the discord bot
    private async initDiscordBotRoom() {
        try {
            this.discordBotRoom = await this.chatConnection.createDirectRoom(DiscordBotManager.DISCORD_BOT_ID);
        } catch (error) {
            console.error("Failed to create direct room with the bot", error);
        }
    }

    public async sendMessage(message: string): Promise<ChatMessage> {
        return new Promise((resolve, reject) => {
            if (!this.discordBotRoom) {
                reject("Discord bot room is not initialized");
                return
            }
            const unsubscribeBotMessage = this.discordBotRoom.messages.subscribe(async (messages) => {
                const lastMessage = messages[messages.length - 1];
                if (`${lastMessage.sender?.chatId}` !== DiscordBotManager.DISCORD_BOT_ID) {
                    return;
                } else {
                    resolve(lastMessage);
                    unsubscribeBotMessage();
                    return
                }
            });
        });
    }

}