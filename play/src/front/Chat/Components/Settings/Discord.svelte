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

    let showDropdown = false;
    let dropdownRef: HTMLDivElement | undefined = undefined;
    let buttonRef: HTMLButtonElement | undefined = undefined;

    function toggleDropdown() {
        showDropdown = !showDropdown;
    }
    function closeDropdownOnClickOutside(event: MouseEvent) {
        if (
            buttonRef &&
            !buttonRef.contains(event.target as Node) &&
            dropdownRef &&
            !dropdownRef.contains(event.target as Node)
        ) {
            showDropdown = false;
        }
    }

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
    $: serversToUnBridge= [] as Array<DiscordServer>;

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
        document.addEventListener("click", closeDropdownOnClickOutside);
    });
    onDestroy(async () => {
        await DiscordBot.destroy();
        console.log("🗑️🗑️🗑️🗑️Discord bot destroyed");
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

    function handleImageError(event: Event) {
        const imgElement: HTMLImageElement = event.target as HTMLImageElement;
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
        imgElement.parentNode?.insertBefore(initialsElement, imgElement);
    }
</script>

{#if !$userIsConnected}
    <p class="tw-text-gray-400 tw-w-full tw-text-center tw-pt-2">
        {$LL.chat.requiresLoginForChat()}
    </p>
    <a
        type="button"
        class="btn light tw-min-w-[220px] tw-flex tw-justify-center tw-items-center tw-my-2"
        href="/login"
        on:click={() => analyticsClient.login()}
    >
        {$LL.menu.profile.login()}
    </a>
{:else if bridgeConnected === null}
    <div class="tw-flex tw-items-center tw-justify-center tw-p-8">
        <div
            class="tw-loader tw-w-6 tw-h-6 tw-border-2 tw-border-t-[2px] tw-border-primary tw-rounded-full tw-animate-spin"
            style="border-top-style: solid;"
        />
    </div>
{:else if bridgeError}
    <div class="tw-full tw-bg-red-500 tw-py-6 tw-px-2 tw-flex tw-items-center tw-justify-center tw-rounded-lg">
        <p class="tw-text-white tw-mb-0">Error while starting the bridge</p>
    </div>
{:else}
    <div class="tw-flex tw-flex-col tw-w-full tw-gap-5">
        {#if !bridgeConnected && qrCodeUrl.length <= 0 && !needManualToken}
            <div class="tw-py-3 tw-px-3">
                <p class=" tw-text-sm tw-text-gray-500">
                    {$LL.externalModule.discord.explainText()}
                </p>
                <button
                    id="discordBridgeLoginBtn"
                    on:click={getQrCodeUrl}
                    class="tw-w-full tw-p-2 tw-bg-secondary-800  tw-text-white tw-no-underline tw-rounded-md tw-flex tw-flex-row tw-items-center tw-gap-3 tw-justify-center tw-cursor-pointer hover:tw-no-underline hover:tw-text-white"
                >
                    <img src={DiscordLogo} alt="" class="tw-w-6 tw-h-6" />
                    {$LL.externalModule.discord.login()}
                </button>
            </div>
        {/if}

        {#if qrCodeUrl.length > 0 && !needManualToken && !bridgeConnected}
            <div class="tw-flex tw-justify-end">
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <span class=" tw-cursor-pointer" on:click={() => storedQrCodeUrl.set("")}>&#10005;</span>
            </div>
            <img src={qrCodeUrl} alt="QR Code" />
            <p class="tw-text-sm tw-text-gray-300">
                Scan the QR code with your Discord app to login. QR codes are time limited, sometimes you need to
                regenerate one
                {$LL.externalModule.discord.qrCodeExplainText()}
            </p>

            <button
                on:click={getQrCodeUrl}
                class="tw-w-full tw-p-2 tw-bg-white/10 hover:tw-bg-white/30 tw-text-white tw-no-underline tw-rounded-md tw-text-center tw-justify-center tw-cursor-pointer hover:tw-no-underline hover:tw-text-white tw-flex tw-flex-row tw-items-center"
            >
                {$LL.externalModule.discord.qrCodeRegenerate()}
            </button>
            <button
                id="logWithToken"
                on:click={() => (needManualToken = true)}
                class="tw-w-full tw-p-2 tw-bg-secondary-800 tw-text-white tw-no-underline tw-rounded-md tw-text-center tw-justify-center tw-cursor-pointer hover:tw-no-underline hover:tw-text-white tw-flex tw-flex-row tw-items-center"
            >
                {$LL.externalModule.discord.loginToken()}
            </button>
        {/if}

        {#if needManualToken && !bridgeConnected}
            <div class="tw-flex tw-flex-col tw-items-center tw-gap-5">
                <div class="tw-w-full tw-flex tw-justify-end">
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <span class=" tw-cursor-pointer" on:click={() => (needManualToken = false)}>&#10005;</span>
                </div>
                <div class="tw-w-full ">
                    <label for="discordToken" class="tw-text-white tw-mb-2">Discord Token</label>
                    <input type="text" class="tw-w-full tw-mb-0" bind:value={manualDiscordToken} id="discordToken" />
                    <button
                        id="sendToken"
                        on:click={sendDiscordToken}
                        class="tw-w-full tw-p-2 tw-bg-secondary-800  tw-text-white tw-no-underline tw-rounded-md tw-text-center tw-justify-center tw-cursor-pointer hover:tw-no-underline hover:tw-text-white tw-flex tw-flex-row tw-items-center"
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
        <div class="tw-flex tw-flex-col tw-gap-2 ">
            {#if discordUser}
                <div
                    class="tw-px-5 tw-py-3 tw-flex tw-flex-row tw-gap-2 tw-items-center tw-justify-between tw-text-white tw-border-solid tw-border-b tw-border-b-white/10 tw-border-0 tw-mb-4 tw-relative"
                >
                    <div class="tw-flex tw-flex-col tw-gap-1">
                        <p class="tw-mb-0 tw-text-sm tw-text-gray-400">Connected with:</p>
                        <p class="tw-mb-0">
                            {$LL.externalModule.discord.loggedIn} <strong>@{discordUser.username}</strong>
                        </p>
                    </div>

                    <button
                            on:click|preventDefault|stopPropagation={handleLogout}
                            class="tw-px-2 hover:tw-bg-white/10 tw-border tw-border-solid tw-border-white tw-rounded-lg"
                    >
                        {$LL.externalModule.discord.logout()}
                    </button>

<!--                    <button-->
<!--                        class="tw-text-gray-400 hover:tw-text-white tx-relative"-->
<!--                        data-testid="discord-settings-button"-->
<!--                        bind:this={buttonRef}-->
<!--                        on:click|preventDefault|stopPropagation={toggleDropdown}-->
<!--                    >-->
<!--                        <IconDotsCircle />-->
<!--                    </button>-->
<!--                    {#if showDropdown}-->
<!--                        <div-->
<!--                            bind:this={dropdownRef}-->
<!--                            class="tw-absolute tw-top-full tw-right-0 tw-mt-2 tw-bg-contrast-900 tw-shadow-md tw-rounded-md tw-py-0 tw-z-50"-->
<!--                        >-->
<!--                            <button-->
<!--                                on:click|preventDefault|stopPropagation={handleLogout}-->
<!--                                class="tw-px-6 hover:tw-bg-white/10"-->
<!--                            >-->
<!--                                Logout-->
<!--                            </button>-->
<!--                        </div>-->
<!--                    {/if}-->
                </div>
            {/if}
            <div class="tw-px-5">
                <div>
                    <div class="tw-uppercase tw-text-white tw-text-lg tw-font-bold tw-mb-2">
                        {$LL.externalModule.discord.guilds()}
                    </div>
                    <p class="tw-text-gray-400 tw-text-sm">
                        {$LL.externalModule.discord.guildExplain()}
                    </p>
                </div>
                {#each guilds as server (server.id)}
                    <li
                        class="tw-flex tw-flex-row tw-gap-2 tw-py-2 tw-rounded-md tw-items-center tw-justify-between tw-mb-2 hover:tw-bg-white/10 {server.isSync
                            ? 'tw-bg-white/10'
                            : ''}"
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
                                    <div
                                        class="tw-w-8 tw-h-8 tw-rounded-full tw-bg-gray-300 tw-flex tw-justify-center tw-items-center tw-text-gray-700"
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
                            class="tw-mr-[5%]"
                            on:change={() => handleCheckboxChange(server)}
                        />
                    </li>
                {/each}
            </div>
        </div>
        {#if bridgeConnected && guilds.length > 0}
            <div class="tw-sticky tw-p-3 tw-bottom-0 flex items-center justify-center tw-bg-contrast">
                <button
                    id="saveSync"
                    class="tw-w-full tw-p-2 tw-bg-secondary-800  tw-text-white tw-no-underline tw-rounded-md tw-text-center tw-justify-center tw-cursor-pointer hover:tw-no-underline hover:tw-text-white tw-flex tw-flex-row tw-gap-1.5 tw-items-center"
                    on:click={bridgeServers}
                >
                    <span>Add</span>
                    <span class="tw-px-2 tw-aspect-square tw-bg-white tw-text-secondary-800 tw-rounded-md">{serversToBridge.length}</span>
                    <span>discord channels</span>
                </button>
            </div>
        {/if}
        {#if loadingFetchServer}
            <div
                class="tw-flex tw-flex-col tw-gap-2 tw-p-6 tw-rounded-xl tw-z-50 tw-w-full tw-justify-center tw-items-center"
            >
                <div
                    class="tw-loader tw-w-6 tw-h-6 tw-border-2 tw-border-t-[2px] tw-border-contrast tw-rounded-full tw-animate-spin"
                    style="border-top-style: solid;"
                />
                <span class="tw-ml-2 tw-text-white">{$LL.externalModule.discord.fetchingServer()}</span>
            </div>
        {/if}
    </div>
{/if}
