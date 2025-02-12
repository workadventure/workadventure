<script lang="ts">
    import PopUpContainer from "./PopUpContainer.svelte";
    import DiscordLogo from "../images/discord-logo.svg";
    import LL from "../../../i18n/i18n-svelte";
    import {createEventDispatcher} from "svelte";
    import {DiscordBotManager, DiscordUser} from "../../Chat/DiscordBotManager";
    import {notificationPlayingStore} from "../../Stores/NotificationStore";
    import {storedQrCodeUrl} from "../../Chat/Stores/DiscordConnectionStore";
    import {onMount} from "svelte";
    import {gameManager} from "../../Phaser/Game/GameManager";
    import {MatrixChatConnection} from "../../Chat/Connection/Matrix/MatrixChatConnection";
    import {ChatMessage} from "../../Chat/Connection/ChatConnection";
    import {get} from "svelte/store";
    import Input from "../Input/Input.svelte";
    import KeyIcon from "../Icons/KeyIcon.svelte";


    export const errorMessage:string| null = null;
    const dispatch = createEventDispatcher();



    const onSend = () => {
        dispatch("sendToken", {token: inputToken});
    }

    const onCancel = () => {
        dispatch("back");
    }

    let inputToken = "";

</script>

<PopUpContainer>
        <div class="flex flex-col p-3 w-full text-left ">
            <div class="w-full uppercase  text-lg">
                {$LL.externalModule.discord.loginToken()}
            </div>
            <p>
                {$LL.externalModule.discord.loginTokenExplainText()}
                <a href="https://www.androidauthority.com/get-discord-token-3149920/" target="_blank" class="text-white underline">
                    {$LL.externalModule.discord.howToGetTokenButton()}
                </a>
            </p>
            <div class="w-full flex flex-col items-start justify-start gap-1">
                <span class="font-bold">
                    {$LL.externalModule.discord.tokenInputLabel()}
                </span>
                <Input placeholder="Your discord Token" appendSide="left" size="lg" bind:value={inputToken}>
                    <div slot="inputAppend" class="h-6">
                        <KeyIcon />
                    </div>
                </Input>

            </div>
            {#if errorMessage}
                <div class="text-error text-sm">
                    {errorMessage}
                </div>
            {/if}
        </div>

        <div slot="buttons" class="flex flex-row justify-content-center w-full gap-2">
            <button class="btn btn-outline w-full hover:bg-contrast-600/50" on:click={onCancel}>Login with QR Code</button>
            <button class="btn btn-secondary w-full" on:click={onSend} >Send </button>
        </div>
</PopUpContainer>
