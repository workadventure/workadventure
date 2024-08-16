<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import {PUSHER_URL} from '../../../Enum/EnvironmentVariable'
    import { RoomMetadataType } from '../../../ExternalModule/ExtensionModule';
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import axios, { AxiosError, AxiosInstance } from "axios";
    import { ObjectUnsubscribedError } from 'rxjs';
    import { get, Unsubscriber } from 'svelte/store';
    import { fade } from 'svelte/transition';
    import { on } from 'events';
    import { ChatMessage, ChatMessageContent, ChatRoom } from '../../Connection/ChatConnection';
    import { Readable } from "svelte/store";
    import { log } from 'console';
    import { success } from '@workadventure/map-editor';
    import AccessSecretStorageDialog from '../../Connection/Matrix/AccessSecretStorageDialog.svelte';
    import { storeToPromise } from './storeToPromise';
    import { element } from 'svelte/internal';


    interface discordServeur {
        name: string;
        id: string;
        isSync: boolean;
        isBridging: boolean;
    }

    // const redirectUri = PUSHER_URL + '/third-party-login/login/discord'
    // const DISCORD_REST_ENDPOINT_V1 = "https://discord.com/api/v10";
    // const DISCORD_ME_ENDPOINT = "/user/@me";

    let chatConnection = gameManager.getCurrentGameScene().chatConnection;
    let unsubscribeBotMessage: Unsubscriber |undefined;
    $: servers = [] as Array<discordServeur>;
    $: qrCodeUrl = undefined as string | undefined;
    $: needManualToken = false;
    let manualDiscordToken = '';


    // const discordBotId ='@discordbot:matrix.workadventure.localhost'
    // const discordbotRoom = chatConnection.createDirectRoom(discordBotId);
    export let bridgeConnected: boolean = false;
    let step = 'checkLogin';
    let isFirstMessqge = true;
 
    async function getUserDiscordServer(room: ChatRoom): Promise<discordServeur[]>{
            if(!room)return [];
            room.sendMessage('guild status');
            const allMessages = await storeToPromise(room.messages);
            const lastMessage = allMessages[allMessages.length-1];
            const messageServers = get(lastMessage.content).body;

            const regex = /^\* (.*) \(`(\d+)`\) - (.*)$/mg;

            const matches = messageServers.matchAll(regex);

            return Array.from(matches).map((match)=>{
                    return {
                        name :match[1] ,
                        id:match[2] ,
                        isSync:( match[3].includes("never"))?false:true,
                        isBridging: false
                    }
                });
    }
    async function getLastMessage(room: ChatRoom): Promise<ChatMessageContent>{
            const allMessages = await getThirdNextMessage(room);
            const lastMessage = allMessages[allMessages.length-1];
            console.log('receive :', get(lastMessage.content).body);
            return get(lastMessage.content);
    }

    async function getThirdNextMessage(room: ChatRoom): Promise<readonly ChatMessage[]>{
        await storeToPromise(room.messages)
        await storeToPromise(room.messages) 
        // await storeToPromise(room.messages) 
        return storeToPromise(room.messages)
    }

    let resolveSendToken: (value: void | PromiseLike<void>) => void;

    let awaitForStep : Promise<void> = new Promise((resolve) => {
        resolveSendToken = resolve;
    });

    async function sendDiscordToken(): Promise<void>{
            resolveSendToken();
    }

    let discordbotRoom : ChatRoom | undefined;

    function handleCheckboxChange(server: discordServeur) {
        if(server.isSync){
            server.isBridging = true;
            if(discordbotRoom)discordbotRoom.sendMessage(`guilds bridge ${server.id} --entire`);

            // TODO: Await the response from the bot to confirm the server is bridged and past is Bridging to false
            // TODO: add loador when  isBridging equal to true
        }else{
            server.isBridging = true;
            if(discordbotRoom)discordbotRoom.sendMessage(`guilds unbridge ${server.id}`);
            
            // TODO: Await the response from the bot to confirm the server is bridged and past is Bridging to false
            // TODO: add loador when  isBridging equal to true
        }
    }
    
    onMount(async() => {
        // TODO add discord bot Id in a env file
        const discordBotId ='@discordbot:matrix.workadventure.localhost'
        discordbotRoom = await chatConnection.createDirectRoom(discordBotId);

        if(!discordbotRoom)return;

        // storeToPromise(discordbotRoom.messages).then(async (messages) => {
        //     let lastMessage = messages[messages.length-1];

        //     if(get(lastMessage.content).body.includes('You\'re logged in as')){
        //         bridgeConnected = true;
        //         // step = 'getServers';
        //         getUserDiscordServer(discordbotRoom);
        //     }
        //     else{
        //         // step = 'getQrCode';
        //         // discordbotRoom.sendMessage('login-qr');
        //         // const { url, body } = await getLastMessage(discordbotRoom);
        //         // qrCodeUrl = url                
        //         bridgeConnected = false;
        //         let nextMessageIsError = true;
        //         let message = '';   
        //         do{
        //             discordbotRoom.sendMessage('login-qr');
        //             const { url, body } = await getLastMessage(discordbotRoom);
        //             console.log('le qr code reçu est: ', url);
        //             qrCodeUrl = url;
        //             let qrResponse;
        //             let messageIsExpected = false;
        //             do{
        //                 qrResponse = await getLastMessage(discordbotRoom);
        //                 console.log('expectedMessage/QR Response:', qrResponse.body);
        //                 // nextMessageIsError = qrResponse.body.includes('websocket: close sent');
        //                 //check if the message is an error
        //                 if(qrResponse.body.includes('websocket: close sent')){
        //                     messageIsExpected = true;
        //                 }
        //                 else if(qrResponse.url){
        //                     messageIsExpected = false;
        //                 }
        //                 else if(qrResponse.body.includes('Error logging in: HTTP 400 Bad Request')){
        //                     messageIsExpected = true;
        //                 }
        //                 else {
        //                     messageIsExpected = false;
        //                 }
        //                 console.log('messageIsExpected 🤯🤯🤯:', messageIsExpected);
        //             }while(!messageIsExpected)
        //         }while (nextMessageIsError)

        //         console.log('Sortie de boucle ', nextMessageIsError);

        //         if(message.includes('Successfully logged in as')){
        //             bridgeConnected = true;
        //             console.log('tout va bien');
        //             getUserDiscordServer(discordbotRoom);
        //         }else if(message.includes('CAPTCHAs')){
        //             needManualToken = true;
        //             console.log('need manual token');
        //             qrCodeUrl = undefined;
        //             //catcha management 
        //             // sendDiscordToken().then(() => {
        //             //     console.log('token sent');
        //             // })
        //         }
        //     }

            // console.log('messages:', get(messages[messages.length-1].content).body);
        // });

        unsubscribeBotMessage = discordbotRoom.messages.subscribe((messages) => {
            if(isFirstMessqge){
                isFirstMessqge=false;
                return;
            }
            if(!discordbotRoom)return;

                const lastMessage = messages[messages.length-1];

                if (lastMessage.sender?.id !== discordBotId) return;

                console.log('step: ', step);
                console.log('message reçu !', get(lastMessage.content));    
                switch (step){
                    case 'checkLogin':
                        if(get(lastMessage.content).body.includes('You\'re logged in as') ||get(lastMessage.content).body.includes('You\'re already logged in') || get(lastMessage.content).body.includes('Successfully logged in as') || get(lastMessage.content).body.includes('Connecting to Discord as user')){
                            bridgeConnected = true;
                            step = 'getServers';
                            discordbotRoom.sendMessage('guild status');
                        }
                        else{
                            console.log('Discord bot isn\'t connected');
                            bridgeConnected = false;
                            step = 'getQrCode';
                            discordbotRoom.sendMessage('login-qr');
                            // connectToBridge();
                        }
                        break;
                    case 'getServers':
                        needManualToken = false;
                        qrCodeUrl = undefined;
                        const messageServers = get(lastMessage.content).body;

                        const regex = /^\* (.*) \(`(\d+)`\) - (.*)$/mg;

                        const matches = messageServers.matchAll(regex);

                        servers = Array.from(matches).map((match)=>{
                            return {
                                    name :match[1] ,
                                    id:match[2] ,
                                    isSync:( match[3].includes("never"))?false:true,
                                    isBridging : false
                                }
                            });
                        if(unsubscribeBotMessage)unsubscribeBotMessage();
                        break;
                    case 'getQrCode':
                        qrCodeUrl = get(lastMessage.content).url;
                        step = 'waitLoginResponse';
                        break;
                    
                    case 'waitLoginResponse':
                        if(get(lastMessage.content).body.includes('Successfully logged in as')){
                            step = 'getServers';
                            discordbotRoom.sendMessage('guild status');
                        }
                        else if(get(lastMessage.content).body.includes('CAPTCHAs')){
                            needManualToken = true;
                            (async() => {
                                const token = await awaitForStep;
                                discordbotRoom.sendMessage(`login-token user ${manualDiscordToken}`);
                            })().catch((error) => {
                                console.error('Error sending message to Discord bot:', error);
                            });
                            step='checkLogin'
                            qrCodeUrl = undefined;
                        }
                        else{
                            step = 'getQrCode';
                            discordbotRoom.sendMessage('login-qr');
                        }
                        break;
                }
            })

        discordbotRoom.sendMessage('ping');
    });


    // export let servers: Array<discordServeur> = [];
    // export let selectedServers: Array<string> = [];

    const parsedRoomMetadata = RoomMetadataType.safeParse(gameManager.getCurrentGameScene().room.metadata);
    if (!parsedRoomMetadata.success) {
        console.error(
            "Unable to initialize Discord due to room metadata parsing error : ",
            parsedRoomMetadata.error
        );
        parsedRoomMetadata.error.errors.forEach((err) => {
            console.error(`Path: ${err.path.join('.')}, Message: ${err.message}`);
        });
    }
    // const metadata = parsedRoomMetadata.data;

    // const discordTokens = metadata?.player.accessTokens.find(token => token?.provider === 'Discord')

    // async function checkBridgeConnection() {
    
    //     const ping = await sendMessageToDiscordBot('ping').then((response) => {
    //         const content = get(response).body;
    //         if(content.includes('You\'re logged in as')){
    //             bridgeConnected = true;
    //         }
    //         else{
    //             console.log('Discord bot isn\'t connected');
    //             bridgeConnected = false;
    //             // connectToBridge();
    //         }
    //     }).catch((error) => {
    //         console.error('Error sending message to Discord bot:', error);
    //     });
    // }


    // function connectToBridge() {
    //     sendMessageToDiscordBot('login-qr').then((response) => {
    //         qrCodeLogin = get(response).url
    //         console.log('qrCodeeeeeeeeeee:', get(response));
    //     }).catch((error) => {
    //         console.error('Error sending message to Discord bot:', error);
    //     });
    // }


    // let discordAxiosClient: AxiosInstance = axios.create({
    //     baseURL:DISCORD_REST_ENDPOINT_V1 ,
    //     headers: {
    //         'Content-Type': 'application/json',
    //         'Accept': 'application/json',
    //         'Authorization': `Bearer ${discordTokens?.token}`
    //     }
    // });
    async function fetchDiscordServers() {
        // if (!discordTokens) return;
        // try {
        //     const response = await discordAxiosClient.get(DISCORD_REST_ENDPOINT_V1 + '/users/@me/guilds');
        //     servers = response.data.map((server: discordServeur)  => ({
        //         ...server,
        //         selected: false,
        //     }));

        //     // const serversResponse = await discordAxiosClient.get('/users/@me/guilds');
        //     // console.log('Discord servers:', serversResponse.data);
        //     // servers = serversResponse.data;
        // } catch (error) {
        //     console.error('Error fetching Discord servers:', error);
        // }
    }


    // async function sendMessageToDiscordBot(msg: string): Promise<Readable<ChatMessageContent>>{
    //     return new Promise(async (resolve, reject) => {
    //         // if (!discordTokens) return;

    //         const discordBotId ='@discordbot:matrix.workadventure.localhost'
    //         const discordbotRoom = await chatConnection.createDirectRoom(discordBotId);
            
    //         if(!discordbotRoom)return reject({success: false, message: 'Error creating room with Discord bot'}); 

    //         //wait bot response
    //         unsubscribeBotMessage = discordbotRoom.messages.subscribe((messages) => {
    //             console.log('messages:', messages,msg);
    //             const lastMessage = messages[messages.length-1];

    //             if(messages[messages.length-1].sender?.id !== discordBotId) return;
    //             if (lastMessage.sender?.id !== discordBotId) return;

    //             console.log('message reçu !', get(lastMessage.content));       
    //             resolve(lastMessage.content);

    //             if(typeof unsubscribeBotMessage === "function" )unsubscribeBotMessage();
    //         })

    //         discordbotRoom.sendMessage(msg);
    //         console.log('Message sent to Discord bot:', msg);
    //     });
    // }

    onDestroy(()=>{
        if(unsubscribeBotMessage) unsubscribeBotMessage();
    })



    fetchDiscordServers();

    // function handleButtonConnectClick() {
    //     sendMessageToDiscordBot('login-qr').then((response) => {
    //         console.error({response});
    //     }).catch((error) => {
    //         console.error('Error sending message to Discord bot:', error);
    //     });
    //     // window.location.href = redirectUri; // nop because we neeed the largest scopes token that oauth not provide
    // }
    // function handleSync() {
    //     // if (!discordTokens) return;
    //     sendMessageToDiscordBot('login-qr').then((response) => {
    //         console.error({response});
    //     }).catch((error) => {
    //         console.error('Error sending message to Discord bot:', error);
    //     })
    //     .then(() => {
    //         //send message to discord bot for each selectedServers
    //         selectedServers.forEach((serverId) => {
    //             console.log('Selected servers:', serverId);
    //             sendMessageToDiscordBot(`bridge ${serverId}--entire`).then((response) => {
    //                 fetchDiscordServers();
    //             }).catch((error) => {
    //                 console.error('Error sending message to Discord bot:', error);
    //             });
    //         });
    //         sendMessageToDiscordBot('sync-servers').then((response) => {
    //             fetchDiscordServers();
    //         }).catch((error) => {
    //             console.error('Error sending message to Discord bot:', error);
    //         });
    //     })
    //     ;
    // }
    function getInitials(name: string) {
        return name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
    }
    function handleImageError(event: { target: any; }) {
        const imgElement = event.target;
        const serverName = imgElement.alt;
        const initials = getInitials(serverName);
        imgElement.style.display = 'none';
        const initialsElement = document.createElement('div');
        initialsElement.className = 'initials';
        initialsElement.textContent = initials;
        initialsElement.classList.add('tw-w-8', 'tw-h-8', 'tw-rounded-full', 'tw-flex', 'tw-justify-center', 'tw-items-center', 'tw-bg-gray-300', 'tw-text-gray-700');
        imgElement.parentNode.insertBefore(initialsElement, imgElement);
    }

    onMount(() => {
        // bridgeConnected = metadata?.player.bridges.find(bridge => bridge?.provider === 'Discord')?.connected;
        // connectToBridge();

    });


