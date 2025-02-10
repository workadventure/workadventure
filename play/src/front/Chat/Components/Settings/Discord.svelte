<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { get } from "svelte/store";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import { navChat, selectedRoomStore } from "../../Stores/ChatStore";
    import { DiscordUser, DiscordBotManager } from "../../DiscordBotManager";
    import { DiscordServer } from "../../../Interfaces/DiscordServerInterface";
    import { MatrixChatConnection } from "../../Connection/Matrix/MatrixChatConnection";
    import { storedQrCodeUrl } from "../../Stores/DiscordConnectionStore";
    import DiscordLogo from "../../../Components/images/discord-logo.svg";
    import { userIsConnected } from "../../../Stores/MenuStore";
    import LL from "../../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { ChatMessage } from "../../Connection/ChatConnection";

    //initialize discordBotManager
    let DiscordBot: DiscordBotManager;

    $: guilds = [] as Array<DiscordServer>;
    $: qrCodeUrl = $storedQrCodeUrl;
    $: needManualToken = false;
    $: bridgeConnected = null as boolean | null;
    $: bridgeError = null as boolean | null;
    $: discordUser = null as DiscordUser | null;

    let manualDiscordToken = "";
    let loadingFetchServer = false;

    async function sendDiscordToken(): Promise<void> {
        const response = await DiscordBot.AttemptToken(manualDiscordToken);
        if (response.includes("Successfully") || response.includes("Connecting")) {
            bridgeConnected = true;
            await fetchUserGuilds();
            notificationPlayingStore.playNotification("Successfully connected to Discord", "discord-logo.svg");
        } else {
            console.log("error while sending token", response);
            notificationPlayingStore.playNotification("Error while sending token", "discord-logo.svg");
        }
    }

    $: serversToBridge = [] as Array<DiscordServer>;
    $: serversToUnBridge = [] as Array<DiscordServer>;

    function handleCheckboxChange(server: DiscordServer) {
        server.isSync = !server.isSync;
        if (server.isSync) {
            serversToBridge.push(server);
            serversToUnBridge = serversToUnBridge.filter((s) => s.id !== server.id);
            serversToBridge = [...serversToBridge];
        } else {
            serversToUnBridge.push(server);
            serversToBridge = serversToBridge.filter((s) => s.id !== server.id);
            serversToUnBridge = [...serversToUnBridge];
        }
        console.log("serversToBridge", serversToBridge);
    }

    async function bridgeServers(): Promise<void> {
        await DiscordBot.unBridgesGuilds(serversToUnBridge);
        await DiscordBot.bridgesGuilds(serversToBridge);
        navChat.switchToChat();
        $selectedRoomStore = undefined;
        await fetchUserGuilds();
    }

    async function getQrCodeUrl(): Promise<void> {
        const response = await DiscordBot.AttemptQrCode();
        if (
            response.includes("You're logged in as") ||
            response.includes("You're already logged in") ||
            response.includes("Successfully logged in as")
        ) {
            bridgeConnected = true;
            await fetchUserGuilds();
        } else if (response.includes("captchat")) {
            notificationPlayingStore.playNotification("Error your account is protected by captcha", "discord-logo.svg");
            needManualToken = true;
            qrCodeUrl = "";
        } else {
            notificationPlayingStore.playNotification(
                "Error while connecting with qr code try with your token",
                "discord-logo.svg"
            );
            needManualToken = true;
            qrCodeUrl = "";
        }
    }

    async function fetchUserGuilds(): Promise<DiscordServer[]> {
        loadingFetchServer = true;
        guilds = await DiscordBot.getParsedUserGuilds();
        loadingFetchServer = false;
        return guilds;
    }

    async function handleLogout(): Promise<void> {
        await DiscordBot.sendMessage("logout");
        bridgeConnected = false;
        guilds = [];
        discordUser = null;
    }

    onMount(async () => {
        $storedQrCodeUrl = "";
        const chatConnection = await gameManager.getChatConnection();
        if (!(chatConnection instanceof MatrixChatConnection)) {
            throw new Error("Discord integration is only available with Matrix chat connection");
        }
        DiscordBot = new DiscordBotManager(chatConnection);
        await DiscordBot.initDiscordBotRoom();
        let bridgeConnectionStatusMessage: ChatMessage;
        try {
            bridgeConnectionStatusMessage = await DiscordBot.sendMessage("ping");
        } catch (e) {
            console.error("Discord bot not connected", e);
            bridgeConnected = false;
            bridgeError = true;
            return;
        }
        const bridgeConnectionStatus = get(bridgeConnectionStatusMessage.content).body;
        discordUser = await DiscordBot.getCurrentDiscordUser(bridgeConnectionStatusMessage);

        if (
            // bridgeConnectionStatus.includes("You're logged in as") ||
            // bridgeConnectionStatus.includes("You're already logged in") ||
            // bridgeConnectionStatus.includes("Successfully logged in as")
            discordUser
        ) {
            bridgeConnected = true;

            await fetchUserGuilds();
        } else if (bridgeConnectionStatus.includes("not")) {
            bridgeConnected = false;
            console.info("bridge detected as non connected");
        }
    });
    onDestroy(async () => {
        await DiscordBot.destroy();
        console.log("🗑️🗑️🗑️🗑️Discord bot destroyed");
    });

    function getInitials(name: string) {
        return name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();
    }

    function handleImageError(event: Event) {
        const imgElement: HTMLImageElement = event.target as HTMLImageElement;
        const serverName = imgElement.alt;
        const initials = getInitials(serverName);
        imgElement.style.display = "none";
        const initialsElement = document.createElement("div");
        initialsElement.className = "initials";
        initialsElement.textContent = initials;
        initialsElement.classList.add(
            "w-8",
            "h-8",
            "rounded-full",
            "flex",
            "justify-center",
            "items-center",
            "bg-gray-300",
            "text-gray-700"
        );
        imgElement.parentNode?.insertBefore(initialsElement, imgElement);
    }
