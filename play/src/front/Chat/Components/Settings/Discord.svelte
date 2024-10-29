<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import axios from "axios";
    import {get, Readable, Unsubscriber} from "svelte/store";
    import { fade } from "svelte/transition";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { RoomMetadataType } from "../../../ExternalModule/ExtensionModule";
    import { ChatRoom } from "../../Connection/ChatConnection";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import DiscordBotManager from "../../DiscordBotManager";
    import { DiscordServer} from "../../../Interfaces/DiscordServerInterface";
    import {MatrixChatConnection} from "../../Connection/Matrix/MatrixChatConnection";
    import { connectionStatus, storedQrCodeUrl } from "../../Stores/DiscordConnectionStore"



    //TODO Test DiscordBotManager Class
    //TODO add discord bot Id in a env file
    const discordBotId = "@discordbot:matrix.workadventure.localhost";

    //initialize discordBotManager
    let DiscordBot: DiscordBotManager;

    let unsubscribeBotMessage: Unsubscriber | undefined;

    $: guilds = [] as Array<DiscordServer>;
    $: qrCodeUrl = $storedQrCodeUrl;
    $: needManualToken = false;
    $: bridgeConnected = false;

    let manualDiscordToken = "";
    let loadingFetchServer = false;


    let discordbotRoom: ChatRoom | undefined;

    async function sendDiscordToken(): Promise<void> {
        if (!discordbotRoom) return;
        const response = await DiscordBot.sendMessage(`login-token user ${manualDiscordToken}`);
        const responseContent = get(response.content).body;
        if(responseContent.includes("Successfully logged in as")){
            bridgeConnected = true;
            await fetchUserGuilds();
        }

    }

    let serversToBridge: DiscordServer[] = [];
    let serversToUnBridge: DiscordServer[] = [];

    function handleCheckboxChange(server: DiscordServer) {
        server.isSync = !server.isSync;
        if (server.isSync) {
            console.log("server: ", server.name, "added !")
            serversToBridge.push(server);
        } else {
            console.log("server: ", server.name, "removed !")
            serversToUnBridge.push(server);
        }
    }

    async function bridgeServers(): Promise<void> {
        await DiscordBot.unBridgesGuilds(serversToUnBridge);
        await DiscordBot.bridgesGuilds(serversToBridge);
        await fetchUserGuilds();
    }

    async function getQrCodeUrl(): Promise<void> {

        const response = await DiscordBot.AttemptQrCode();
        if(response.includes("You're logged in as")||
            response.includes("You're already logged in") ||
            response.includes("Successfully logged in as")){
            bridgeConnected = true;
            await fetchUserGuilds();
        }
    }

    async function fetchUserGuilds(): Promise<DiscordServer[]> {
        guilds = await DiscordBot.getParsedUserGuilds();
        return guilds;
    }

    onMount( async () => {
        const chatConnection = await gameManager.getChatConnection();
        if (!(chatConnection instanceof MatrixChatConnection)) {
            throw new Error("Discord integration is only available with Matrix chat connection");
        }
        DiscordBot = new DiscordBotManager(chatConnection);
        await DiscordBot.initDiscordBotRoom();

        const bridgeConnectionStatusMessage = await DiscordBot.sendMessage("ping");
        const bridgeConnectionStatus = get(bridgeConnectionStatusMessage.content).body;

        if(bridgeConnectionStatus.includes("You're logged in as")||
            bridgeConnectionStatus.includes("You're already logged in") ||
            bridgeConnectionStatus.includes("Successfully logged in as")){
            bridgeConnected = true;
            await fetchUserGuilds() ;
        }
        else if (bridgeConnectionStatus.includes("not")) {
            bridgeConnected = false;
            console.log('bridge detected as non connected');
        }
    });
    onDestroy(() => {
        if (unsubscribeBotMessage) unsubscribeBotMessage();
    });

    function getInitials(name: string) {
        return name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();
    }
    function handleImageError(event: { target: any }) {
        const imgElement = event.target;
        const serverName = imgElement.alt;
        const initials = getInitials(serverName);
        imgElement.style.display = "none";
        const initialsElement = document.createElement("div");
        initialsElement.className = "initials";
        initialsElement.textContent = initials;
        initialsElement.classList.add(
            "tw-w-8",
            "tw-h-8",
            "tw-rounded-full",
            "tw-flex",
            "tw-justify-center",
            "tw-items-center",
            "tw-bg-gray-300",
            "tw-text-gray-700"
        );
        imgElement.parentNode.insertBefore(initialsElement, imgElement);
    }

</script>

