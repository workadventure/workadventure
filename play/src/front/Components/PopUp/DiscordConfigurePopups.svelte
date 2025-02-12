<script lang="ts">
    import DiscordStartPopup from "./DiscordStartPopup.svelte";
    import PopUpContainer from "./PopUpContainer.svelte";
    import DiscordLogo from "../images/discord-logo.svg";
    import LL from "../../../i18n/i18n-svelte";
    import { fly } from 'svelte/transition';
    import {DiscordBotManager, DiscordUser} from "../../Chat/DiscordBotManager";
    import {notificationPlayingStore} from "../../Stores/NotificationStore";
    import {storedQrCodeUrl} from "../../Chat/Stores/DiscordConnectionStore";
    import {onDestroy, onMount} from "svelte";
    import {gameManager} from "../../Phaser/Game/GameManager";
    import {MatrixChatConnection} from "../../Chat/Connection/Matrix/MatrixChatConnection";
    import {ChatMessage} from "../../Chat/Connection/ChatConnection";
    import {get} from "svelte/store";
    import {DiscordServer} from "../../Interfaces/DiscordServerInterface";
    import DiscordQrCodePopup from "./DiscordQrCodePopup.svelte";
    import DiscordLoginTokenPopup from "./DiscordLoginTokenPopup.svelte";


    let DiscordBot: DiscordBotManager;

    $: guilds = [] as Array<DiscordServer>;
    $: qrCodeUrl = $storedQrCodeUrl;
    $: needManualToken = false;
    $: bridgeConnected = false as boolean | null;
    $: bridgeError = null as boolean | null;
    $: discordUser = null as DiscordUser | null;

    let bridgeLoading = true;

    let manualDiscordToken = "";
    let loadingFetchServer = false;

    let currentStep: number = 0;
    let direction: number = 1;
    let qrCodeError: null | string = null;

    const nextStep = () => {
        if (currentStep < 2) {
            currentStep += 1;
            direction = 1;
        }
        if (currentStep === 1){
            getQrCodeUrl()
        }
    }

    const prevStep = () => {
        if (currentStep > 0) {
            currentStep -= 1;
            direction = -1;
        }
    }

    const handleSendToken = (e) => {
        const {token} = e.detail;
        sendDiscordToken(token);
    }

    async function getQrCodeUrl(): Promise<void> {
        const response = await DiscordBot.AttemptQrCode();
        if (
            response.includes("You're logged in as") ||
            response.includes("You're already logged in") ||
            response.includes("Successfully logged in as")
        ) {
            bridgeConnected = true;
            //await fetchUserGuilds();
        } else if (response.includes("captchat")) {
            notificationPlayingStore.playNotification("Error your account is protected by captcha", "discord-logo.svg");
            qrCodeError = "Error your account is protected by captcha please try with your token";
            currentStep = 2;
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

    async function sendDiscordToken(token: string): Promise<void> {
        const response = await DiscordBot.AttemptToken(token);
        if (response.includes("Successfully") || response.includes("Connecting")) {
            bridgeConnected = true;
            //await fetchUserGuilds();
            notificationPlayingStore.playNotification("Successfully connected to Discord", "discord-logo.svg");
        } else {
            console.log("error while sending token", response);
            notificationPlayingStore.playNotification("Error while sending token", "discord-logo.svg");
        }
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

            //await fetchUserGuilds();
        } else if (bridgeConnectionStatus.includes("not")) {
            bridgeConnected = false;
            console.log('🤑🤑🤑🤑 Bridge Loading false ')
            bridgeLoading = false;
            console.info("bridge detected as non connected");
        }
    });
    onDestroy(async () => {
        await DiscordBot.destroy();
        console.log("🗑️🗑️🗑️🗑️Discord bot destroyed");
    });

</script>

{#if !bridgeConnected && bridgeLoading }
    {#if currentStep === 0}
        <div class="w-2/3 max-w-3xl" in:fly={{ x: direction * 100, duration: 500 }} out:fly={{ x: -direction * 100, duration: 500 }}>
            <DiscordStartPopup on:next={nextStep} on:back={prevStep}/>
        </div>
    {:else if currentStep === 1}
        <div class="absolute w-9/12 max-w-3xl" in:fly={{ x: direction * 100, duration: 500 }} out:fly={{ x: -direction * 100, duration: 500 }}>
            <DiscordQrCodePopup on:back={prevStep} on:next={nextStep} on:new-qr-code={getQrCodeUrl}/>
        </div>
    {:else if currentStep === 2}
        <div class="absolute w-9/12 max-w-3xl" in:fly={{ x: direction * 100, duration: 500 }} out:fly={{ x: -direction * 100, duration: 500 }}>
            <DiscordLoginTokenPopup on:back={prevStep} on:send={handleSendToken} errorMessage="{qrCodeError}" />
        </div>
    {/if}
{/if}