</script>

<div class=" tw-flex tw-flex-col tw-w-full tw-gap-2">
    {#if qrCodeUrl || needManualToken}
        <div class="tw-flex tw-flex-col tw-gap-2 tw-p-6 tw-rounded-xl tw-fixed tw-top-1/2 tw-left-1/2 -tw-translate-x-1/2 -tw-translate-y-1/2 tw-backdrop-blur-lg tw-z-50 "
        transition:fade={{ delay: 250, duration: 300 }}
        >
            {#if qrCodeUrl && !needManualToken}
                <div class="tw-flex tw-justify-end">
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <span class=" tw-cursor-pointer"
                    on:click={()=>qrCodeUrl = undefined}
                    >&#10005;</span>
                </div>    
                <img src={qrCodeUrl} alt="QR Code" />
                <p class="tw-text-sm tw-text-gray-300">
                    Scan the QR code with your Discord app to login
                </p>
            {/if}

            {#if needManualToken}
                <div class="tw-flex tw-flex-col tw-items-center">
                    <input type="text" bind:value={manualDiscordToken}>
                    <button on:click={sendDiscordToken} class="tw-w-full tw-p-2 tw-bg-secondary-800  tw-text-white tw-no-underline tw-rounded-md tw-text-center tw-justify-center tw-cursor-pointer hover:tw-no-underline hover:tw-text-white tw-flex tw-flex-row tw-items-center">
                        Send
                    </button>
                </div>
            {/if}
        </div>
    {/if}

    <!-- <a  href={redirectUri} -->
    {#if !bridgeConnected}
        <div class="tw-py-8 tw-px-3">
            <!-- <button
            on:click={connectToBridge}
            class="tw-w-full tw-p-2 tw-bg-[#4156F6] tw-text-white tw-no-underline tw-rounded-md tw-text-center tw-justify-center tw-cursor-pointer hover:tw-no-underline hover:tw-text-white tw-flex tw-flex-row tw-items-center tw-gap-2">
                <svg width="21" height="16" viewBox="0 0 21 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clip-path="url(#clip0_4009_21095)">
                        <path d="M17.4419 1.69037C16.1284 1.08945 14.741 0.661578 13.3158 0.420898C13.1207 0.77012 12.9445 1.12878 12.7872 1.4953C11.2692 1.26721 9.72603 1.26721 8.20802 1.4953C8.05072 1.12878 7.87453 0.77012 7.67947 0.420898C6.25427 0.664724 4.86525 1.0926 3.55017 1.69351C0.938871 5.55697 0.23099 9.32447 0.584931 13.0385C2.11395 14.1679 3.82545 15.0284 5.64549 15.579C6.05449 15.0284 6.41787 14.4432 6.72934 13.8313C6.13786 13.6111 5.56684 13.3374 5.02256 13.0165C5.16571 12.9126 5.30571 12.8057 5.44099 12.7018C8.64534 14.2088 12.3546 14.2088 15.559 12.7018C15.6958 12.8135 15.8358 12.9205 15.9774 13.0165C15.4331 13.3389 14.8605 13.6111 14.2675 13.8329C14.579 14.4448 14.9408 15.0284 15.3513 15.579C17.1729 15.03 18.886 14.1711 20.415 13.0401C20.8303 8.733 19.7056 5.0001 17.4419 1.69037ZM7.17766 10.7544C6.19135 10.7544 5.3765 9.85931 5.3765 8.75816C5.3765 7.65702 6.16303 6.75407 7.17452 6.75407C8.186 6.75407 8.99456 7.65702 8.97725 8.75816C8.95995 9.85931 8.18285 10.7544 7.17766 10.7544ZM13.8223 10.7544C12.8344 10.7544 12.0227 9.85931 12.0227 8.75816C12.0227 7.65702 12.8092 6.75407 13.8223 6.75407C14.8354 6.75407 15.6376 7.65702 15.6203 8.75816C15.603 9.85931 14.8275 10.7544 13.8223 10.7544Z" fill="white"/>
                    </g>
                    <defs>
                        <clipPath id="clip0_4009_21095">
                            <rect width="20" height="15.1581" fill="white" transform="translate(0.5 0.420898)"/>
                        </clipPath>
                    </defs>
                </svg>
                <span class="tw-cursor-pointer">
                    Connect to Discord
                </span>
            </button> -->
            <!-- </a> -->
            
            <p class=" tw-text-sm tw-text-gray-500">
                Lorem ipsum odor amet, consectetuer adipiscing elit. Tincidunt nisl sed laoreet praesent nascetur nunc. Bibendum ad per arcu sodales, hac etiam eu porta egestas. See the docs
            </p>
        </div>

    {/if}

    {#each servers as server}
        <li class="tw-flex tw-flex-row tw-gap-2 tw-py-2 tw-items-center tw-justify-between ">
            <div class="tw-flex tw-flex-row tw-items-center tw-gap-2">
                <!-- <img src={`https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png`}
                alt={server.name} 
                class="tw-w-8 tw-h-8 tw-rounded-full"
                on:error={handleImageError}
                /> -->
                <span>
                    {server.name}
                </span>
            </div>
            <input 
            type="checkbox" 
            bind:checked={server.isSync}
            on:change={() => handleCheckboxChange(server)} 
            class="tw-mr-[10%]"
            />
        </li>
    {/each}

    <!-- <button on:click={handleSync} class="tw-w-full tw-p-2 tw-bg-secondary-800  tw-text-white tw-no-underline tw-rounded-md tw-text-center tw-justify-center tw-cursor-pointer hover:tw-no-underline hover:tw-text-white tw-flex tw-flex-row tw-items-center tw-gap-2 tw-sticky tw-bottom-6">
        Syncronize Server
    </button> -->

    <!-- {#if discordTokens}
        {#if servers.length < 0}
            <p class=" tw-text-sm tw-text-gray-500">
                No server found
            </p>
        {/if}


        {#if servers.length > 0}
            <ul class="tw-list-none">
                {#each servers as server}
                    <li class="tw-flex tw-flex-row tw-gap-2 tw-py-2 tw-items-center tw-justify-between ">
                        <div class="tw-flex tw-flex-row tw-items-center tw-gap-2">
                            <img src={`https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png`}
                            alt={server.name} 
                            class="tw-w-8 tw-h-8 tw-rounded-full"
                            on:error={handleImageError}
                            />
                            <span>
                                {server.name}
                            </span>
                        </div>
                        <input 
                        type="checkbox" 
                        bind:checked={server.selected}
                        on:change={() => handleCheckboxChange(server.id)} 
                        class="tw-mr-[10%]"
                        />
                    </li>
                {/each}
            </ul>
            <button on:click={handleSync} class="tw-w-full tw-p-2 tw-bg-secondary-800  tw-text-white tw-no-underline tw-rounded-md tw-text-center tw-justify-center tw-cursor-pointer hover:tw-no-underline hover:tw-text-white tw-flex tw-flex-row tw-items-center tw-gap-2 tw-sticky tw-bottom-6">
                Syncronize Server
            </button>
        {/if}
    {/if} -->

</div>

<style>
</style>