<div class="tw-flex tw-flex-col tw-w-full tw-gap-5 tw-py-4">
    <!--{#if !bridgeConnected && qrCodeUrl === undefined && !needManualToken }-->
    {#if !bridgeConnected && qrCodeUrl.length<=0}
        <div class="tw-py-3 tw-px-3">

            <p class=" tw-text-sm tw-text-gray-500">
                You need to connect your Discord account to use this feature. To do so, please click on the button
                below. You will be redirected to Discord to login. To get all Discord servers, the bot need to be
                connected to your account. And finally, you will be able to choose which servers you want to bridge.
            </p>
            <button on:click={getQrCodeUrl}
                    class="tw-w-full tw-p-2 tw-bg-secondary-800  tw-text-white tw-no-underline tw-rounded-md tw-text-center tw-justify-center tw-cursor-pointer hover:tw-no-underline hover:tw-text-white tw-flex tw-flex-row tw-items-center"
            >
                Connect to Discord
            </button>
        </div>
    {/if}
    {#if loadingFetchServer}
        <div
            class="tw-flex tw-flex-col tw-gap-2 tw-p-6 tw-rounded-xl tw-z-50 tw-w-full tw-justify-center tw-items-center"
        >
            <div
                class="tw-loader tw-w-6 tw-h-6 tw-border-2 tw-border-t-[2px] tw-border-primary tw-rounded-full tw-animate-spin"
                style="border-top-style: solid;"
            />
            <span class="tw-ml-2 tw-text-white">Get your Discord servers... 👀</span>
        </div>
    {/if}
    {#if qrCodeUrl.length>0 && !needManualToken && !bridgeConnected}
        <div class="tw-flex tw-justify-end">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <span class=" tw-cursor-pointer" on:click={ () => (storedQrCodeUrl.set("")) } >&#10005;</span>
        </div>
        <img src={qrCodeUrl} alt="QR Code" />
        <p class="tw-text-sm tw-text-gray-300">
            Scan the QR code with your Discord app to login. QR codes are time limited, sometimes you need to regenerate one </p>
        <button
                on:click={getQrCodeUrl}
                class="tw-w-full tw-p-2 tw-bg-white/10 hover:tw-bg-white/30 tw-text-white tw-no-underline tw-rounded-md tw-text-center tw-justify-center tw-cursor-pointer hover:tw-no-underline hover:tw-text-white tw-flex tw-flex-row tw-items-center">

            🔄 Get a new QR code
        </button>
        <button
                on:click={() => needManualToken = true}
                class="tw-w-full tw-p-2 tw-bg-secondary-800 tw-text-white tw-no-underline tw-rounded-md tw-text-center tw-justify-center tw-cursor-pointer hover:tw-no-underline hover:tw-text-white tw-flex tw-flex-row tw-items-center"
        >
            Login with token
        </button>
    {/if}

    {#if needManualToken && !bridgeConnected}
        <div class="tw-flex tw-flex-col tw-items-center tw-gap-5">
            <div class="tw-w-full tw-flex tw-justify-end">
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <span class=" tw-cursor-pointer" on:click={ () => (needManualToken = false) } >&#10005;</span>
            </div>
            <div class="tw-w-full ">
                <input type="text" class="tw-w-full tw-mb-0" bind:value={manualDiscordToken} />
                <button
                    on:click={sendDiscordToken}
                    class="tw-w-full tw-p-2 tw-bg-secondary-800  tw-text-white tw-no-underline tw-rounded-md tw-text-center tw-justify-center tw-cursor-pointer hover:tw-no-underline hover:tw-text-white tw-flex tw-flex-row tw-items-center"
                >
                    Send
                </button>
            </div>
            <p>
                You need to enter our Discord token. In order to perform Discord integration see <a href="https://www.androidauthority.com/get-discord-token-3149920/">How to get my discord login token</a>
            </p>
        </div>
    {/if}
    <div>
        {#each guilds as server}
            <li class="tw-flex tw-flex-row tw-gap-4 tw-py-3 tw-rounded-md tw-items-center tw-justify-between tw-mb-2 hover:tw-bg-white/10 {server.isSync? 'tw-bg-white/10' : ''}"
            >
                <div class="tw-flex tw-flex-row tw-items-center tw-gap-2 tw-pl-2">
                    {#if server.isSync}
                        <div class="tw-h-3 tw-w-3 tw-bg-green-400 tw-rounded-full"></div>
                    {/if}
                    {#if server.icon}
                        <img
                            src={`https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png`}
                            alt={server.name}
                            class="tw-w-8 tw-h-8 tw-rounded-full"
                            on:error={handleImageError}
                        />
                    {/if}
                    <span>
                        {server.name}
                    </span>
                </div>
                <input
                        type="checkbox"
                        checked={server.isSync}
                        class="tw-mr-[5%]"
                        on:change={() => handleCheckboxChange(server)}
                />
            </li>
        {/each}
    </div>
    {#if bridgeConnected && guilds.length > 0 }
        <div class="tw-sticky tw-bottom-0 flex items-center justify-center">
            <button
                class="tw-w-full tw-p-2 tw-bg-secondary-800  tw-text-white tw-no-underline tw-rounded-md tw-text-center tw-justify-center tw-cursor-pointer hover:tw-no-underline hover:tw-text-white tw-flex tw-flex-row tw-items-center"
                on:click={bridgeServers}
            >
                Save and sync 🔌
            </button>
        </div>
    {/if}
</div>

<style>
</style>
