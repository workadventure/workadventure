<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import axios from "axios";
    import { get, Unsubscriber } from "svelte/store";
    import { fade } from "svelte/transition";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { RoomMetadataType } from "../../../ExternalModule/ExtensionModule";
    import { ChatRoom } from "../../Connection/ChatConnection";

    interface DiscordServer {
        name: string;
        id: string;
        isSync: boolean;
        isBridging: boolean;
        icon?: string;
    }

    let chatConnection = gameManager.getCurrentGameScene()._chatConnection;
    let unsubscribeBotMessage: Unsubscriber | undefined;
    $: servers = [] as Array<DiscordServer>;
    $: qrCodeUrl = undefined as string | undefined;
    $: needManualToken = false;
    let manualDiscordToken = "";
    let loadingFetchServer = true;

    const clientDiscordApi = axios.create({
        baseURL: "https://discord.com/api",
        headers: {
            "Content-Type": "application/json",
        },
    });

    export let bridgeConnected = false;
    let step = "checkLogin";

    /*
    async function getUserDiscordServer(room: ChatRoom): Promise<DiscordServer[]>{
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
    }*/
    let resolveSendToken: (value: void | PromiseLike<void>) => void;

    let awaitForStep: Promise<void> = new Promise((resolve) => {
        resolveSendToken = resolve;
    });

    async function sendDiscordToken(): Promise<void> {
        resolveSendToken();
    }

    let discordbotRoom: ChatRoom | undefined;

    function handleCheckboxChange(server: DiscordServer) {
        if (server.isSync) {
            server.isBridging = true;
            if (discordbotRoom) discordbotRoom.sendMessage(`guilds bridge ${server.id} --entire`);

            // TODO: Await the response from the bot to confirm the server is bridged and past is Bridging to false
            // TODO: add loador when  isBridging equal to true
        } else {
            server.isBridging = true;
            if (discordbotRoom) discordbotRoom.sendMessage(`guilds unbridge ${server.id}`);

            // TODO: Await the response from the bot to confirm the server is bridged and past is Bridging to false
            // TODO: add loador when  isBridging equal to true
        }
    }

    onMount(async () => {
        // TODO add discord bot Id in a env file
        const discordBotId = "@discordbot:matrix.workadventure.localhost";
        discordbotRoom = await chatConnection?.createDirectRoom(discordBotId);

        if (!discordbotRoom) return;

        unsubscribeBotMessage = discordbotRoom.messages.subscribe(async (messages) => {
            console.log("unsubscribeBotMessage => discordbotRoom.messages", messages);
            if (!discordbotRoom) return;

            loadingFetchServer = true;
            const lastMessage = messages[messages.length - 1];

            if (`${lastMessage.sender?.id}` !== discordBotId) return;

            console.log("step: ", step);
            console.log("message reçu !", get(lastMessage.content));
            switch (step) {
                case "checkLogin":
                    if (
                        get(lastMessage.content).body.includes("You're logged in as") ||
                        get(lastMessage.content).body.includes("You're already logged in") ||
                        get(lastMessage.content).body.includes("Successfully logged in as") ||
                        get(lastMessage.content).body.includes("Connecting to Discord as user")
                    ) {
                        bridgeConnected = true;
                        step = "getServers";
                        discordbotRoom.sendMessage("guild status");
                    } else {
                        console.log("Discord bot isn't connected");
                        bridgeConnected = false;
                        step = "getQrCode";
                        discordbotRoom.sendMessage("login-qr");
                        // connectToBridge();
                    }
                    break;
                case "getServers":
                    const guilds = await getAllGuilds();

                    needManualToken = false;
                    qrCodeUrl = undefined;
                    const messageServers = get(lastMessage.content).body;

                    const regex = /^\* (.*) \(`(\d+)`\) - (.*)$/gm;

                    const matches = messageServers.matchAll(regex);

                    servers = Array.from(matches).map((match) => {
                        const guild = guilds.find((guild: { id: string }) => guild.id === match[2]);
                        return {
                            name: match[1],
                            id: match[2],
                            isSync: match[3].includes("never") ? false : true,
                            isBridging: false,
                            ...guild,
                        };
                    });
                    console.log("servers", servers);
                    if (unsubscribeBotMessage) unsubscribeBotMessage();
                    loadingFetchServer = false;
                    break;
                case "getQrCode":
                    qrCodeUrl = get(lastMessage.content).url;
                    step = "waitLoginResponse";
                    break;

                case "waitLoginResponse":
                    if (get(lastMessage.content).body.includes("Successfully logged in as")) {
                        step = "getServers";
                        discordbotRoom.sendMessage("guild status");
                    } else if (get(lastMessage.content).body.includes("CAPTCHAs")) {
                        needManualToken = true;
                        (async () => {
                            await awaitForStep;
                            discordbotRoom.sendMessage(`login-token user ${manualDiscordToken}`);
                        })().catch((error) => {
                            console.error("Error sending message to Discord bot:", error);
                        });
                        step = "checkLogin";
                        qrCodeUrl = undefined;
                    } else {
                        step = "getQrCode";
                        discordbotRoom.sendMessage("login-qr");
                    }
                    break;
            }
        });

        discordbotRoom.sendMessage("ping");
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

    async function getAllGuilds(): Promise<DiscordServer[]> {
        const parsedRoomMetadata = RoomMetadataType.safeParse(gameManager.getCurrentGameScene().room.metadata);
        if (!parsedRoomMetadata.success) {
            console.error(
                "Unable to initialize Discord due to room metadata parsing error : ",
                parsedRoomMetadata.error
            );
            parsedRoomMetadata.error.errors.forEach((err) => {
                console.error(`Path: ${err.path.join(".")}, Message: ${err.message}`);
            });
        }

        const discordAuthToken = parsedRoomMetadata.data?.player?.accessTokens?.find(
            (token) => token.provider.toLocaleLowerCase() === "discord"
        );
        if (!discordAuthToken) {
            throw new Error("Discord token not found");
        }

        const guildsResponse = await clientDiscordApi.get("/users/@me/guilds", {
            headers: {
                Authorization: `Bearer ${discordAuthToken.token}`,
            },
        });
        return guildsResponse.data;
    }
</script>

<div class="tw-flex tw-flex-col tw-w-full tw-gap-2">
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

    {#if qrCodeUrl || needManualToken}
        <div
            class="tw-flex tw-flex-col tw-gap-2 tw-p-6 tw-rounded-xl tw-fixed tw-top-1/2 tw-left-1/2 -tw-translate-x-1/2 -tw-translate-y-1/2 tw-backdrop-blur-lg tw-z-50 "
            transition:fade={{ delay: 250, duration: 300 }}
        >
            {#if qrCodeUrl && !needManualToken}
                <div class="tw-flex tw-justify-end">
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <span class=" tw-cursor-pointer" on:click={() => (qrCodeUrl = undefined)}>&#10005;</span>
                </div>
                <img src={qrCodeUrl} alt="QR Code" />
                <p class="tw-text-sm tw-text-gray-300">Scan the QR code with your Discord app to login</p>
            {/if}

            {#if needManualToken}
                <div class="tw-flex tw-flex-col tw-items-center">
                    <input type="text" bind:value={manualDiscordToken} />
                    <button
                        on:click={sendDiscordToken}
                        class="tw-w-full tw-p-2 tw-bg-secondary-800  tw-text-white tw-no-underline tw-rounded-md tw-text-center tw-justify-center tw-cursor-pointer hover:tw-no-underline hover:tw-text-white tw-flex tw-flex-row tw-items-center"
                    >
                        Send
                    </button>
                </div>
            {/if}
        </div>
    {/if}

    <!-- <a  href={redirectUri} -->
    {#if !bridgeConnected}
        <div class="tw-py-8 tw-px-3">
            <p class=" tw-text-sm tw-text-gray-500">
                You need to connect your Discord account to use this feature. To do so, please click on the button
                below. You will be redirected to Discord to login. To get all Discord servers, the bot need to be
                connected to your account. And finally, you will be able to choose which servers you want to bridge.
            </p>
        </div>
    {/if}

    {#each servers as server}
        <li class="tw-flex tw-flex-row tw-gap-2 tw-py-2 tw-items-center tw-justify-between ">
            <div class="tw-flex tw-flex-row tw-items-center tw-gap-2">
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
            <input type="checkbox" bind:checked={server.isSync} class="tw-mr-[10%]" />
        </li>
    {/each}

    {#if bridgeConnected && servers.length > 0}
        <button
            class="tw-w-full tw-p-2 tw-bg-secondary-800  tw-text-white tw-no-underline tw-rounded-md tw-text-center tw-justify-center tw-cursor-pointer hover:tw-no-underline hover:tw-text-white tw-flex tw-flex-row tw-items-center"
            on:click={() => servers.forEach((server) => handleCheckboxChange(server))}
        >
            Save and sync 🔌
        </button>
    {/if}
</div>

<style>
</style>
