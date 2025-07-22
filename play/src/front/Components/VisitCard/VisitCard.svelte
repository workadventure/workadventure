<script lang="ts">
    import { onMount } from "svelte";
    import { get } from "svelte/store";
    import { requestVisitCardsStore, selectedChatIDRemotePlayerStore } from "../../Stores/GameStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { openDirectChatRoom } from "../../Chat/Utils";

    import ButtonClose from "../Input/ButtonClose.svelte";
    import Spinner from "../Icons/Spinner.svelte";
    import { IconLoader } from "@wa-icons";

    export let visitCardUrl: string;
    export let isEmbedded = false;
    export let showSendMessageButton = true;
    export let maxHeigth = 350;
    let w = "100%";
    let h = 250;
    let hidden = true;
    let cvIframe: HTMLIFrameElement;

    const chatConnection = gameManager.chatConnection;
    const selectPlayerChatID = get(selectedChatIDRemotePlayerStore);
    const roomCreationInProgress = chatConnection.roomCreationInProgress;

    function closeCard() {
        requestVisitCardsStore.set(null);
    }

    function openChat() {
        if (!selectPlayerChatID) return;
        openDirectChatRoom(selectPlayerChatID).catch((error) => console.error(error));
        closeCard();
    }

    function handleIframeMessage(message: MessageEvent) {
        if (message.data.type === "cvIframeSize") {
            console.log("visitCard message", message.data);
            // w = message.data.data.w + "px";
            h = message.data.data.h;
        }
    }

    onMount(() => {
        cvIframe.onload = () => (hidden = false);
        cvIframe.onerror = () => (hidden = false);
    });
</script>

<section class="visitCard {isEmbedded ? 'w-full' : 'w-3/4 min-w-[320px] max-w-[900px]'}">
    <div class="{isEmbedded ? '' : 'bg-contrast/80 rounded-lg'} relative">
        {#if !isEmbedded}
            <div class="absolute top-2 {h > maxHeigth ? 'right-5' : ' right-2'}">
                <ButtonClose dataTestId="closeVisitCardButton" on:click={closeCard} />
            </div>
        {/if}
        {#if hidden}
            <div class="w-full flex justify-center items-center p-4">
                <Spinner size="lg" />
            </div>
        {/if}
        <div class={isEmbedded ? "" : "p-2"}>
            <iframe
                title="visitCard"
                src="{visitCardUrl}&embed={isEmbedded}"
                class="max-h-lg"
                allow="clipboard-read; clipboard-write {visitCardUrl}"
                style="width: {isEmbedded ? '100%' : w}; height: {Math.min(h, maxHeigth)}px"
                class:hidden
                bind:this={cvIframe}
            />
        </div>
        {#if !hidden && !isEmbedded}
            <div class="buttonContainer p-2.5 flex flex-row justify-end gap-2 bg-contrast rounded-b-lg">
                {#if selectPlayerChatID && showSendMessageButton}
                    {#if !$roomCreationInProgress}
                        <button
                            class="btn btn-secondary light cursor-pointer"
                            data-testid="sendMessagefromVisitCardButton"
                            on:click={openChat}>{$LL.menu.visitCard.sendMessage()}</button
                        >
                    {:else}
                        <button
                            class="light cursor-pointer px-3 mb-2 mr-0"
                            data-testid="sendMessagefromVisitCardButton"
                        >
                            <IconLoader class="animate-spin" />
                        </button>
                    {/if}
                {/if}
            </div>
        {/if}
    </div>
</section>

<svelte:window on:message={handleIframeMessage} />

<style lang="scss">
    .visitCard {
        pointer-events: all;
        z-index: 350;

        iframe {
            border: 0;
            overflow: hidden;

            &.hidden {
                visibility: hidden;
                position: absolute;
            }
        }

        button {
            float: right;
        }
    }
</style>
