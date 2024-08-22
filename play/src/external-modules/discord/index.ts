import { get, Unsubscriber } from "svelte/store";
import { ChatConnectionInterface, ChatRoom } from "../../front/Chat/Connection/ChatConnection";
import { RoomMetadataType } from "../../front/ExternalModule/ExtensionModule";
import axios from "axios";

let resolveSendToken: (value: void | PromiseLike<void>) => void;

let awaitForStep : Promise<void> = new Promise((resolve) => {
    resolveSendToken = resolve;
});

export interface DiscordServer {
    name: string;
    id: string;
    isSync: boolean;
    isBridging: boolean;
    icon?: string;
}

export class DiscordExternalModule {
    private discordBotId ='@discordbot:matrix.workadventure.localhost';
    private isFirstMessqge = true;
    private loadingFetchServer = false;
    private step: string = 'checkLogin';
    private bridgeConnected = false;
    private needManualToken = false;
    private servers : DiscordServer[] = [];

    private qrCodeUrl: string|undefined;
    private manualDiscordToken: string|undefined;
    private discordbotRoom: ChatRoom|undefined;
    private discordAuthToken: { token: string; }|undefined;
    private unsubscribeBotMessage: Unsubscriber |undefined;

    private clientDiscordApi = axios.create({
        baseURL: 'https://discord.com/api/v10',
    });

    async init(chatConnection: ChatConnectionInterface, roomMetadata: RoomMetadataType){

        const parsedRoomMetadata = RoomMetadataType.safeParse(roomMetadata);
        if (!parsedRoomMetadata.success) {
            console.error(
                "Unable to initialize Discord due to room metadata parsing error : ",
                parsedRoomMetadata.error
            );
            parsedRoomMetadata.error.errors.forEach((err) => {
                console.error(`Path: ${err.path.join('.')}, Message: ${err.message}`);
            });
        }

        this.discordAuthToken = parsedRoomMetadata.data?.player.accessTokens.find(
            (token) => token.provider.toLocaleLowerCase() === 'discord'
        );
        if(!this.discordAuthToken){
            throw new Error('Discord token not found');
        }

        this.discordbotRoom = await chatConnection.createDirectRoom(this.discordBotId);
        if(!this.discordbotRoom){
            throw new Error('Could not create discord bot room');
        }
        this.discordbotRoom.sendMessage('ping');
        this.envetSubscription();
    }

    private envetSubscription(){
        if(!this.discordbotRoom)return;

        this.unsubscribeBotMessage = this.discordbotRoom.messages.subscribe(async (messages) => {
            console.log('envetSubscription => this.discordbotRoom.messages => discordbotRoom message', messages);

            this.loadingFetchServer = true;
            const lastMessage = messages[messages.length-1];

            if (lastMessage.sender?.id !== this.discordBotId) return;

            console.log('step: ', this.step);
            console.log('message reçu !', get(lastMessage.content));    
            switch (this.step){
                case 'checkLogin':
                    if(get(lastMessage.content).body.includes('You\'re logged in as') ||get(lastMessage.content).body.includes('You\'re already logged in') || get(lastMessage.content).body.includes('Successfully logged in as') || get(lastMessage.content).body.includes('Connecting to Discord as user')){
                        this.bridgeConnected = true;
                        this.step = 'getServers';
                        this.discordbotRoom?.sendMessage('guild status');
                    }
                    else{
                        console.log('Discord bot isn\'t connected');
                        this.bridgeConnected = false;
                        this.step = 'getQrCode';
                        this.discordbotRoom?.sendMessage('login-qr');
                        // connectToBridge();
                    }
                    break;
                case 'getServers':
                    const guilds = await this.getAllGuilds();

                    this.needManualToken = false;
                    this.qrCodeUrl = undefined;
                    const messageServers = get(lastMessage.content).body;

                    const regex = /^\* (.*) \(`(\d+)`\) - (.*)$/mg;

                    const matches = messageServers.matchAll(regex);

                    this.servers = Array.from(matches).map((match)=>{
                        const guild = guilds.find((guild: { id: string; }) => guild.id === match[2]);
                        return {
                                name :match[1] ,
                                id:match[2] ,
                                isSync:( match[3].includes("never"))?false:true,
                                isBridging : false,
                                ...guild
                            }
                        });
                    console.log('servers', this.servers);
                    if(this.unsubscribeBotMessage)this.unsubscribeBotMessage();
                    this.loadingFetchServer = false;
                    break;
                case 'getQrCode':
                    this.qrCodeUrl = get(lastMessage.content).url;
                    this.step = 'waitLoginResponse';
                    break;
                
                case 'waitLoginResponse':
                    if(get(lastMessage.content).body.includes('Successfully logged in as')){
                        this.step = 'getServers';
                        this.discordbotRoom?.sendMessage('guild status');
                    }
                    else if(get(lastMessage.content).body.includes('CAPTCHAs')){
                        this.needManualToken = true;
                        (async() => {
                            const token = await awaitForStep;
                            this.discordbotRoom?.sendMessage(`login-token user ${this.manualDiscordToken}`);
                        })().catch((error) => {
                            console.error('Error sending message to Discord bot:', error);
                        });
                        this.step='checkLogin'
                        this.qrCodeUrl = undefined;
                    }
                    else{
                        this.step = 'getQrCode';
                        this.discordbotRoom?.sendMessage('login-qr');
                    }
                    break;
            }
        })
    }

    async getAllGuilds() : Promise<DiscordServer[]>{
        const guildsResponse = await this.clientDiscordApi.get('/users/@me/guilds', {
            headers: {
                Authorization: `Bearer ${this.discordAuthToken?.token}`,
            },
        });
        return guildsResponse.data;
    }
}