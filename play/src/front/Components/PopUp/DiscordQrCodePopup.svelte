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
    import LoaderIcon from "../Icons/LoaderIcon.svelte";
    import SyncIcon from "../Icons/SyncIcon.svelte";

    $: qrCodeUrl = $storedQrCodeUrl;

    const dispatch = createEventDispatcher();


    const onCancel = () => {
        dispatch("back");
    }

    const getNewQrCode = () => {
        dispatch("new-qr-code");
    }

    const loginToken = () => {
        dispatch("next");
    }

</script>

<PopUpContainer>
        <div class="flex flex-row items-start justify-start gap-2">
            <div class="w-44 h-44 flex items-center justify-center">
                {#if qrCodeUrl}
                    <img src={qrCodeUrl} alt="QR Code" class="w-44 h-44 rounded"/>
                {:else}
                    <div
                            class="flex flex-col gap-2 p-6 rounded-xl z-50 w-full justify-center items-center"
                    >
                        <div
                                class="loader w-6 h-6 border-2 border-t-[2px] border-contrast rounded-full animate-spin"
                                style="border-top-style: solid;"
                        />
                    </div>
                {/if}
            </div>
            <div class="flex flex-col items-start justify-start p-2 gap-2">
                <span class="font-bold text-lg">{$LL.externalModule.discord.qrCodeTitle()}</span>
                <p class="text-left m-0">
                    {$LL.externalModule.discord.qrCodeExplainText()}
                </p>
                <button class="btn btn-sm btn-border gap-1 !p-1" on:click={getNewQrCode}>
                    <SyncIcon width="h-5" height="h-5" />
                    {$LL.externalModule.discord.qrCodeRegenerate()}
                </button>
            </div>
        </div>

        <div slot="buttons" class="flex flex-row justify-content-center w-full gap-2">
            <button class="btn btn-outline w-full hover:bg-contrast-600/50" on:click={onCancel}>Back</button>
            <button class="btn btn-border w-full" on:click={loginToken}>Login withToken</button>
        </div>
</PopUpContainer>