</script>

{#if !$userIsConnected}
    <p class="text-gray-400 w-full text-center pt-2">
        {$LL.chat.requiresLoginForChat()}
    </p>
    <a
        type="button"
        class="btn light min-w-[220px] flex justify-center items-center my-2"
        href="/login"
        on:click={() => analyticsClient.login()}
    >
        {$LL.menu.profile.login()}
    </a>
{:else if bridgeConnected === null}
    <div class="flex items-center justify-center p-8">
        <div
            class="loader w-6 h-6 border-2 border-t-[2px] border-primary rounded-full animate-spin"
            style="border-top-style: solid;"
        />
    </div>
{:else if bridgeError}
    <div class="full bg-red-500 py-6 px-2 flex items-center justify-center rounded-lg">
        <p class="text-white mb-0">Error while starting the bridge</p>
    </div>
{:else}
    <div class="flex flex-col w-full gap-5">
        {#if !bridgeConnected && qrCodeUrl.length <= 0 && !needManualToken}
            <div class="py-3 px-3">
                <p class=" text-sm text-gray-500">
                    {$LL.externalModule.discord.explainText()}
                </p>
                <button
                    id="discordBridgeLoginBtn"
                    on:click={getQrCodeUrl}
                    class="w-full p-2 bg-secondary-800  text-white no-underline rounded-md flex flex-row items-center gap-3 justify-center cursor-pointer hover:no-underline hover:text-white"
                >
                    <img src={DiscordLogo} alt="" class="w-6 h-6" />
                    {$LL.externalModule.discord.login()}
                </button>
            </div>
        {/if}

        {#if qrCodeUrl.length > 0 && !needManualToken && !bridgeConnected}
            <div class="flex justify-end">
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <span class=" cursor-pointer" on:click={() => storedQrCodeUrl.set("")}>&#10005;</span>
            </div>
            <img src={qrCodeUrl} alt="QR Code" />
            <p class="text-sm text-gray-300">
                Scan the QR code with your Discord app to login. QR codes are time limited, sometimes you need to
                regenerate one
                {$LL.externalModule.discord.qrCodeExplainText()}
            </p>

            <button
                on:click={getQrCodeUrl}
                class="w-full p-2 bg-white/10 hover:bg-white/30 text-white no-underline rounded-md text-center justify-center cursor-pointer hover:no-underline hover:text-white flex flex-row items-center"
            >
                {$LL.externalModule.discord.qrCodeRegenerate()}
            </button>
            <button
                id="logWithToken"
                on:click={() => (needManualToken = true)}
                class="w-full p-2 bg-secondary-800 text-white no-underline rounded-md text-center justify-center cursor-pointer hover:no-underline hover:text-white flex flex-row items-center"
            >
                {$LL.externalModule.discord.loginToken()}
            </button>
        {/if}

        {#if needManualToken && !bridgeConnected}
            <div class="flex flex-col items-center gap-5">
                <div class="w-full flex justify-end">
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <span class=" cursor-pointer" on:click={() => (needManualToken = false)}>&#10005;</span>
                </div>
                <div class="w-full ">
                    <label for="discordToken" class="text-white mb-2">Discord Token</label>
                    <input type="text" class="w-full mb-0" bind:value={manualDiscordToken} id="discordToken" />
                    <button
                        id="sendToken"
                        on:click={sendDiscordToken}
                        class="w-full p-2 bg-secondary-800  text-white no-underline rounded-md text-center justify-center cursor-pointer hover:no-underline hover:text-white flex flex-row items-center"
                    >
                        {$LL.externalModule.discord.sendDiscordToken()}
                    </button>
                </div>
                <p>
                    {$LL.externalModule.discord.tokenNeeded()}
                    <a href="https://www.androidauthority.com/get-discord-token-3149920/"
                        >{$LL.externalModule.discord.howToGetTokenButton()}</a
                    >
                </p>
            </div>
        {/if}
        <div class="flex flex-col gap-2 ">
            {#if discordUser}
                <div
                    class="px-5 py-3 flex flex-row gap-2 items-center justify-between text-white border-solid border-b border-b-white/10 border-0 mb-4 relative"
                >
                    <div class="flex flex-col gap-1">
                        <p class="mb-0 text-sm text-gray-400">Connected with:</p>
                        <p class="mb-0">
                            {$LL.externalModule.discord.loggedIn} <strong>@{discordUser.username}</strong>
                        </p>
                    </div>

                    <button
                        on:click|preventDefault|stopPropagation={handleLogout}
                        class="px-2 hover:bg-white/10 border border-solid border-white rounded-lg"
                    >
                        {$LL.externalModule.discord.logout()}
                    </button>

                    <!--                    <button-->
                    <!--                        class="text-gray-400 hover:text-white tx-relative"-->
                    <!--                        data-testid="discord-settings-button"-->
                    <!--                        bind:this={buttonRef}-->
                    <!--                        on:click|preventDefault|stopPropagation={toggleDropdown}-->
                    <!--                    >-->
                    <!--                        <IconDotsCircle />-->
                    <!--                    </button>-->
                    <!--                    {#if showDropdown}-->
                    <!--                        <div-->
                    <!--                            bind:this={dropdownRef}-->
                    <!--                            class="absolute top-full right-0 mt-2 bg-contrast-900 shadow-md rounded-md py-0 z-50"-->
                    <!--                        >-->
                    <!--                            <button-->
                    <!--                                on:click|preventDefault|stopPropagation={handleLogout}-->
                    <!--                                class="px-6 hover:bg-white/10"-->
                    <!--                            >-->
                    <!--                                Logout-->
                    <!--                            </button>-->
                    <!--                        </div>-->
                    <!--                    {/if}-->
                </div>
            {/if}
            <div class="px-5">
                <div>
                    <div class="uppercase text-white text-lg font-bold mb-2">
                        {$LL.externalModule.discord.guilds()}
                    </div>
                    <p class="text-gray-400 text-sm">
                        {$LL.externalModule.discord.guildExplain()}
                    </p>
                </div>
                {#each guilds as server (server.id)}
                    <li
                        class="flex flex-row gap-2 py-2 rounded-md items-center justify-between mb-2 hover:bg-white/10 {server.isSync
                            ? 'bg-white/10'
                            : ''}"
                    >
                        <div class="flex flex-row items-center gap-2 pl-2">
                            <div class="server-icon relative" class:sync={server.isSync}>
                                {#if server.icon}
                                    <img
                                        src={server.icon}
                                        alt={server.name}
                                        class="w-8 h-8 rounded-full"
                                        on:error={handleImageError}
                                    />
                                {:else}
                                    <div
                                        class="w-8 h-8 rounded-full bg-gray-300 flex justify-center items-center text-gray-700"
                                    >
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
                            class="mr-[5%]"
                            on:change={() => handleCheckboxChange(server)}
                        />
                    </li>
                {/each}
            </div>
        </div>
        {#if bridgeConnected && guilds.length > 0}
            <div class="sticky p-3 bottom-0 flex items-center justify-center bg-contrast">
                <button
                    id="saveSync"
                    class="w-full p-2 bg-secondary-800  text-white no-underline rounded-md text-center justify-center cursor-pointer hover:no-underline hover:text-white flex flex-row gap-1.5 items-center"
                    on:click={bridgeServers}
                >
                    <span>Add</span>
                    <span class="px-2 aspect-square bg-white text-secondary-800 rounded-md"
                        >{serversToBridge.length}</span
                    >
                    <span>discord channels</span>
                </button>
            </div>
        {/if}
        {#if loadingFetchServer}
            <div
                class="flex flex-col gap-2 p-6 rounded-xl z-50 w-full justify-center items-center"
            >
                <div
                    class="loader w-6 h-6 border-2 border-t-[2px] border-contrast rounded-full animate-spin"
                    style="border-top-style: solid;"
                />
                <span class="ml-2 text-white">{$LL.externalModule.discord.fetchingServer()}</span>
            </div>
        {/if}
    </div>
{/if}
