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

    const dispatch = createEventDispatcher();

    const onConnectToDiscord = () => {
        dispatch("next");
    }

    const onCancel = () => {
        dispatch("back");
    }

</script>

<PopUpContainer>
        <div class="flex flex-col items-center justify-center p-3">
            <div>
                <img src={DiscordLogo} alt="" class="w-16 h-16" />
            </div>
            <div class="text-center text-md ">
                {$LL.externalModule.discord.explainText()}
            </div>
        </div>

        <div slot="buttons" class="flex flex-row justify-content-center w-full gap-2">
            <button class="btn btn-outline w-full hover:bg-contrast-600/50" on:click={onCancel}>Cancel</button>
            <button class="btn btn-secondary w-full" on:click={onConnectToDiscord} >Connect to Discord</button>
        </div>
</PopUpContainer>
