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
    import DiscordLogo from "../../../Components/images/discord-logo.svg";
    import userLogo from "../../images/user.svg";
    import {IconDotsCircle} from "@wa-icons";

    //initialize discordBotManager
    let DiscordBot: DiscordBotManager;

    $: guilds = [] as Array<DiscordServer>;
    $: qrCodeUrl = $storedQrCodeUrl;
    $: needManualToken = false;
    $: bridgeConnected = false;
    $: discordUser = null as any;

    let manualDiscordToken = "";
    let loadingFetchServer = false;

    let showDropdown = false;
    let dropdownRef: HTMLDivElement | undefined = undefined;
    let buttonRef: HTMLButtonElement | undefined = undefined;

    function toggleDropdown() {
        showDropdown = !showDropdown;
    }
    function closeDropdownOnClickOutside(event: MouseEvent) {
        if (buttonRef && !buttonRef.contains(event.target as Node) && dropdownRef && !dropdownRef.contains(event.target as Node)) {
            showDropdown = false;
        }
    }

    async function sendDiscordToken(): Promise<void> {
        const response = await DiscordBot.AttemptToken(manualDiscordToken);
        if(response.includes("Successfully")){
            bridgeConnected = true;
            await fetchUserGuilds();
            notificationPlayingStore.playNotification("Successfully connected to Discord", "discord-logo.svg");
        }
        else{
            console.log("error while sending token", response);
            notificationPlayingStore.playNotification("Error while sending token", "discord-logo.svg");
        }
    }

    let serversToBridge: DiscordServer[] = [];
    let serversToUnBridge: DiscordServer[] = [];

    function handleCheckboxChange(server: DiscordServer) {
        server.isSync = !server.isSync;
        if (server.isSync) {
            serversToBridge.push(server);
        } else {
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

    async function handleLogout(): Promise<void> {
        await DiscordBot.sendMessage("logout");
        bridgeConnected = false;
        guilds = [];
        discordUser = null;
    }

    onMount( async () => {
        $storedQrCodeUrl = "";
        const chatConnection = await gameManager.getChatConnection();
        if (!(chatConnection instanceof MatrixChatConnection)) {
            throw new Error("Discord integration is only available with Matrix chat connection");
        }
        DiscordBot = new DiscordBotManager(chatConnection);
        await DiscordBot.initDiscordBotRoom();

        const bridgeConnectionStatusMessage = await DiscordBot.sendMessage("ping");
        const bridgeConnectionStatus = get(bridgeConnectionStatusMessage.content).body;
        discordUser = await DiscordBot.getCurrentDiscordUser();

        if(bridgeConnectionStatus.includes("You're logged in as")||
            bridgeConnectionStatus.includes("You're already logged in") ||
            bridgeConnectionStatus.includes("Successfully logged in as")){
            bridgeConnected = true;

            await fetchUserGuilds() ;
        }
        else if (bridgeConnectionStatus.includes("not")) {
            bridgeConnected = false;
            console.info('bridge detected as non connected');
        }
        document.addEventListener("click", closeDropdownOnClickOutside);

    });
    onDestroy(() => {
        DiscordBot.destroy();
        document.removeEventListener("click", closeDropdownOnClickOutside);
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
                By connecting your discord account here, you will be able to receive your messages directly in the workadventure chat.
                After synchronizing a server, we will create the rooms it contains, you will only have to join them in the Workadventure chat.
            </p>
            <button on:click={getQrCodeUrl}
                    class="tw-w-full tw-p-2 tw-bg-secondary-800  tw-text-white tw-no-underline tw-rounded-md tw-flex tw-flex-row tw-items-center tw-gap-3 tw-justify-center tw-cursor-pointer hover:tw-no-underline hover:tw-text-white"
            >
                <img src="{DiscordLogo}" alt="" class="tw-w-6 tw-h-6">
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
    <div class="tw-flex tw-flex-col tw-gap-2 ">
        {#if discordUser}
            <div class="tw-px-2 tw-py-3 tw-flex tw-flex-row tw-gap-2 tw-items-center tw-text-white tw-border-solid tw-border-b tw-border-b-white/10 tw-border-0 tw-mb-4 tw-relative">
                <img src="{userLogo}" alt="" class="tw-h-6 tw-w-6">
                <p class="tw-mb-0">
                    Logged in as <strong>@{discordUser.username}</strong>
                </p>
                <button class="tw-text-gray-400 hover:tw-text-white"
                        bind:this={buttonRef}
                        on:click|preventDefault|stopPropagation={toggleDropdown}
                >
                    <IconDotsCircle></IconDotsCircle>
                </button>
                {#if showDropdown}
                    <div bind:this={dropdownRef} class="tw-absolute tw-top-full tw-right-0 tw-mt-2 tw-bg-contrast-900 tw-shadow-md tw-rounded-md tw-py-0 tw-z-50">
                        <button on:click|preventDefault|stopPropagation={handleLogout}
                                class="tw-px-6 hover:tw-bg-white/10">Logout</button>
                    </div>
                {/if}
            </div>
        {/if}
        {#each guilds as server}
            <li class="tw-flex tw-flex-row tw-gap-2 tw-py-2 tw-rounded-md tw-items-center tw-justify-between tw-mb-2 hover:tw-bg-white/10 {server.isSync? 'tw-bg-white/10' : ''}"
            >
                <div class="tw-flex tw-flex-row tw-items-center tw-gap-2 tw-pl-2">
                <div class="server-icon tw-relative" class:sync={server.isSync}>
                    {#if server.icon}
                        <img
                            src={server.icon}
                            alt={server.name}
                            class="tw-w-8 tw-h-8 tw-rounded-full"
                            on:error={handleImageError}
                        />
                    {:else}
                        <div class="tw-w-8 tw-h-8 tw-rounded-full tw-bg-gray-300 tw-flex tw-justify-center tw-items-center tw-text-gray-700">
                            {getInitials(server.name)}
                        </div>
                    {/if}
                </div>

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
    .server-icon.sync:after{
        content: '';
        @apply tw-absolute tw-top-0 tw-right-0 tw-w-3 tw-h-3 tw-bg-green-500 tw-rounded-full;
    }
</style>
